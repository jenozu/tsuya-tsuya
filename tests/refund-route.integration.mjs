// Task 26.2: refund route, mock-stripe only.
import assert from 'node:assert/strict'
import { before, after, beforeEach, test } from 'node:test'
import { POST } from '../app/api/orders/refund/route.ts'
import { createAdminSessionToken } from '../lib/admin-session.ts'
import { setCharge, refundCalls, resetStripe } from './fixtures/mock-stripe.mjs'
import { setMockOrder, resetMockOrders } from './fixtures/mock-catalog.mjs'

const prior = { s: process.env.ADMIN_SESSION_SECRET, p: process.env.ADMIN_PASSWORD, f: process.env.ADMIN_AUTH_STORE_ENABLED }
let token
before(async () => {
  process.env.ADMIN_SESSION_SECRET = 'task-26-isolated-signing-secret-not-for-any-real-store'
  process.env.ADMIN_PASSWORD = 'task-26-test-password'
  delete process.env.ADMIN_AUTH_STORE_ENABLED
  token = await createAdminSessionToken()
})
after(() => {
  for (const [k, v] of [['ADMIN_SESSION_SECRET', prior.s], ['ADMIN_PASSWORD', prior.p], ['ADMIN_AUTH_STORE_ENABLED', prior.f]]) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v
  }
})
beforeEach(() => {
  resetStripe(); resetMockOrders(); setCharge('pi_1', 5000)
  setMockOrder({ order_id: 'ORD-1', payment_intent_id: 'pi_1', payment_status: 'paid' })
})

const good = { order_id: 'ORD-1', confirm: true, confirm_order_id: 'ORD-1', idempotencyToken: 'tok_route_0001' }
function req(body, { cookie = token, origin = 'https://tsuyanouchi.com' } = {}) {
  const headers = { origin, 'sec-fetch-site': origin.includes('tsuyanouchi') ? 'same-origin' : 'cross-site', 'content-type': 'application/json' }
  if (cookie) headers.cookie = 'admin_session=' + encodeURIComponent(cookie)
  return new Request('https://tsuyanouchi.com/api/orders/refund', { method: 'POST', headers, body: JSON.stringify(body) })
}

test('missing or wrong confirmation is rejected with no refund', async () => {
  for (const b of [
    { ...good, confirm: undefined }, { ...good, confirm: 'true' }, { ...good, confirm_order_id: undefined },
    { ...good, confirm_order_id: 'ORD-2' }, { ...good, idempotencyToken: undefined },
  ]) assert.equal((await POST(req(b))).status, 400)
  assert.equal(refundCalls.length, 0)
})

test('no session 401, foreign origin 403', async () => {
  assert.equal((await POST(req(good, { cookie: '' }))).status, 401)
  assert.equal((await POST(req(good, { origin: 'https://evil.example' }))).status, 403)
  assert.equal(refundCalls.length, 0)
})

test('invalid amount rejected; valid confirmed refund makes one refund, retry replays', async () => {
  assert.equal((await POST(req({ ...good, amount_cents: -5 }))).status, 400)
  assert.equal((await POST(req({ ...good, amount_cents: 1.5 }))).status, 400)
  assert.equal(refundCalls.length, 0)
  const res = await POST(req(good))
  assert.equal(res.status, 200)
  assert.equal((await res.json()).amount_cents, 5000)
  assert.equal(refundCalls.length, 1)
})

test('two POSTs with the same token never refund twice', async () => {
  // Partial: the retry replays the same Stripe refund (same id, one Stripe call).
  const partial = { ...good, idempotencyToken: 'tok_route_part', amount_cents: 1000 }
  const a = await (await POST(req(partial))).json()
  const b = await POST(req(partial))
  assert.equal(b.status, 200)
  assert.equal((await b.json()).refund_id, a.refund_id)
  assert.equal(refundCalls.length, 1)
  // Full: once nothing remains the retry is refused (409, UI says check Stripe), still no second refund.
  setMockOrder({ order_id: 'ORD-1', payment_intent_id: 'pi_1', payment_status: 'partially_refunded' })
  const full = { ...good, idempotencyToken: 'tok_route_full' }
  assert.equal((await POST(req(full))).status, 200)
  const retry = await POST(req(full))
  assert.equal(retry.status, 409)
  assert.equal((await retry.json()).error, 'not_refundable')
  assert.equal(refundCalls.length, 2)
})
