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
    const body = await request.json().catch(() => null) as {
      fileName?: string
      fileType?: string
      fileSize?: number
    } | null

    const fileType = body?.fileType
    const fileSize = body?.fileSize

    if (!fileType || !ALLOWED_TYPES.has(fileType)) {
      return NextResponse.json({ error: 'Only JPG, PNG, and WebP images are supported' }, { status: 400 })
    }
    if (!Number.isFinite(fileSize) || !fileSize || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Image must be between 1 byte and 10 MB' }, { status: 400 })
    }

    const { client: supabase, usingServiceRole } = getSupabaseStorageAdmin()
    const extension = fileType === 'image/jpeg' ? 'jpg' : fileType === 'image/png' ? 'png' : 'webp'
    const storagePath = `products/${crypto.randomUUID()}.${extension}`

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

      const { data: signedUpload, error: signedUploadError } = await supabase.storage
        .from(BUCKET)
        .createSignedUploadUrl(storagePath)

      if (signedUploadError || !signedUpload?.token) {
        throw signedUploadError || new Error('Could not create a signed upload URL')
      }

      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
      return NextResponse.json({
        mode: 'signed',
        path: storagePath,
        token: signedUpload.token,
        url: publicData.publicUrl,
      })
    }

    // Backwards-compatible path for installations that already grant anonymous
    // INSERT access to the public product-images bucket. No file bytes pass through
    // Vercel, so large images are not constrained by function request-body limits.
    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    return NextResponse.json({
      mode: 'anon',
      path: storagePath,
      url: publicData.publicUrl,
    })
  } catch (error) {
    console.error('Admin image upload setup error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image upload setup failed' },
      { status: 500 },
    )
  }
}
