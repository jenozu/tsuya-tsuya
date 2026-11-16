// Task 5 (TSU-M7-004): persistent admin login throttling. Written first (5.1); lib/admin-throttle.ts lands in 5.2.
// The store is injected, so these run without a database. The in-memory store mirrors the intended SQL: one
// atomic upsert per attempt (fixed window, keyed by an HMAC'd client bucket), so this proves the logic, not
// PostgreSQL row locking (that belongs to npm run test:disposable-db).
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { after, before, test } from 'node:test'

const load = () => import('../lib/admin-throttle.ts')

const previousSecret = process.env.ADMIN_SESSION_SECRET
before(() => { process.env.ADMIN_SESSION_SECRET = 'task-05-isolated-throttle-key-not-a-production-secret' })
after(() => {
  if (previousSecret === undefined) delete process.env.ADMIN_SESSION_SECRET
  else process.env.ADMIN_SESSION_SECRET = previousSecret
})

// Mirrors: INSERT ... ON CONFLICT (bucket) DO UPDATE SET attempts = CASE WHEN window expired THEN 1 ELSE attempts + 1 END
function memoryThrottleStore() {
  const rows = new Map()
  return {
    rows,
    async hit(bucket, now, windowSeconds) {
      const row = rows.get(bucket)
      if (!row || row.windowStartedAt + windowSeconds <= now) {
        rows.set(bucket, { count: 1, windowStartedAt: now })
      } else {
        row.count += 1
      }
      return { ...rows.get(bucket) }
    },
    async reset(bucket) { rows.delete(bucket) },
  }
}

const BUCKET_A = 'a'.repeat(64)
const BUCKET_B = 'b'.repeat(64)
const T0 = 1_900_000_000

function loginRequest(headers = {}) {
  return new Request('https://tsuyanouchi.com/api/admin/auth', { method: 'POST', headers })
}

test('admin_login_attempts migration is additive, keyed by an opaque 64-hex bucket, no raw IP column', async () => {
  const { statements } = JSON.parse(await readFile(
    new URL('../migrations/forward/005_admin_auth_hardening.json', import.meta.url), 'utf8'))
  const table = statements.find(s => s.startsWith('CREATE TABLE IF NOT EXISTS public.admin_login_attempts'))
  assert.ok(table)
  assert.doesNotMatch(table, /;|\b(?:DROP|TRUNCATE|UPDATE|ALTER|DELETE)\b/i)
  assert.match(table, /bucket TEXT PRIMARY KEY CHECK \(bucket ~ '\^\[0-9a-f\]\{64\}\$'\)/)
  assert.match(table, /attempts INTEGER NOT NULL DEFAULT 0 CHECK \(attempts >= 0\)/)
  assert.match(table, /window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/)
  assert.doesNotMatch(table, /\bip\b|address|email/i)
})

test('limits are exported and sane', async () => {
  const { ADMIN_LOGIN_MAX_ATTEMPTS, ADMIN_LOGIN_WINDOW_SECONDS } = await load()
  assert.ok(Number.isInteger(ADMIN_LOGIN_MAX_ATTEMPTS) && ADMIN_LOGIN_MAX_ATTEMPTS >= 3 && ADMIN_LOGIN_MAX_ATTEMPTS <= 10)
  assert.ok(Number.isInteger(ADMIN_LOGIN_WINDOW_SECONDS) && ADMIN_LOGIN_WINDOW_SECONDS >= 300
    && ADMIN_LOGIN_WINDOW_SECONDS <= 3600)
})

test('allows the max attempts per window, then blocks with a bounded Retry-After', async () => {
  const { ADMIN_LOGIN_MAX_ATTEMPTS: max, ADMIN_LOGIN_WINDOW_SECONDS: win, consumeAdminLoginAttempt } = await load()
  const store = memoryThrottleStore()
  for (let i = 0; i < max; i += 1) {
    assert.equal((await consumeAdminLoginAttempt(BUCKET_A, store, T0 + i)).allowed, true, 'attempt ' + (i + 1))
  }
  const blocked = await consumeAdminLoginAttempt(BUCKET_A, store, T0 + max)
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.retryAfterSeconds > 0 && blocked.retryAfterSeconds <= win, String(blocked.retryAfterSeconds))
  assert.equal((await consumeAdminLoginAttempt(BUCKET_A, store, T0 + win - 1)).allowed, false, 'still inside window')
  assert.equal((await consumeAdminLoginAttempt(BUCKET_A, store, T0 + win)).allowed, true, 'window elapsed')
})

test('a successful login clears the bucket', async () => {
  const { ADMIN_LOGIN_MAX_ATTEMPTS: max, consumeAdminLoginAttempt, clearAdminLoginAttempts } = await load()
  const store = memoryThrottleStore()
  for (let i = 0; i < max - 1; i += 1) await consumeAdminLoginAttempt(BUCKET_A, store, T0)
  await clearAdminLoginAttempts(BUCKET_A, store)
  for (let i = 0; i < max; i += 1) {
    assert.equal((await consumeAdminLoginAttempt(BUCKET_A, store, T0)).allowed, true)
  }
})

test('one blocked client does not lock out another', async () => {
  const { ADMIN_LOGIN_MAX_ATTEMPTS: max, consumeAdminLoginAttempt } = await load()
  const store = memoryThrottleStore()
  for (let i = 0; i <= max; i += 1) await consumeAdminLoginAttempt(BUCKET_A, store, T0)
  assert.equal((await consumeAdminLoginAttempt(BUCKET_A, store, T0)).allowed, false)
  assert.equal((await consumeAdminLoginAttempt(BUCKET_B, store, T0)).allowed, true)
})

test('attempts are counted atomically before the password check, so parallel guesses cannot exceed the limit',
  async () => {
    const { ADMIN_LOGIN_MAX_ATTEMPTS: max, consumeAdminLoginAttempt } = await load()
    const store = memoryThrottleStore()
    const results = await Promise.all(
      Array.from({ length: max * 3 }, () => consumeAdminLoginAttempt(BUCKET_A, store, T0)))
    assert.equal(results.filter(r => r.allowed).length, max)
  })

test('store failures propagate so the login route fails closed', async () => {
  const { consumeAdminLoginAttempt } = await load()
  const broken = { async hit() { throw new Error('synthetic store failure') }, async reset() {} }
  await assert.rejects(consumeAdminLoginAttempt(BUCKET_A, broken, T0), /synthetic store failure/)
})

test('client bucket is a keyed hash of the first forwarded IP and never the raw or plain-hashed IP',
  async () => {
    const { adminLoginBucket } = await load()
    const ip = '203.0.113.7'
    const a = await adminLoginBucket(loginRequest({ 'x-forwarded-for': ip }))
    assert.match(a, /^[0-9a-f]{64}$/)
    assert.equal(await adminLoginBucket(loginRequest({ 'x-forwarded-for': ip + ', 10.0.0.1' })), a)
    assert.notEqual(await adminLoginBucket(loginRequest({ 'x-forwarded-for': '198.51.100.9' })), a)
    assert.ok(!a.includes(ip))
    assert.notEqual(a, createHash('sha256').update(ip).digest('hex'))
    assert.match(await adminLoginBucket(loginRequest()), /^[0-9a-f]{64}$/, 'missing header still gets a bucket')
  })
