import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import Stripe from 'stripe'
import { priceCheckoutBasket } from '../lib/checkout-pricing.ts'

// Offline: local HMAC only, synthetic secrets, no network.
const secret = 'whsec_synthetic_never_used'
const body = JSON.stringify({ id: 'evt_1', object: 'event', type: 'checkout.session.completed', data: { object: {} } })

test('webhook signature: lib delegates to constructEvent; valid passes, missing/tampered/wrong secret throw', () => {
  // lib/stripe.ts uses extensionless imports, so assert its wiring and exercise the SDK call it makes.
  const lib = readFileSync('lib/stripe.ts', 'utf8')
  assert.match(lib, /stripe\.webhooks\.constructEvent\(\s*payload,\s*signature,\s*process\.env\.STRIPE_WEBHOOK_SECRET/)
  const wh = new Stripe('sk_test_SYNTHETIC_NEVER_USED').webhooks
  const sign = (payload, s) => wh.generateTestHeaderString({ payload, secret: s })
  assert.equal(wh.constructEvent(body, sign(body, secret), secret).id, 'evt_1')
  assert.throws(() => wh.constructEvent(body, '', secret))
  assert.throws(() => wh.constructEvent(body + ' ', sign(body, secret), secret))
  assert.throws(() => wh.constructEvent(body, sign(body, 'whsec_other'), secret))
})

test('webhook route reads the raw body and rejects a missing signature header with 400', () => {
  const src = readFileSync('app/api/webhooks/stripe/route.ts', 'utf8')
  assert.match(src, /await request\.text\(\)/)
  assert.doesNotMatch(src, /request\.json\(/)
  assert.match(src, /No signature'\s*\},\s*\{\s*status:\s*400/)
  assert.match(src, /Invalid signature'\s*\},\s*\{\s*status:\s*400/)
})

test('checkout session params: usd only, adaptive pricing disabled, no client amounts', () => {
  const src = readFileSync('app/api/checkout/create-session/route.ts', 'utf8')
  assert.match(src, /adaptive_pricing:\s*\{\s*enabled:\s*false\s*\}/)
  const currencies = [...src.matchAll(/currency:\s*([^,\n]+)/g)].map(m => m[1].trim())
  assert.ok(currencies.length >= 3)
  assert.ok(currencies.every(c => c === "'usd'"), currencies.join())
  assert.match(src, /automatic_tax:\s*\{\s*enabled:\s*false/)
  // line item amounts come only from priced/shippingCents/taxCents, never parsed client values
  assert.doesNotMatch(src, /unit_amount:\s*(subtotal|shipping|tax)\b/)
})

test('tampered client price, name and totals are ignored by server pricing', async () => {
  const product = { id: 'p', name: 'Real', description: '', price: 10, category: 'print', image_url: '', stock: 5,
    sizes: [{ label: '8 x 10', price: 12.5 }] }
  const priced = await priceCheckoutBasket(
    [{ id: 'p', quantity: 1, sizeLabel: '8 x 10', price: 0.01, unitCents: 1, name: 'Free', subtotal: 0 }],
    async () => product)
  assert.equal(priced.subtotalCents, 1250)
  assert.equal(priced.lines[0].name, 'Real')
})
