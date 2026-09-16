import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

let r2Client: S3Client | null = null

function env(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function getR2Endpoint(): string {
  const configured = env('R2_ACCOUNT_ID').replace(/\/+$/, '')

  // Preferred format is the bare Cloudflare account ID. For resilience, also
  // accept the full S3 endpoint if it was pasted into R2_ACCOUNT_ID in Vercel.
  if (/^https?:\/\//i.test(configured)) {
    let parsed: URL
    try {
      parsed = new URL(configured)
    } catch {
      throw new Error('R2_ACCOUNT_ID contains an invalid URL')
    }

    if (!parsed.hostname.endsWith('.r2.cloudflarestorage.com')) {
      throw new Error(
        'R2_ACCOUNT_ID must be your Cloudflare account ID or its S3 endpoint (https://<ACCOUNT_ID>.r2.cloudflarestorage.com)'
      )
    }

    return parsed.origin
  }

  // Also tolerate an endpoint hostname pasted without https://.
  if (configured.endsWith('.r2.cloudflarestorage.com')) {
    return `https://${configured}`
  }

  if (configured.includes('/') || configured.includes(':') || configured.includes('.')) {
    throw new Error(
      'R2_ACCOUNT_ID must be the bare Cloudflare account ID, not the bucket name or public R2 URL'
    )
  }

  return `https://${configured}.r2.cloudflarestorage.com`
}

export function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: getR2Endpoint(),
      forcePathStyle: true,
      credentials: {
        accessKeyId: env('R2_ACCESS_KEY_ID'),
        secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
      },
    })
  }
  return r2Client
}

export function getR2Bucket(): string {
  return env('R2_BUCKET_NAME')
}

export function getR2PublicBaseUrl(): string {
  return env('R2_PUBLIC_URL').replace(/\/+$/, '')
}

export function publicObjectUrl(key: string): string {
  const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/')
  return `${getR2PublicBaseUrl()}/${encodedKey}`
}

export function objectKeyFromPublicUrl(url: string): string | null {
  try {
    const base = `${getR2PublicBaseUrl()}/`
    if (!url.startsWith(base)) return null
    return url.slice(base.length).split('/').map(segment => decodeURIComponent(segment)).join('/')
  } catch {
    return null
  }
}

export async function putR2Object(input: {
  key: string
  body: Uint8Array | Buffer
  contentType: string
  cacheControl?: string
}): Promise<string> {
  await getR2Client().send(new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
    CacheControl: input.cacheControl ?? 'public, max-age=31536000, immutable',
  }))
  return publicObjectUrl(input.key)
}

export async function deleteR2Object(key: string): Promise<void> {
  await getR2Client().send(new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key }))
}
