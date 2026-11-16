import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { POST as createOrder } from '../app/api/orders/route.ts'
import { POST as create } from '../app/api/products/route.ts'
import { DELETE as remove } from '../app/api/products/[id]/route.ts'
import { POST as deleteMany } from '../app/api/products/bulk-delete/route.ts'
import { createAdminSessionToken, hasAdminSession } from '../lib/admin-session.ts'
import { orderMutations, resetMockOrders, resetWrites, writes } from './fixtures/mock-catalog.mjs'

const prior = { s: process.env.ADMIN_SESSION_SECRET, p: process.env.ADMIN_PASSWORD, f: process.env.ADMIN_AUTH_STORE_ENABLED }
let token
before(async () => {
  process.env.ADMIN_SESSION_SECRET = 'task-07-isolated-signing-secret-not-for-any-real-store'
  process.env.ADMIN_PASSWORD = 'task-07-test-password'
  delete process.env.ADMIN_AUTH_STORE_ENABLED // route-level tests use the stateless v1 token; no network
  token = await createAdminSessionToken()
})
after(() => {
  for (const [k, v] of [['ADMIN_SESSION_SECRET', prior.s], ['ADMIN_PASSWORD', prior.p], ['ADMIN_AUTH_STORE_ENABLED', prior.f]]) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v
  }
})

const valid = {
  name: 'Guarded print', category: 'Art Prints', price: 12.5,
  image_url: '/product-placeholder.svg', stock: 3, sizes: [{ label: '8" x 10"', price: 12.5 }],
}
function req(path, method, body, cookieToken) {
  const headers = { origin: 'https://tsuyanouchi.com', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }
  if (cookieToken !== undefined) headers.cookie = 'admin_session=' + encodeURIComponent(cookieToken)
  return new Request('https://tsuyanouchi.com' + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
}
const params = { params: Promise.resolve({ id: 'mock-product' }) }

test('tampered, truncated, wrong-version and expired cookies are rejected on every catalog mutation', async () => {
  const [v, exp, sig] = token.split('.')
  const bad = [
    `${v}.${exp}.${sig.slice(0, -2)}00`, // forged signature
    `${v}.${Number(exp) + 60}.${sig}`, // extended expiry, signature mismatch
    `${v}.${Number(exp)}`, // truncated
    `v2.${'a'.repeat(32)}.${exp}.${sig}`, // ledger token while store disabled
    `${v}.${Math.floor(Date.now() / 1000) - 10}.${sig}`, // expired
    'garbage',
  ]
  for (const cookie of bad) {
    resetWrites()
    assert.equal((await create(req('/api/products', 'POST', valid, cookie))).status, 401, cookie)
    assert.equal((await remove(req('/api/products/mock-product', 'DELETE', undefined, cookie), params)).status, 401)
    assert.equal((await deleteMany(req('/api/products/bulk-delete', 'POST', { ids: ['a'] }, cookie))).status, 401)
    assert.equal(writes.length, 0)
  }
})

test('a token signed with a different secret is rejected', async () => {
  const mine = token
  process.env.ADMIN_SESSION_SECRET = 'a-different-isolated-secret-for-rotation-check'
  try {
    resetWrites()
    assert.equal((await create(req('/api/products', 'POST', valid, mine))).status, 401)
    assert.equal(writes.length, 0)
  } finally {
    process.env.ADMIN_SESSION_SECRET = 'task-07-isolated-signing-secret-not-for-any-real-store'
  }
})

test('orders route requires same-origin and an admin session before persisting', async () => {
  resetMockOrders()
  const order = { order_id: 'ord-1' }
  assert.equal((await createOrder(req('/api/orders', 'POST', order))).status, 401)
  const hostile = new Request('https://tsuyanouchi.com/api/orders', {
    method: 'POST', body: JSON.stringify(order),
    headers: { origin: 'https://attacker.invalid', 'sec-fetch-site': 'cross-site', cookie: 'admin_session=' + encodeURIComponent(token) },
  })
  assert.equal((await createOrder(hostile)).status, 403)
  assert.equal(orderMutations.length, 0)
  assert.equal((await createOrder(req('/api/orders', 'POST', order, token))).status, 201)
  assert.equal(orderMutations.length, 1)
})

test('injected ledger store: unknown, revoked and live sessions are distinguished (no network)', async () => {
  process.env.ADMIN_AUTH_STORE_ENABLED = 'true'
  const rows = new Map()
  const store = {
    async create(id, now, expiresAt) { rows.set(id, { expiresAt, lastSeenAt: now, revokedAt: null }) },
    async find(id) { return rows.get(id) ?? null },
    async touch(id, now) { rows.get(id).lastSeenAt = now },
    async revoke(id, now) { rows.get(id).revokedAt = now },
  }
  try {
    const t = await createAdminSessionToken(store)
    const r = () => new Request('https://tsuyanouchi.com/api/products', { headers: { cookie: 'admin_session=' + encodeURIComponent(t) } })
    assert.equal(await hasAdminSession(r(), store), true)
    rows.clear() // session unknown to ledger
    assert.equal(await hasAdminSession(r(), store), false)
    const t2 = await createAdminSessionToken(store)
    const id = t2.split('.')[1]
    await store.revoke(id, Math.floor(Date.now() / 1000))
    assert.equal(await hasAdminSession(new Request('https://tsuyanouchi.com/', { headers: { cookie: 'admin_session=' + encodeURIComponent(t2) } }), store), false)
  } finally {
    delete process.env.ADMIN_AUTH_STORE_ENABLED
  }
})
