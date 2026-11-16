// Task 6 (TSU-M8-004): upload rate limit (shared throttle store, "upload:" bucket) and object-key ownership.
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { isOwnedUploadKey } from '../lib/image-validation.ts'
import { ADMIN_UPLOAD_MAX_PER_WINDOW, ADMIN_UPLOAD_WINDOW_SECONDS, adminUploadBucket, adminLoginBucket, consumeAdminUploadAttempt } from '../lib/admin-throttle.ts'

const old = process.env.ADMIN_SESSION_SECRET
before(() => { process.env.ADMIN_SESSION_SECRET = 'task-06-isolated-upload-key-not-production' })
after(() => { if (old === undefined) delete process.env.ADMIN_SESSION_SECRET; else process.env.ADMIN_SESSION_SECRET = old })

function memoryStore() {
  const rows = new Map()
  return { async hit(b, now, w) {
    const r = rows.get(b)
    if (!r || r.windowStartedAt + w <= now) rows.set(b, { count: 1, windowStartedAt: now }); else r.count++
    return { ...rows.get(b) } }, async reset(b) { rows.delete(b) } }
}

test('upload limit blocks after the max, reopens after the window, bucket is distinct from login', async () => {
  const store = memoryStore()
  const req = new Request('http://x', { headers: { 'x-forwarded-for': '203.0.113.9' } })
  const bucket = await adminUploadBucket(req)
  assert.match(bucket, /^[0-9a-f]{64}$/)
  assert.notEqual(bucket, await adminLoginBucket(req))
  for (let i = 0; i < ADMIN_UPLOAD_MAX_PER_WINDOW; i++) assert.equal((await consumeAdminUploadAttempt(bucket, store, 1000)).allowed, true)
  const blocked = await consumeAdminUploadAttempt(bucket, store, 1010)
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.retryAfterSeconds, ADMIN_UPLOAD_WINDOW_SECONDS - 10)
  assert.equal((await consumeAdminUploadAttempt(bucket, store, 1000 + ADMIN_UPLOAD_WINDOW_SECONDS)).allowed, true)
})

test('only server-generated product keys are owned', () => {
  assert.equal(isOwnedUploadKey('products/2026-09-28/11111111-1111-4111-8111-111111111111.png'), true)
  for (const k of ['products/2026-09-28/example.png', 'products/../x.png', 'private/a', '', null, 'products/2026-09-28/11111111-1111-4111-8111-111111111111.svg'])
    assert.equal(isOwnedUploadKey(k), false)
})
