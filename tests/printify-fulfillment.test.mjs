// Task 19: submission logic with an in-memory store and mock fetch. No DB, no network (no test DB yet, task 4).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, test } from 'node:test'
import { MAX_ATTEMPTS, submitPaidOrderToPrintify } from '../lib/printify-fulfillment.ts'
import { createMockPrintify } from './fixtures/mock-printify.mjs'
import {
  printifyStore, rows, storeCalls, resetPrintifyStore, setProductSizes, failNextStoreCall, expireClaim,
} from './fixtures/mock-printify-store.mjs'

const SESSION = 'cs_test_fulfil_1'
const PII = ['Zed', 'Fixture', 'zed.fixture@example.invalid', '99 Secret Lane', 'Nowhere', '90210', '555-0100']
const order = (over = {}) => ({
  id: 'row1', order_id: 'ORD-F1', email: 'zed.fixture@example.invalid', payment_status: 'paid', status: 'processing',
  items: [{ productId: 'prod-1', productName: 'Wave', quantity: 2, price: 30, selectedSize: '8" x 10"' }],
  subtotal: 60, taxes: 0, shipping: 0, total: 60, created_at: '', updated_at: '',
  shipping_address: { firstName: 'Zed', lastName: 'Fixture', address: '99 Secret Lane', city: 'Nowhere',
    state: 'CA', postalCode: '90210', country: 'US', phone: '555-0100' },
  ...over,
})
const logs = []
const saved = {}
const origs = {}
beforeEach(() => {
  resetPrintifyStore()
  setProductSizes('prod-1', [{ label: '8" x 10"', price: 30, printifyProductId: 'pp_1', printifyVariantId: 4242 }])
  for (const n of ['PRINTIFY_API_TOKEN', 'PRINTIFY_SHOP_ID']) saved[n] = process.env[n]
  process.env.PRINTIFY_API_TOKEN = 'tok_test'
  process.env.PRINTIFY_SHOP_ID = 'shop9'
  logs.length = 0
  for (const m of ['log', 'info', 'warn', 'error']) { origs[m] = console[m]; console[m] = (...a) => logs.push(a.join(' ')) }
})
afterEach(() => {
  for (const m in origs) console[m] = origs[m]
  for (const n in saved) { if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n] }
  const blob = logs.join('\n') + JSON.stringify([...rows.values()])
  for (const p of PII) assert.ok(!blob.includes(p), `customer data leaked into logs or state: ${p}`)
})

const submit = (mock, o = order()) => submitPaidOrderToPrintify(o, SESSION, printifyStore, mock.fetch)

test('paid order -> exactly one Printify order keyed on the session id', async () => {
  const mock = createMockPrintify({ status: 200, body: { id: 'po_1' } })
  assert.equal(await submit(mock), 'submitted')
  assert.equal(mock.calls.length, 1)
  const body = JSON.parse(mock.calls[0].init.body)
  assert.equal(body.external_id, SESSION)
  assert.deepEqual(body.line_items, [{ product_id: 'pp_1', variant_id: 4242, quantity: 2, external_id: 'ORD-F1:0' }])
  assert.equal(body.address_to.region, 'CA')
  assert.deepEqual(rows.get('ORD-F1'), {
    orderId: 'ORD-F1', sessionId: SESSION, state: 'submitted', attempts: 1, printifyOrderId: 'po_1',
    lastErrorCode: null, claimExpired: false,
  })
})

test('duplicate event -> still one order', async () => {
  const mock = createMockPrintify({ status: 200, body: { id: 'po_1' } })
  assert.equal(await submit(mock), 'submitted')
  assert.equal(await submit(mock), 'skipped')
  assert.equal(mock.calls.length, 1)
})

test('concurrent duplicates -> one claim, one Printify call', async () => {
  const mock = createMockPrintify({ status: 200, body: { id: 'po_1' } })
  const outcomes = await Promise.all([submit(mock), submit(mock), submit(mock)])
  assert.deepEqual(outcomes.sort(), ['skipped', 'skipped', 'submitted'])
  assert.equal(mock.calls.length, 1)
})

test('Printify 5xx -> retryable pending state, then a retry succeeds once', async () => {
  const mock = createMockPrintify({ status: 503, body: { message: 'Zed at 99 Secret Lane' } }, { status: 200, body: { id: 'po_2' } })
  assert.equal(await submit(mock), 'retry_pending')
  assert.equal(rows.get('ORD-F1').state, 'pending')
  assert.equal(rows.get('ORD-F1').lastErrorCode, 'server')
  assert.equal(await submit(mock), 'submitted')
  assert.equal(await submit(mock), 'skipped')
  assert.equal(mock.calls.length, 2)
  assert.equal(rows.get('ORD-F1').attempts, 2)
  assert.equal(rows.get('ORD-F1').lastErrorCode, null)
})

test(`retryable failures stop at ${MAX_ATTEMPTS} attempts with needs_attention`, async () => {
  const mock = createMockPrintify(...Array.from({ length: MAX_ATTEMPTS }, () => ({ status: 500 })))
  for (let i = 1; i < MAX_ATTEMPTS; i++) assert.equal(await submit(mock), 'retry_pending')
  assert.equal(await submit(mock), 'needs_attention')
  assert.equal(await submit(mock), 'skipped')
  assert.equal(rows.get('ORD-F1').state, 'needs_attention')
})

test('lease expired mid-call: resubmit gets 409/8503 and records the existing order id', async () => {
  await printifyStore.ensure('ORD-F1', SESSION)
  await printifyStore.claim('ORD-F1', SESSION) // a crashed worker held the claim
  expireClaim('ORD-F1')
  const mock = createMockPrintify({ status: 409, body: { code: 8503, id: 'po_3' } })
  assert.equal(await submit(mock), 'submitted')
  assert.equal(rows.get('ORD-F1').printifyOrderId, 'po_3')
  assert.equal(mock.calls.length, 1)
})

test('unpaid or non-session input -> nothing stored, nothing sent', async () => {
  const mock = createMockPrintify()
  for (const status of ['pending', 'failed', 'refunded', 'partially_refunded']) {
    assert.equal(await submit(mock, order({ payment_status: status })), 'skipped')
  }
  assert.equal(await submitPaidOrderToPrintify(order(), 'pi_123', printifyStore, mock.fetch), 'skipped')
  assert.equal(storeCalls.length, 0)
  assert.equal(mock.calls.length, 0)
})

test('missing variant mapping or a 400 -> needs_attention, never retried', async () => {
  setProductSizes('prod-1', [{ label: '8" x 10"', price: 30 }])
  const mock = createMockPrintify({ status: 400, body: { code: 8103, message: '90210 invalid' } })
  assert.equal(await submit(mock), 'needs_attention')
  assert.equal(rows.get('ORD-F1').lastErrorCode, 'mapping_missing')
  assert.equal(mock.calls.length, 0)

  resetPrintifyStore()
  setProductSizes('prod-1', [{ label: '8" x 10"', printifyProductId: 'pp_1', printifyVariantId: 4242 }])
  assert.equal(await submit(mock), 'needs_attention')
  assert.equal(rows.get('ORD-F1').lastErrorCode, 'validation')
})

test('missing Printify config -> needs_attention, no throw', async () => {
  delete process.env.PRINTIFY_API_TOKEN
  assert.equal(await submit(createMockPrintify()), 'needs_attention')
  assert.equal(rows.get('ORD-F1').lastErrorCode, 'config')
})

test('store failure -> error outcome, never throws', async () => {
  failNextStoreCall()
  const mock = createMockPrintify()
  assert.equal(await submit(mock), 'error')
  assert.equal(mock.calls.length, 0)
  assert.ok(logs.some(l => l.includes('printify.order.store_failure')))
})

test('Postgres store: claim is a single conditional UPDATE keyed on order and session', () => {
  const src = readFileSync('lib/printify-store.ts', 'utf8')
  assert.match(src, /WHERE order_id = \$\{orderId\} AND stripe_checkout_session_id = \$\{sessionId\}\s+AND \(state = 'pending' OR \(state = 'submitting' AND claim_expires_at < NOW\(\)\)\)/)
  assert.match(src, /ON CONFLICT DO NOTHING/)
  assert.doesNotMatch(src, /console\./)
})
