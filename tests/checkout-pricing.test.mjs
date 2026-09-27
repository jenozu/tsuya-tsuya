import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CheckoutBasketError, priceCheckoutBasket } from '../lib/checkout-pricing.ts'

const product = {
  id: 'product-1',
  name: 'Canonical product',
  description: '',
  price: 10,
  category: 'print',
  image_url: '',
  stock: 3,
  sizes: [{ label: '8 x 10', price: 12.5 }, { label: '11 x 14', price: 22 }],
}
const lookup = async id => id === product.id ? product : null

test('uses server product/variant price and identity, never caller-supplied prices', async () => {
  const priced = await priceCheckoutBasket([
    { id: 'product-1', quantity: 2, sizeLabel: '8 x 10', price: 0.01, name: 'Forged' },
  ], lookup)
  assert.equal(priced.subtotalCents, 2500)
  assert.deepEqual(priced.lines, [{
    productId: 'product-1',
    name: 'Canonical product',
    quantity: 2,
    sizeLabel: '8 x 10',
    unitCents: 1250,
  }])
})

test('rejects stale variants and non-existent products', async () => {
  await assert.rejects(
    priceCheckoutBasket([{ id: 'product-1', quantity: 1, sizeLabel: 'discontinued' }], lookup),
    CheckoutBasketError,
  )
  await assert.rejects(
    priceCheckoutBasket([{ id: 'missing', quantity: 1 }], lookup),
    CheckoutBasketError,
  )
})

test('enforces shared stock across sizes and combined repeated lines', async () => {
  await assert.rejects(
    priceCheckoutBasket([
      { id: 'product-1', quantity: 2, sizeLabel: '8 x 10' },
      { id: 'product-1', quantity: 2, sizeLabel: '11 x 14' },
    ], lookup),
    /Insufficient stock/,
  )
  const combined = await priceCheckoutBasket([
    { id: 'product-1', quantity: 1, sizeLabel: '8 x 10' },
    { id: 'product-1', quantity: 1, sizeLabel: '8 x 10' },
  ], lookup)
  assert.equal(combined.lines.length, 1)
  assert.equal(combined.lines[0].quantity, 2)
})

test('rejects malformed quantities and empty carts', async () => {
  for (const quantity of [0, -1, 0.5, 999, Number.NaN]) {
    await assert.rejects(priceCheckoutBasket([{ id: 'product-1', quantity }], lookup), CheckoutBasketError)
  }
  await assert.rejects(priceCheckoutBasket([], lookup), CheckoutBasketError)
})
