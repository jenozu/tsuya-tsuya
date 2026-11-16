import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { priceCheckoutBasket } from '../lib/checkout-pricing.ts'
import { orderLineItemsFromStripe, persistOrderWithLineItems } from '../lib/order-line-items.ts'
import { stripeEcho } from './fixtures/stripe-echo.mjs'
import { migrationChecksum, planMigrations, BASELINE_ID } from '../lib/migration-plan.mjs'

const product = {
  id: 'product-1', name: 'Canonical product', description: '', price: 10, category: 'print', image_url: '', stock: 3,
  sizes: [{ label: '8 x 10', price: 12.5 }, { label: '11 x 14', price: 22 }],
}
const lookup = async id => id === product.id ? product : null

// Stripe Checkout create params exactly as app/api/checkout/create-session/route.ts builds them.
function checkoutParams(lines, shippingCents, taxCents) {
  const params = lines.map(item => ({ quantity: item.quantity, price_data: { currency: 'usd', unit_amount: item.unitCents,
    product_data: { name: item.name, metadata: { productId: item.productId, sizeLabel: item.sizeLabel ?? '' } } } }))
  if (shippingCents > 0) params.push({ quantity: 1, price_data: { currency: 'usd', unit_amount: shippingCents, product_data: { name: 'Shipping' } } })
  if (taxCents > 0) params.push({ quantity: 1, price_data: { currency: 'usd', unit_amount: taxCents, product_data: { name: 'Tax' } } })
  return params
}

test('persisted line items equal the server-derived pricing, ignoring forged client prices', async () => {
  const priced = await priceCheckoutBasket([
    { id: 'product-1', quantity: 2, sizeLabel: '8 x 10', price: 0.01 },
    { id: 'product-1', quantity: 1, sizeLabel: '11 x 14' },
  ], lookup)
  const ledger = orderLineItemsFromStripe(stripeEcho(checkoutParams(priced.lines, 899, 312)))
  assert.deepEqual(ledger, [
    ...priced.lines.map(line => ({ kind: 'product', productId: line.productId, sizeLabel: line.sizeLabel,
      name: line.name, quantity: line.quantity, unitAmountCents: line.unitCents, currency: 'usd' })),
    { kind: 'shipping', productId: null, sizeLabel: null, name: 'Shipping', quantity: 1, unitAmountCents: 899, currency: 'usd' },
    { kind: 'tax', productId: null, sizeLabel: null, name: 'Tax', quantity: 1, unitAmountCents: 312, currency: 'usd' },
  ])
  const productCents = ledger.filter(l => l.kind === 'product').reduce((s, l) => s + l.unitAmountCents * l.quantity, 0)
  assert.equal(productCents, priced.subtotalCents)
  assert.equal(productCents, 2 * 1250 + 2200)
})

test('zero shipping and tax are still captured as explicit breakdown rows', async () => {
  const priced = await priceCheckoutBasket([{ id: 'product-1', quantity: 1, sizeLabel: '8 x 10' }], lookup)
  const ledger = orderLineItemsFromStripe(stripeEcho(checkoutParams(priced.lines, 0, 0)))
  assert.deepEqual(ledger.map(l => [l.kind, l.unitAmountCents]), [['product', 1250], ['shipping', 0], ['tax', 0]])
})

test('unexpected Stripe data never throws: recurring lines skipped, missing fields defaulted', () => {
  const ledger = orderLineItemsFromStripe([
    { quantity: null, price: { unit_amount: null, product: { name: 'Odd' } } },
    { quantity: 1, price: { unit_amount: 100, recurring: { interval: 'month' } } },
    { quantity: 1, price: null },
  ])
  assert.deepEqual(ledger[0], { kind: 'product', productId: null, sizeLabel: null, name: 'Odd', quantity: 1, unitAmountCents: 0, currency: 'usd' })
  assert.deepEqual(ledger.map(l => l.kind), ['product', 'shipping', 'tax'])
})

test('without the order_line_items table (42P01) the order is still saved; other errors propagate', async () => {
  const calls = []
  const withLines = async () => { calls.push('lines'); throw Object.assign(new Error('missing'), { code: '42P01' }) }
  const orderOnly = async () => { calls.push('order'); return 'saved' }
  assert.equal(await persistOrderWithLineItems([{}], withLines, orderOnly), 'saved')
  assert.deepEqual(calls, ['lines', 'order'])
  calls.length = 0
  assert.equal(await persistOrderWithLineItems([], withLines, orderOnly), 'saved')
  assert.deepEqual(calls, ['order'])
  const boom = async () => { throw Object.assign(new Error('fk'), { code: '23503' }) }
  await assert.rejects(persistOrderWithLineItems([{}], boom, orderOnly), /fk/)
  assert.equal(await persistOrderWithLineItems([{}], async () => 'both', orderOnly), 'both')
})

test('006 order_line_items is additive, keyed per order line, and plans after 005', async () => {
  const forward = new URL('../migrations/forward/', import.meta.url)
  const file = await readFile(new URL('006_order_line_items.json', forward), 'utf8')
  const migration = JSON.parse(file)
  assert.equal(migration.id, '006_order_line_items')
  assert.equal(migration.statements.length, 1)
  const [table] = migration.statements
  assert.doesNotMatch(table, /;|\b(?:DROP|TRUNCATE|UPDATE|ALTER)\b|\bDELETE\b(?! RESTRICT)/i)
  assert.match(table, /^CREATE TABLE IF NOT EXISTS public\.order_line_items /)
  assert.match(table, /order_id TEXT NOT NULL REFERENCES public\.orders \(order_id\) ON DELETE RESTRICT/)
  assert.match(table, /PRIMARY KEY \(order_id, line_index\)/)
  assert.match(table, /kind TEXT NOT NULL CHECK \(kind IN \('product','shipping','tax'\)\)/)
  for (const col of ['product_id TEXT', 'size_label TEXT', 'name TEXT NOT NULL', 'quantity INTEGER NOT NULL',
    'unit_amount_cents INTEGER NOT NULL', 'currency TEXT NOT NULL']) assert.ok(table.includes(col), col)

  const ids = ['003_payment_delivery_foundation', '004_printify_orders', '005_admin_auth_hardening']
  const earlier = await Promise.all(ids.map(async id => {
    const text = await readFile(new URL(id + '.json', forward), 'utf8')
    return { ...JSON.parse(text), checksum: migrationChecksum(text) }
  }))
  const baseline = { id: BASELINE_ID, statements: ['SELECT 1'], checksum: migrationChecksum('frozen legacy baseline') }
  const m006 = { ...migration, checksum: migrationChecksum(file) }
  const applied = [baseline, ...earlier].map(m => ({ version: m.id, checksum: m.checksum }))
  assert.deepEqual(planMigrations([m006, ...earlier, baseline], applied), [m006])
})
