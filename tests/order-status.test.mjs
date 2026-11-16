// Task 23: admin order status transitions. Synthetic only: the alias loader swaps @/lib/data for the in-memory
// mock catalog (tests/fixtures/mock-catalog.mjs). No DB, no network. Runs under plain `npm test`: the loader is
// registered here, then the route is imported dynamically so its imports go through it.
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { after, before, beforeEach, test } from 'node:test'
import { allowedNextStatuses, canTransition } from '../lib/order-status.ts'

register('./fixtures/admin-route-loader.mjs', import.meta.url)
const { PATCH } = await import('../app/api/orders/route.ts')
const { createAdminSessionToken } = await import('../lib/admin-session.ts')
const { resetMockOrders, setMockOrder, getOrder, orderReads, orderMutations } = await import('./fixtures/mock-catalog.mjs')

const ORIGIN = 'https://shop.example.test'
let saved
before(() => { saved = process.env.ADMIN_SESSION_SECRET; process.env.ADMIN_SESSION_SECRET = 'synthetic-admin-secret' })
after(() => { if (saved === undefined) delete process.env.ADMIN_SESSION_SECRET; else process.env.ADMIN_SESSION_SECRET = saved })
beforeEach(() => { resetMockOrders(); setMockOrder({ order_id: 'ord_1', status: 'processing', payment_status: 'paid' }) })

const patch = (body, headers = {}) => PATCH(new Request(`${ORIGIN}/api/orders`, {
  method: 'PATCH', headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers }, body: JSON.stringify(body),
}))
const asAdmin = async () => ({ cookie: `admin_session=${encodeURIComponent(await createAdminSessionToken())}` })

test('allowed transitions', () => {
  assert.equal(canTransition('processing', 'shipped'), true)
  assert.equal(canTransition('shipped', 'delivered'), true)
  assert.equal(canTransition('fulfilled', 'delivered'), true) // legacy status the paid webhook preserves
})

test('rejected transitions', () => {
  assert.equal(canTransition('pending', 'processing'), false) // payment-driven only
  assert.equal(canTransition('pending', 'cancelled'), false) // a later paid webhook would reopen it
  assert.equal(canTransition('processing', 'cancelled'), false) // needs refund workflow (owner decision)
  assert.equal(canTransition('pending', 'shipped'), false)
  assert.equal(canTransition('shipped', 'processing'), false)
  assert.equal(canTransition('delivered', 'cancelled'), false)
  assert.equal(canTransition('cancelled', 'shipped'), false)
  assert.equal(canTransition('processing', 'bogus'), false)
  assert.equal(canTransition('processing', undefined), false)
  assert.deepEqual(allowedNextStatuses('unknown'), [])
  assert.deepEqual(allowedNextStatuses('constructor'), [])
})

test('PATCH without an admin session is 401 and touches no data', async () => {
  const res = await patch({ order_id: 'ord_1', status: 'shipped' })
  assert.equal(res.status, 401)
  assert.equal(orderReads.length, 0)
  assert.equal(orderMutations.length, 0)
})

test('PATCH with a forged session cookie is 401', async () => {
  const res = await patch({ order_id: 'ord_1', status: 'shipped' }, { cookie: 'admin_session=v1.9999999999.deadbeef' })
  assert.equal(res.status, 401)
  assert.equal(orderReads.length, 0)
})

test('PATCH from a foreign origin is 403 even with a session and touches no data', async () => {
  const res = await patch({ order_id: 'ord_1', status: 'shipped' }, { ...(await asAdmin()), origin: 'https://evil.example' })
  assert.equal(res.status, 403)
  assert.equal(orderReads.length, 0)
  assert.equal(orderMutations.length, 0)
})

test('admin PATCH applies an allowed transition', async () => {
  const res = await patch({ order_id: 'ord_1', status: 'shipped' }, await asAdmin())
  assert.equal(res.status, 200)
  assert.equal((await getOrder('ord_1')).status, 'shipped')
  assert.deepEqual(orderMutations, [{ kind: 'transition', id: 'ord_1', from: 'processing', to: 'shipped' }])
})

test('admin PATCH rejects a disallowed transition with 409 and no write', async () => {
  const res = await patch({ order_id: 'ord_1', status: 'cancelled' }, await asAdmin())
  assert.equal(res.status, 409)
  assert.equal(orderMutations.length, 0)
  assert.equal((await getOrder('ord_1')).status, 'processing')
})

test('admin PATCH: unknown order 404, missing id 400', async () => {
  assert.equal((await patch({ order_id: 'nope', status: 'shipped' }, await asAdmin())).status, 404)
  assert.equal((await patch({ status: 'shipped' }, await asAdmin())).status, 400)
})
