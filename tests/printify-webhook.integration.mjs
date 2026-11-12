// Task 19: Printify submission through the Stripe webhook route. Synthetic only: mock Stripe, orders, email,
// Printify store (tests/fixtures/mock-printify-store.mjs) and fetch. No DB, no network.
// Run: node --experimental-strip-types --experimental-loader ./tests/fixtures/admin-route-loader.mjs --test tests/printify-webhook.integration.mjs
import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { POST } from '../app/api/webhooks/stripe/route.ts'
import { setSyntheticSignature } from './fixtures/mock-next-headers.mjs'
import { resetMockOrders, orderMutations } from './fixtures/mock-catalog.mjs'
import { resetStripe, setWebhookSession } from './fixtures/mock-stripe.mjs'
import { resetMockEmail, emailSends } from './fixtures/mock-email.mjs'
import { createMockPrintify } from './fixtures/mock-printify.mjs'
import { rows, storeCalls, resetPrintifyStore, setProductSizes } from './fixtures/mock-printify-store.mjs'

const ENV = ['STRIPE_WEBHOOK_SECRET', 'PRINTIFY_ORDERS_ENABLED', 'PRINTIFY_API_TOKEN', 'PRINTIFY_SHOP_ID']
const PII = ['Zed', 'Fixture', 'zed.fixture@example.invalid', '99 Secret Lane', 'Nowhere', '90210', '555-0100']
const saved = {}
const origFetch = globalThis.fetch
const logs = []
const origs = {}
before(() => { for (const n of ENV) saved[n] = process.env[n] })
after(() => {
  for (const n of ENV) { if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n] }
  globalThis.fetch = origFetch
  setSyntheticSignature(null)
})
beforeEach(() => {
  resetStripe(); resetMockOrders(); resetMockEmail(); resetPrintifyStore()
  setSyntheticSignature('synthetic-signed-webhook-event')
  Object.assign(process.env, {
    STRIPE_WEBHOOK_SECRET: 'whsec_synthetic_never_used', PRINTIFY_ORDERS_ENABLED: 'true',
    PRINTIFY_API_TOKEN: 'tok_test', PRINTIFY_SHOP_ID: 'shop9',
  })
  setProductSizes('synthetic-product', [{ label: '8" x 10"', printifyProductId: 'pp_1', printifyVariantId: 4242 }])
  logs.length = 0
  for (const m of ['log', 'info', 'warn', 'error']) { origs[m] = console[m]; console[m] = (...a) => logs.push(a.join(' ')) }
})
afterEach(() => {
  for (const m in origs) console[m] = origs[m]
  globalThis.fetch = origFetch
  const blob = logs.join('\n')
  for (const p of PII) assert.ok(!blob.includes(p), `customer data in captured logs: ${p}`)
})

function mockPrintify(...script) {
  const mock = createMockPrintify(...script)
  globalThis.fetch = mock.fetch
  return mock
}
const post = () => POST(new Request('https://tsuyanouchi.com/api/webhooks/stripe', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'evt_p1', type: 'checkout.session.completed', data: { object: { id: 'cs_synthetic_p1' } } }),
}))
const session = (paymentStatus = 'paid') => ({
  id: 'cs_synthetic_p1', payment_status: paymentStatus, payment_intent: 'pi_synthetic_p1',
  customer_email: 'zed.fixture@example.invalid',
  metadata: { orderId: 'ORD-P1', addr_firstName: 'Zed', addr_lastName: 'Fixture', addr_address: '99 Secret Lane',
    addr_city: 'Nowhere', addr_state: 'CA', addr_postalCode: '90210', addr_country: 'US', phone: '555-0100' },
  amount_total: 3000, total_details: { amount_tax: 0, amount_shipping: 0 },
  line_items: { data: [{ quantity: 1, amount_total: 3000, price: { unit_amount: 3000,
    product: { name: 'Synthetic Art Print', metadata: { productId: 'synthetic-product', sizeLabel: '8" x 10"' } } } }] },
})

test('paid session -> one Printify order after the emails, keyed on the session id', async () => {
  setWebhookSession(session())
  const mock = mockPrintify({ status: 200, body: { id: 'po_1' } })
  assert.equal((await post()).status, 200)
  assert.equal(mock.calls.length, 1)
  assert.equal(JSON.parse(mock.calls[0].init.body).external_id, 'cs_synthetic_p1')
  assert.deepEqual(emailSends.map(x => x.kind), ['customer', 'owner'])
  assert.equal(rows.get('ORD-P1').state, 'submitted')
})

test('duplicate event -> still one order, one set of emails', async () => {
  setWebhookSession(session())
  const mock = mockPrintify({ status: 200, body: { id: 'po_1' } })
  assert.equal((await post()).status, 200)
  assert.equal((await post()).status, 200)
  assert.equal(mock.calls.length, 1)
  assert.deepEqual(orderMutations.map(x => x.kind), ['create'])
  assert.equal(emailSends.length, 2)
})

test('concurrent duplicate deliveries -> one Printify call', async () => {
  setWebhookSession(session())
  const mock = mockPrintify({ status: 200, body: { id: 'po_1' } })
  await Promise.all([post(), post(), post()])
  assert.equal(mock.calls.length, 1)
  assert.equal(rows.size, 1)
})

test('Printify 5xx -> retry state and a Stripe retry (500), emails already sent; redelivery succeeds', async () => {
  setWebhookSession(session())
  const mock = mockPrintify({ status: 502 }, { status: 200, body: { id: 'po_2' } })
  assert.equal((await post()).status, 500)
  assert.equal(rows.get('ORD-P1').state, 'pending')
  assert.equal(emailSends.length, 2)
  assert.equal((await post()).status, 200)
  assert.equal(rows.get('ORD-P1').state, 'submitted')
  assert.equal(mock.calls.length, 2)
  assert.equal(emailSends.length, 2)
  assert.deepEqual(orderMutations.map(x => x.kind), ['create'])
})

test('non-retryable failure -> needs_attention, webhook still 200', async () => {
  setWebhookSession(session())
  mockPrintify({ status: 400, body: { code: 8103, message: 'zip 90210 for Zed' } })
  assert.equal((await post()).status, 200)
  assert.equal(rows.get('ORD-P1').state, 'needs_attention')
  assert.equal(rows.get('ORD-P1').lastErrorCode, 'validation')
})

test('unpaid session -> no Printify row or call', async () => {
  setWebhookSession(session('unpaid'))
  const mock = mockPrintify()
  assert.equal((await post()).status, 200)
  assert.equal(mock.calls.length, 0)
  assert.equal(storeCalls.length, 0)
})

test('flag off -> webhook behaviour unchanged: no Printify store or fetch use', async () => {
  for (const value of [undefined, '', 'false', '1', 'TRUE']) {
    resetMockOrders(); resetMockEmail(); resetPrintifyStore()
    if (value === undefined) delete process.env.PRINTIFY_ORDERS_ENABLED
    else process.env.PRINTIFY_ORDERS_ENABLED = value
    setWebhookSession(session())
    const mock = mockPrintify()
    assert.equal((await post()).status, 200)
    assert.equal((await post()).status, 200)
    assert.equal(mock.calls.length, 0)
    assert.equal(storeCalls.length, 0)
    assert.deepEqual(orderMutations.map(x => x.kind), ['create'])
    assert.deepEqual(emailSends.map(x => x.kind), ['customer', 'owner'])
  }
})
