import { NextRequest, NextResponse } from 'next/server'
import { hasAdminSession } from '@/lib/admin-session'
import { getSupabaseStorageAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const BUCKET = 'product-images'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(request: NextRequest) {
  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, and WebP images are supported' }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Image must be between 1 byte and 10 MB' }, { status: 400 })
    }

    const { client: supabase, usingServiceRole } = getSupabaseStorageAdmin()

    if (usingServiceRole) {
      const { data: bucket } = await supabase.storage.getBucket(BUCKET)
      if (!bucket) {
        const { error: createError } = await supabase.storage.createBucket(BUCKET, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
          allowedMimeTypes: Array.from(ALLOWED_TYPES),
        })
        if (createError && !createError.message.toLowerCase().includes('already exists')) {
          throw createError
        }
      } else if (!bucket.public) {
        const { error: updateError } = await supabase.storage.updateBucket(BUCKET, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
          allowedMimeTypes: Array.from(ALLOWED_TYPES),
        })
        if (updateError) throw updateError
      }
    }

    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
    const storagePath = `products/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    })

    if (uploadError) {
      const hint = usingServiceRole
        ? ''
        : ' Add SUPABASE_SERVICE_ROLE_KEY to Vercel if the bucket does not allow anonymous uploads.'
      throw new Error(`${uploadError.message}.${hint}`)
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    if (!data.publicUrl) throw new Error('Supabase did not return a public image URL')

    return NextResponse.json({ url: data.publicUrl })
  } catch (error) {
    console.error('Admin image upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image upload failed' },
      { status: 500 },
    )
  }
}
