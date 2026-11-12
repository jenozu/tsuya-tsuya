import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { createOrder, getOrder } from '../lib/printify.ts'
import { createMockPrintify } from './fixtures/mock-printify.mjs'

const input = {
  externalId: 'cs_test_123',
  label: 'ORD-1',
  lineItems: [{ productId: 'p1', variantId: 42, quantity: 2, externalId: 'o1:0' }],
  addressTo: {
    firstName: 'Zed', lastName: 'Fixture', email: 'zed.fixture@example.invalid', country: 'US',
    address1: '99 Secret Lane', city: 'Nowhere', zip: '90210',
  },
}
const PII = ['Zed', 'Fixture', 'zed.fixture', '99 Secret Lane', 'Nowhere', '90210']
const saved = {}
const logs = []
const origs = {}
beforeEach(() => {
  for (const n of ['PRINTIFY_API_TOKEN', 'PRINTIFY_SHOP_ID']) saved[n] = process.env[n]
  process.env.PRINTIFY_API_TOKEN = 'tok_test'
  process.env.PRINTIFY_SHOP_ID = 'shop9'
  logs.length = 0
  for (const m of ['log', 'warn', 'error']) { origs[m] = console[m]; console[m] = (...a) => logs.push(a.join(' ')) }
})
afterEach(() => {
  for (const n in saved) saved[n] === undefined ? delete process.env[n] : (process.env[n] = saved[n])
  for (const m in origs) console[m] = origs[m]
})

async function run(step) {
  const mock = createMockPrintify(step)
  const result = await createOrder(input, mock.fetch)
  const blob = JSON.stringify(result) + logs.join('')
  for (const p of PII) assert.ok(!blob.includes(p), `leaked ${p}`)
  return { result, mock }
}

test('request shape and success', async () => {
  const { result, mock } = await run({ status: 200, body: { id: 'po_1' } })
  assert.deepEqual(result, { ok: true, printifyOrderId: 'po_1', duplicate: false })
  const { url, init } = mock.calls[0]
  assert.equal(url, 'https://api.printify.com/v1/shops/shop9/orders.json')
  assert.equal(init.method, 'POST')
  assert.equal(init.headers.Authorization, 'Bearer tok_test')
  assert.equal(init.headers['User-Agent'], 'TsuyaNoUchi')
  assert.equal(init.headers['Content-Type'], 'application/json')
  const body = JSON.parse(init.body)
  assert.equal(body.external_id, 'cs_test_123')
  assert.equal(body.shipping_method, 1)
  assert.equal(body.send_shipping_notification, false)
  assert.deepEqual(body.line_items[0], { product_id: 'p1', variant_id: 42, quantity: 2, external_id: 'o1:0' })
  assert.equal(body.address_to.first_name, 'Zed')
})

test('409/8503 is duplicate success with existing id', async () => {
  const { result } = await run({ status: 409, body: { code: 8503, id: 'po_old' } })
  assert.deepEqual(result, { ok: true, printifyOrderId: 'po_old', duplicate: true })
})

test('409/8503 without id is non-retryable server error', async () => {
  const { result } = await run({ status: 409, body: { code: 8503 } })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'server')
  assert.equal(result.retryable, false)
})

for (const [status, code] of [[400, 'validation'], [401, 'auth'], [403, 'auth'], [404, 'not_found'], [422, 'ineligible']]) {
  test(`${status} -> ${code} not retryable`, async () => {
    const { result } = await run({ status, body: { code: 8103, message: '99 Secret Lane bad' } })
    assert.deepEqual(result, { ok: false, code, retryable: false, providerCode: 8103 })
  })
}

test('429 retryable with Retry-After', async () => {
  const { result } = await run({ status: 429, headers: { 'Retry-After': '30' } })
  assert.deepEqual(result, { ok: false, code: 'rate_limited', retryable: true, retryAfterSeconds: 30 })
})

test('429 without Retry-After', async () => {
  const { result } = await run({ status: 429 })
  assert.deepEqual(result, { ok: false, code: 'rate_limited', retryable: true })
})

test('500 retryable', async () => {
  const { result } = await run({ status: 500 })
  assert.deepEqual(result, { ok: false, code: 'server', retryable: true })
})

test('thrown fetch -> network; abort -> timeout', async () => {
  let r = await run({ throw: new Error('boom 99 Secret Lane') })
  assert.deepEqual(r.result, { ok: false, code: 'network', retryable: true })
  r = await run({ throw: new DOMException('aborted', 'AbortError') })
  assert.deepEqual(r.result, { ok: false, code: 'timeout', retryable: true })
})

async function runGet(step) {
  const mock = createMockPrintify(step)
  const result = await getOrder('po_1', mock.fetch)
  const blob = JSON.stringify(result) + logs.join('')
  for (const p of PII) assert.ok(!blob.includes(p), `leaked ${p}`)
  return { result, mock }
}

test('getOrder request shape and picked fields only', async () => {
  const { result, mock } = await runGet({
    status: 200,
    body: {
      id: 'po_1',
      status: 'in_production',
      address_to: { first_name: 'Zed', last_name: 'Fixture', email: 'zed.fixture@example.invalid', address1: '99 Secret Lane', city: 'Nowhere', zip: '90210' },
      line_items: [{ id: 'li1', status: 'printed', product_id: 'p1', variant_id: 42, quantity: 2 }],
      shipments: [{ carrier: 'USPS', number: '9400', url: 'https://track.example/9400', delivered_at: null, line_item_ids: ['li1'] }],
    },
  })
  const { url, init } = mock.calls[0]
  assert.equal(url, 'https://api.printify.com/v1/shops/shop9/orders/po_1.json')
  assert.equal(init.method, 'GET')
  assert.equal(init.body, undefined)
  assert.equal(init.headers.Authorization, 'Bearer tok_test')
  assert.equal(init.headers['User-Agent'], 'TsuyaNoUchi')
  assert.equal(result.ok, true)
  assert.deepEqual(JSON.parse(JSON.stringify(result.order)), {
    id: 'po_1',
    status: 'in_production',
    lineItems: [{ status: 'printed' }],
    shipments: [{ carrier: 'USPS', number: '9400', url: 'https://track.example/9400' }],
  })
  assert.equal('address_to' in result.order, false)
})

test('getOrder 404 -> not_found, not retryable', async () => {
  const { result } = await runGet({ status: 404, body: { code: 8103, message: '99 Secret Lane gone' } })
  assert.deepEqual(result, { ok: false, code: 'not_found', retryable: false, providerCode: 8103 })
})

test('getOrder 500 -> server retryable', async () => {
  const { result } = await runGet({ status: 500 })
  assert.deepEqual(result, { ok: false, code: 'server', retryable: true })
})

test('getOrder 200 without id -> non-retryable server error', async () => {
  const { result } = await runGet({ status: 200, body: { status: 'pending' } })
  assert.deepEqual(result, { ok: false, code: 'server', retryable: false })
})

test('getOrder thrown fetch -> network; abort -> timeout', async () => {
  let r = await runGet({ throw: new Error('boom 99 Secret Lane') })
  assert.deepEqual(r.result, { ok: false, code: 'network', retryable: true })
  r = await runGet({ throw: new DOMException('aborted', 'AbortError') })
  assert.deepEqual(r.result, { ok: false, code: 'timeout', retryable: true })
})
