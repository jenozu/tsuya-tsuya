import { reportServerError } from '@/lib/safe-server-log'
import { isSameOriginMutation } from '@/lib/same-origin'
import { NextRequest, NextResponse } from 'next/server'
import { hasAdminSession } from '@/lib/admin-session'
import { inspectImageUpload, InvalidImageError } from '@/lib/image-validation'
import { deleteR2Object, objectKeyFromPublicUrl, putR2Object } from '@/lib/r2'

export const runtime = 'nodejs'

const MAX_INPUT_SIZE = 10 * 1024 * 1024
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  if (!(await hasAdminSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    if (file.size <= 0 || file.size > MAX_INPUT_SIZE) {
      return NextResponse.json({ error: 'Image must be between 1 byte and 10 MB' }, { status: 413 })
    }

    // Upload the original validated image bytes directly to R2. Keeping this route
    // free of native image-processing modules makes it reliable in Vercel's runtime.
    const body = Buffer.from(await file.arrayBuffer())
    const { extension } = await inspectImageUpload(body, file.type)
    const day = new Date().toISOString().slice(0, 10)
    const key = `products/${day}/${crypto.randomUUID()}.${extension}`
    const url = await putR2Object({ key, body, contentType: file.type })

    return NextResponse.json({ url, key, bytes: body.byteLength })
  } catch (error) {
    if (error instanceof InvalidImageError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    reportServerError('api.admin_product_images.failure')
    return NextResponse.json({ error: 'Image upload failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  if (!(await hasAdminSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({})) as { url?: string; key?: string }
    const key = body.key || (body.url ? objectKeyFromPublicUrl(body.url) : null)

    if (!key || !key.startsWith('products/')) {
      return NextResponse.json({ error: 'Invalid R2 product image key' }, { status: 400 })
    }

    await deleteR2Object(key)
    return NextResponse.json({ success: true })
  } catch {
    reportServerError('api.admin_product_images.failure')
    return NextResponse.json({ error: 'Image deletion failed' }, { status: 500 })
  }
}
