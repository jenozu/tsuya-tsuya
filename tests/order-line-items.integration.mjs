// TSU-M10-005 end to end, offline: checkout route -> (mock) Stripe -> signed webhook -> order line ledger.
import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { NextRequest } from 'next/server.js'
import { POST as createSession } from '../app/api/checkout/create-session/route.ts'
import { POST as webhook } from '../app/api/webhooks/stripe/route.ts'
import { priceCheckoutBasket } from '../lib/checkout-pricing.ts'
import { computeTaxAmount } from '../lib/tax.ts'
import { getProduct, resetMockOrders, orderMutations, getOrder } from './fixtures/mock-catalog.mjs'
import { calls, resetStripe, setWebhookSession } from './fixtures/mock-stripe.mjs'
import { resetMockEmail } from './fixtures/mock-email.mjs'
import { setSyntheticSignature } from './fixtures/mock-next-headers.mjs'
import { stripeEcho } from './fixtures/stripe-echo.mjs'

const saved = { key: process.env.STRIPE_SECRET_KEY, site: process.env.SITE_URL, whsec: process.env.STRIPE_WEBHOOK_SECRET }
before(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_SYNTHETIC_NEVER_USED_WITH_PROVIDER'
  process.env.SITE_URL = 'https://tsuyanouchi.com'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_synthetic_never_used'
})
after(() => {
  for (const [name, value] of [['STRIPE_SECRET_KEY', saved.key], ['SITE_URL', saved.site], ['STRIPE_WEBHOOK_SECRET', saved.whsec]]) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  setSyntheticSignature(null)
})

test('paid order persists line items equal to server-derived pricing, not client-sent amounts', async () => {
  resetStripe(); resetMockOrders(); resetMockEmail()
  const items = [{ id: 'mock-product', quantity: 2, sizeLabel: '8" x 10"', price: 0.01, name: 'Forged' }]
  const tax = computeTaxAmount(25, 'US', 'NY')
  const body = { items, subtotal: 25, shipping: 0, tax, email: 'synthetic@example.invalid',
    shipping_address: { firstName: 'Test', lastName: 'Buyer', address: '1 Synthetic St', city: 'Testville',
      state: 'NY', postalCode: '10001', country: 'US' } }
  const res = await createSession(new NextRequest('https://tsuyanouchi.com/api/checkout/create-session', {
    method: 'POST', body: JSON.stringify(body),
    headers: { origin: 'https://tsuyanouchi.com', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' },
  }))
  assert.equal(res.status, 200)
  const { orderId, sessionId } = await res.json()
  const params = calls[0].params

  const echoed = stripeEcho(params.line_items)
  setWebhookSession({ id: sessionId, payment_status: 'paid', payment_intent: 'pi_synthetic_lines',
    customer_email: 'synthetic@example.invalid', metadata: params.metadata,
    amount_total: echoed.reduce((s, li) => s + li.amount_total, 0),
    total_details: { amount_tax: 0, amount_shipping: 0 }, line_items: { data: echoed } })
  setSyntheticSignature('synthetic-signed-webhook-event')
  const hook = await webhook(new Request('https://tsuyanouchi.com/api/webhooks/stripe', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'evt_lines_1', type: 'checkout.session.completed', data: { object: { id: sessionId } } }),
  }))
  assert.equal(hook.status, 200)

  const priced = await priceCheckoutBasket(items, getProduct)
  const taxCents = Math.round(tax * 100)
  assert.deepEqual(orderMutations.map(m => m.kind), ['create'])
  assert.deepEqual(orderMutations[0].lineItems, [
    ...priced.lines.map(l => ({ kind: 'product', productId: l.productId, sizeLabel: l.sizeLabel, name: l.name,
      quantity: l.quantity, unitAmountCents: l.unitCents, currency: 'usd' })),
    // Stripe line order; free shipping had no Stripe line, so its explicit zero row is appended last.
    { kind: 'tax', productId: null, sizeLabel: null, name: 'Tax', quantity: 1, unitAmountCents: taxCents, currency: 'usd' },
    { kind: 'shipping', productId: null, sizeLabel: null, name: 'Shipping', quantity: 1, unitAmountCents: 0, currency: 'usd' },
  ])
  assert.equal(priced.lines[0].unitCents, 1250)
  const order = await getOrder(orderId)
  assert.equal(order.subtotal, priced.subtotalCents / 100)
  assert.equal(order.taxes, taxCents / 100)
  assert.deepEqual(order.items.map(i => [i.productId, i.selectedSize, i.price, i.quantity]),
    [['mock-product', '8" x 10"', 12.5, 2]])
})
