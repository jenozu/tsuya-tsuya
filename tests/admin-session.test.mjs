import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
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
