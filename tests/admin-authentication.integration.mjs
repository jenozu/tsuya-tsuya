import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { POST as login, DELETE as logout } from '../app/api/admin/auth/route.ts'
import { hasAdminSession } from '../lib/admin-session.ts'

const priorPassword = process.env.ADMIN_PASSWORD
const priorSecret = process.env.ADMIN_SESSION_SECRET
before(() => {
  process.env.ADMIN_PASSWORD = 'isolated-admin-route-test-password'
  process.env.ADMIN_SESSION_SECRET = 'isolated-admin-route-test-signing-secret'
})
after(() => {
  if (priorPassword === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = priorPassword
  if (priorSecret === undefined) delete process.env.ADMIN_SESSION_SECRET
  else process.env.ADMIN_SESSION_SECRET = priorSecret
})

function browserRequest(method, body, {
  origin = 'https://tsuyanouchi.com', site = 'same-origin',
} = {}) {
  return new Request('https://tsuyanouchi.com/api/admin/auth', {
    method,
    headers: {
      origin, 'sec-fetch-site': site, 'content-type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

test('admin login rejects wrong/missing passwords without creating a session', async () => {
  for (const body of [{ password: 'wrong' }, {}, { password: null }]) {
    const response = await login(browserRequest('POST', body))
    assert.equal(response.status, 401)
    assert.equal(response.headers.get('set-cookie'), null)
    assert.deepEqual(await response.json(), { error: 'Invalid password' })
  }
})

test('admin login rejects foreign origins and inconsistent fetch metadata before parsing', async () => {
  for (const opt of [
    { origin: 'https://attacker.invalid', site: 'cross-site' },
    { origin: 'https://tsuyanouchi.com', site: 'cross-site' },
    { origin: 'null', site: 'same-origin' },
  ]) {
    const response = await login(browserRequest('POST', {
      password: 'isolated-admin-route-test-password',
    }, opt))
    assert.equal(response.status, 403)
    assert.equal(response.headers.get('set-cookie'), null)
  }
  assert.equal((await logout(browserRequest('DELETE', undefined, {
    origin: 'https://attacker.invalid', site: 'cross-site',
  }))).status, 403)
})

test('valid login emits HTTP-only SameSite cookie authenticating the real session verifier', async () => {
  const response = await login(browserRequest('POST', {
    password: 'isolated-admin-route-test-password',
  }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { success: true })
  const cookie = response.headers.get('set-cookie')
  assert.match(cookie, /admin_session=/)
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /SameSite=Lax/i)
  assert.match(cookie, /Path=\//i)
  assert.match(cookie, /Max-Age=604800/i)
  const pair = cookie.split(';')[0]
  assert.equal(await hasAdminSession(new Request('https://tsuyanouchi.com/api/products', {
    headers: { cookie: pair },
  })), true)
})

test('logout clears browser cookie without leaking the prior token', async () => {
  const response = await logout(browserRequest('DELETE'))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { success: true })
  const cookie = response.headers.get('set-cookie')
  assert.match(cookie, /admin_session=/)
  assert.match(cookie, /Max-Age=0/i)
  assert.match(cookie, /HttpOnly/i)
})

test('missing admin-password config responds with generic no-store failure and no cookie', async () => {
  const old = process.env.ADMIN_PASSWORD
  const oldLog = console.error
  const events = []
  try {
    delete process.env.ADMIN_PASSWORD
    console.error = value => events.push(value)
    const response = await login(browserRequest('POST', { password: 'anything' }))
    assert.equal(response.status, 500)
    assert.equal(response.headers.get('set-cookie'), null)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.ok(!(await response.text()).includes('ADMIN_PASSWORD'))
    assert.equal(JSON.parse(events[0]).event, 'api.admin_auth.failure')
  } finally {
    console.error = oldLog
    process.env.ADMIN_PASSWORD = old
  }
})
