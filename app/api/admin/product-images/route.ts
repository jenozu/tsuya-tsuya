import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { hasAdminSession } from '@/lib/admin-session'
import { deleteR2Object, objectKeyFromPublicUrl, putR2Object } from '@/lib/r2'

export const runtime = 'nodejs'

const MAX_INPUT_SIZE = 15 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(request: NextRequest) {
  if (!(await hasAdminSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, and WebP images are supported' }, { status: 400 })
    if (file.size <= 0 || file.size > MAX_INPUT_SIZE) return NextResponse.json({ error: 'Image must be between 1 byte and 15 MB' }, { status: 413 })

    const input = Buffer.from(await file.arrayBuffer())
    const optimized = await sharp(input)
      .rotate()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84, effort: 4 })
      .toBuffer()

    const day = new Date().toISOString().slice(0, 10)
    const key = `products/${day}/${crypto.randomUUID()}.webp`
    const url = await putR2Object({ key, body: optimized, contentType: 'image/webp' })

    return NextResponse.json({ url, key, bytes: optimized.byteLength })
  } catch (error) {
    console.error('R2 product image upload error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Image upload failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await hasAdminSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({})) as { url?: string; key?: string }
    const key = body.key || (body.url ? objectKeyFromPublicUrl(body.url) : null)
    if (!key || !key.startsWith('products/')) return NextResponse.json({ error: 'Invalid R2 product image key' }, { status: 400 })
    await deleteR2Object(key)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('R2 product image delete error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Image deletion failed' }, { status: 500 })
  }
}
