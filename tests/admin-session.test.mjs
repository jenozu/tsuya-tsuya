import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { before, after, test } from 'node:test'
import * as adminSession from '../lib/admin-session.ts'
import {
  ADMIN_SESSION_MAX_AGE, createAdminSessionToken, hasAdminSession,
} from '../lib/admin-session.ts'

const previous = {
  secret: process.env.ADMIN_SESSION_SECRET,
  password: process.env.ADMIN_PASSWORD,
}
const testSecret = 'task-05-isolated-session-signing-key-not-a-production-secret'
before(() => {
  process.env.ADMIN_SESSION_SECRET = testSecret
  process.env.ADMIN_PASSWORD = 'independent-test-admin-password'
})
after(() => {
  for (const [key, value] of [
    ['ADMIN_SESSION_SECRET', previous.secret],
    ['ADMIN_PASSWORD', previous.password],
  ]) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

function withToken(token, cookieName = 'admin_session') {
  return new Request('https://example.test/api/products', {
    headers: { cookie: cookieName + '=' + encodeURIComponent(token) },
  })
}

test('admin session is HMAC signed and an unsigned or missing cookie cannot authenticate', async () => {
  const token = await createAdminSessionToken()
  assert.match(token, /^v1\.\d+\.[0-9a-f]{64}$/)
  assert.equal(await hasAdminSession(withToken(token)), true)
  assert.equal(await hasAdminSession(new Request('https://example.test/api/products')), false)
  assert.equal(await hasAdminSession(withToken('granted')), false)
  assert.equal(await hasAdminSession(withToken(token, 'preview_access')), false)
})

test('rejects tampered signing payloads, bad formatting and corrupted percent encoding', async () => {
  const token = await createAdminSessionToken()
  const [version, expiry, signature] = token.split('.')
  for (const forged of [
    version + '.' + expiry + '.' + (signature[0] === 'a' ? 'b' : 'a') + signature.slice(1),
    version + '.' + (Number(expiry) + 60) + '.' + signature,
    'v0.' + expiry + '.' + signature,
    token + '.extra',
    token.slice(0, -1),
    'v1.not-a-date.' + signature,
  ]) {
    assert.equal(await hasAdminSession(withToken(forged)), false, forged.slice(0, 30))
  }
  const invalidEncoding = new Request('https://example.test/', {
    headers: { cookie: 'admin_session=%invalid%ff' },
  })
  assert.equal(await hasAdminSession(invalidEncoding), false)
})

test('rejects signed expired and implausibly future tokens and tokens from rotated secrets', async () => {
  const originalNow = Date.now
  let expiredToken
  let futureToken
  try {
    const current = originalNow()
    Date.now = () => current - (ADMIN_SESSION_MAX_AGE + 3600) * 1000
    expiredToken = await createAdminSessionToken()
    Date.now = () => current + 3600 * 1000
    futureToken = await createAdminSessionToken()
  } finally {
    Date.now = originalNow
  }
  assert.equal(await hasAdminSession(withToken(expiredToken)), false)
  assert.equal(await hasAdminSession(withToken(futureToken)), false)
  const fresh = await createAdminSessionToken()
  process.env.ADMIN_SESSION_SECRET = 'another-isolated-key'
  try {
    assert.equal(await hasAdminSession(withToken(fresh)), false)
  } finally {
    process.env.ADMIN_SESSION_SECRET = testSecret
  }
})

test('sessions fail closed when both signing-key configuration sources are unavailable', async () => {
  const token = await createAdminSessionToken()
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_PASSWORD
  try {
    assert.equal(await hasAdminSession(withToken(token)), false)
    await assert.rejects(createAdminSessionToken(), /not configured/)
  } finally {
    process.env.ADMIN_SESSION_SECRET = testSecret
    process.env.ADMIN_PASSWORD = 'independent-test-admin-password'
  }
})

// ---- Task 5 (TSU-M7-004): server-side session ledger (revocation + inactivity timeout), written first in 5.1.
// With an AdminSessionStore passed in, tokens are `v2.<128-bit hex id>.<expiry>.<hmac>` and every check consults
// the ledger. Without a store the stateless v1 path above is unchanged (keeps production working until
// migration 005 is applied and the store is switched on). Times are epoch seconds from the app clock.
// TODO 5.2 (revocation) / 5.3 (inactivity timeout): remove the `todo` options once implemented.
const TODO_REVOKE = '5.2: session ledger/revocation not built yet'
const TODO_IDLE = '5.3: inactivity timeout not built yet'

// Mirrors the intended admin_sessions SQL; one row per issued session.
function memorySessionStore() {
  const rows = new Map()
  return {
    rows,
    async create(id, now, expiresAt) { rows.set(id, { expiresAt, lastSeenAt: now, revokedAt: null }) },
    async find(id) { const row = rows.get(id); return row ? { ...row } : null },
    async touch(id, now) { const row = rows.get(id); if (row) row.lastSeenAt = now },
    async revoke(id, now) { const row = rows.get(id); if (row && row.revokedAt === null) row.revokedAt = now },
  }
}

async function atTime(seconds, fn) {
  const originalNow = Date.now
  Date.now = () => seconds * 1000
  try { return await fn() } finally { Date.now = originalNow }
}

test('admin_sessions migration is additive with an opaque id, activity and revocation timestamps', async () => {
  const { id, statements } = JSON.parse(await readFile(
    new URL('../migrations/forward/005_admin_auth_hardening.json', import.meta.url), 'utf8'))
  assert.equal(id, '005_admin_auth_hardening')
  for (const statement of statements) {
    assert.doesNotMatch(statement, /;|\b(?:DROP|TRUNCATE|UPDATE|ALTER|DELETE)\b/i)
    assert.match(statement, /^CREATE TABLE IF NOT EXISTS public\.admin_(?:sessions|login_attempts) \(/)
  }
  const table = statements.find(s => s.startsWith('CREATE TABLE IF NOT EXISTS public.admin_sessions'))
  assert.ok(table)
  assert.match(table, /session_id TEXT PRIMARY KEY CHECK \(session_id ~ '\^\[0-9a-f\]\{32\}\$'\)/)
  for (const col of ['created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()', 'last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'expires_at TIMESTAMPTZ NOT NULL', 'revoked_at TIMESTAMPTZ)']) {
    assert.ok(table.includes(col), col)
  }
})

test('ledger session: v2 token with a random id recorded in the store, same expiry', { todo: TODO_REVOKE }, async () => {
  const store = memorySessionStore()
  const token = await createAdminSessionToken(store)
  assert.match(token, /^v2\.[0-9a-f]{32}\.\d+\.[0-9a-f]{64}$/)
  const [, id, expiry] = token.split('.')
  assert.equal(store.rows.get(id)?.expiresAt, Number(expiry))
  assert.equal(await hasAdminSession(withToken(token), store), true)
  const other = await createAdminSessionToken(store)
  assert.notEqual(other.split('.')[1], id)
})

test('ledger: the signature covers the session id', { todo: TODO_REVOKE }, async () => {
  const store = memorySessionStore()
  const token = await createAdminSessionToken(store)
  const victim = await createAdminSessionToken(store)
  assert.match(token, /^v2\.[0-9a-f]{32}\./)
  const [version, , expiry, signature] = token.split('.')
  const swapped = [version, victim.split('.')[1], expiry, signature].join('.')
  assert.equal(await hasAdminSession(withToken(swapped), store), false)
})

test('logout revokes only that session server-side; unknown ids are rejected', { todo: TODO_REVOKE }, async () => {
  const store = memorySessionStore()
  const mine = await createAdminSessionToken(store)
  const other = await createAdminSessionToken(store)
  await adminSession.revokeAdminSession(withToken(mine), store)
  assert.equal(await hasAdminSession(withToken(mine), store), false, 'a copied cookie stops working after logout')
  assert.equal(await hasAdminSession(withToken(other), store), true, 'revocation is selective')
  store.rows.delete(other.split('.')[1])
  assert.equal(await hasAdminSession(withToken(other), store), false, 'signed but not in the ledger')
  await adminSession.revokeAdminSession(withToken('v2.' + 'f'.repeat(32) + '.1.' + 'a'.repeat(64)), store)
  await adminSession.revokeAdminSession(new Request('https://example.test/'), store)
})

test('with a ledger, legacy v1 tokens are rejected; without one, v2 tokens are rejected', { todo: TODO_REVOKE }, async () => {
  const store = memorySessionStore()
  assert.equal(await hasAdminSession(withToken(await createAdminSessionToken()), store), false)
  assert.equal(await hasAdminSession(withToken(await createAdminSessionToken(store))), false)
})

test('ledger failures fail closed: no session accepted, no token issued', { todo: TODO_REVOKE }, async () => {
  const store = memorySessionStore()
  const token = await createAdminSessionToken(store)
  const broken = { ...store, async find() { throw new Error('synthetic store failure') } }
  assert.equal(await hasAdminSession(withToken(token), broken), false)
  await assert.rejects(createAdminSessionToken({ ...store, async create() { throw new Error('synthetic store failure') } }))
})

test('inactivity timeout: activity keeps a session alive, idling past the timeout ends it', { todo: TODO_IDLE }, async () => {
  const idle = adminSession.ADMIN_SESSION_IDLE_TIMEOUT
  assert.ok(Number.isInteger(idle) && idle >= 300 && idle < ADMIN_SESSION_MAX_AGE, String(idle))
  const store = memorySessionStore()
  const t0 = Math.floor(Date.now() / 1000)
  const token = await atTime(t0, () => createAdminSessionToken(store))
  let t = t0
  for (let i = 0; i < 3; i += 1) {
    t += idle - 60
    assert.equal(await atTime(t, () => hasAdminSession(withToken(token), store)), true, 'active at step ' + i)
  }
  assert.equal(await atTime(t + idle + 1, () => hasAdminSession(withToken(token), store)), false, 'idle too long')
  const unused = await atTime(t0, () => createAdminSessionToken(store))
  assert.equal(await atTime(t0 + idle + 1, () => hasAdminSession(withToken(unused), store)), false)
})
