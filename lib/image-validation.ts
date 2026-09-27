import sharp from 'sharp'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_IMAGE_PIXELS = 25_000_000
const MAX_IMAGE_DIMENSION = 8_192

export class InvalidImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidImageError'
  }
}

export interface InspectedImage {
  extension: 'jpg' | 'png' | 'webp'
  width: number
  height: number
}

function matchesMagic(body: Buffer, declaredType: string): boolean {
  if (declaredType === 'image/jpeg') {
    return body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff
  }
  if (declaredType === 'image/png') {
    return body.length >= 8 &&
      body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  }
  if (declaredType === 'image/webp') {
    return body.length >= 12 &&
      body.toString('ascii', 0, 4) === 'RIFF' &&
      body.toString('ascii', 8, 12) === 'WEBP'
  }
  return false
}

/**
 * Match the actual bytes and decoder format to the declared MIME type,
 * then constrain decoded dimensions before storing the original.
 * Metadata validation is not image sanitization or upload rate limiting.
 */
export async function inspectImageUpload(body: Buffer, declaredType: string): Promise<InspectedImage> {
  if (body.length === 0 || body.length > MAX_IMAGE_BYTES) {
    throw new InvalidImageError('Image must be between 1 byte and 10 MB')
  }
  if (!matchesMagic(body, declaredType)) {
    throw new InvalidImageError('Image contents do not match a supported JPG, PNG, or WebP file')
  }

  let info: sharp.Metadata
  try {
    info = await sharp(body, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: 'error',
      animated: false,
    }).metadata()
  } catch {
    throw new InvalidImageError('Could not decode image metadata')
  }

  const expected: Record<string, { format: string; extension: InspectedImage['extension'] }> = {
    'image/jpeg': { format: 'jpeg', extension: 'jpg' },
    'image/png': { format: 'png', extension: 'png' },
    'image/webp': { format: 'webp', extension: 'webp' },
  }
  const kind = expected[declaredType]
  if (!kind || info.format !== kind.format) {
    throw new InvalidImageError('Image format differs from its declared type')
  }
  const width = info.width ?? 0
  const height = info.height ?? 0
  if (width < 1 || height < 1 || width > MAX_IMAGE_DIMENSION ||
      height > MAX_IMAGE_DIMENSION || width * height > MAX_IMAGE_PIXELS ||
      (info.pages ?? 1) !== 1) {
    throw new InvalidImageError('Image dimensions or page count are not supported')
  }
  return { extension: kind.extension, width, height }
}
