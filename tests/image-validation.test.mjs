import assert from 'node:assert/strict'
import { test } from 'node:test'
import sharp from 'sharp'
import { inspectImageUpload, InvalidImageError } from '../lib/image-validation.ts'

test('recognizes genuine JPG, PNG, and WebP bytes and dimensions', async () => {
  const source = sharp({ create: { width: 3, height: 4, channels: 3, background: 'white' } })
  for (const [format, mime, extension] of [
    ['jpeg', 'image/jpeg', 'jpg'],
    ['png', 'image/png', 'png'],
    ['webp', 'image/webp', 'webp'],
  ]) {
    const bytes = await source.clone().toFormat(format).toBuffer()
    assert.deepEqual(await inspectImageUpload(bytes, mime), { width: 3, height: 4, extension })
  }
})

test('rejects MIME spoofing and malicious or truncated input before R2', async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'white' } }).png().toBuffer()
  await assert.rejects(inspectImageUpload(png, 'image/jpeg'), InvalidImageError)
  await assert.rejects(inspectImageUpload(Buffer.from('<svg onload=alert(1)>'), 'image/png'), InvalidImageError)
  await assert.rejects(inspectImageUpload(Buffer.from('89504e470d0a1a0a', 'hex'), 'image/png'), InvalidImageError)
  await assert.rejects(inspectImageUpload(Buffer.alloc(0), 'image/png'), InvalidImageError)
  await assert.rejects(inspectImageUpload(png, 'image/svg+xml'), InvalidImageError)
})

test('rejects images over the 25 megapixel pixel limit', async () => {
  // A simple solid-color image compresses well but decodes to >25 MP.
  const large = await sharp({ create: { width: 5_001, height: 5_001, channels: 3, background: 'white' } })
    .png().toBuffer()
  await assert.rejects(inspectImageUpload(large, 'image/png'), InvalidImageError)
})
