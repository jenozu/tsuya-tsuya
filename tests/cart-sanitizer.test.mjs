import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateCartTotal, normalizeCart, parseStoredCart } from '../lib/cart-sanitizer.ts'

const item = {
  id: 'p1', name: 'Original print', price: 20, quantity: 2,
  imageUrl: '/product-placeholder.svg',
  selectedSize: { label: '8" x 10"', price: 15.5 },
}

test('preserves valid stored selections and computes cents-based totals', () => {
  const result = parseStoredCart(JSON.stringify([item]))
  assert.equal(result.length, 1)
  assert.equal(result[0].selectedSize.label, '8" x 10"')
  assert.equal(calculateCartTotal(result), 31)
})

test('ignores corrupted localStorage, forged prices, invalid quantities and missing variants', () => {
  assert.deepEqual(parseStoredCart('{unclosed'), [])
  const result = normalizeCart([
    null,
    { ...item, price: Infinity },
    { ...item, quantity: 0 },
    { ...item, quantity: 1.5 },
    { ...item, selectedSize: { label: '8" x 10"', price: -1 } },
    { ...item, id: 'safe', quantity: 1, imageUrl: null },
  ])
  assert.equal(result.length, 1)
  assert.equal(result[0].imageUrl, '/product-placeholder.svg')
})

test('coalesces duplicate variant lines and caps runaway quantities', () => {
  const result = normalizeCart([{ ...item, quantity: 19 }, { ...item, quantity: 19 }])
  assert.equal(result.length, 1)
  assert.equal(result[0].quantity, 20)
  assert.equal(calculateCartTotal(result), 310)
})

test('does not switch a zero-priced selected variant to base price', () => {
  const result = normalizeCart([{ ...item, selectedSize: { label: '8" x 10"', price: 0 } }])
  assert.equal(result.length, 0)
})

test('caps total lines and keeps distinct sizes separate', () => {
  const sizes = [
    { ...item, selectedSize: { label: '8" x 10"', price: 10 } },
    { ...item, selectedSize: { label: '11" x 14"', price: 20 } },
  ]
  assert.equal(normalizeCart(sizes).length, 2)
  const many = Array.from({ length: 60 }, (_, i) => ({ ...item, id: 'p' + i, quantity: 10 }))
  const limited = normalizeCart(many)
  assert.equal(limited.length, 10)
  assert.equal(limited.reduce((sum, x) => sum + x.quantity, 0), 100)
})
