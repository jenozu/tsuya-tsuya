import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

let r2Client: S3Client | null = null

function env(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

export function getR2Client(): S3Client {
  if (!r2Client) {
    const accountId = env('R2_ACCOUNT_ID')
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
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
