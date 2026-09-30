import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createProductSchema,
  updateProductSchema,
  normalizedProductFields,
  productSizesSchema,
  validProductImageField,
} from '../lib/product-validation.ts'

const base = {
  name: 'Cherry blossoms',
  category: 'Art Prints',
  price: 19.99,
  stock: 4,
  sizes: [{ label: '8" x 10"', price: 19.99, cost: 0 }],
}

test('accepts canonical admin payloads and normalizes legacy image alias', () => {
  const parsed = createProductSchema.parse({ ...base, imageUrl: 'https://images.example.test/print.png' })
  assert.equal(normalizedProductFields(parsed).image_url, 'https://images.example.test/print.png')
  assert.deepEqual(normalizedProductFields(parsed).sizes, base.sizes)
})

test('rejects invalid money, stock, price, and unexpected product fields', () => {
  for (const price of [NaN, -1, 1.001, Infinity]) {
    assert.equal(createProductSchema.safeParse({ ...base, price }).success, false)
  }
  for (const stock of [-1, 1.5, Infinity, '5']) {
    assert.equal(createProductSchema.safeParse({ ...base, stock }).success, false)
  }
  assert.equal(createProductSchema.safeParse({ ...base, admin: true }).success, false)
  assert.equal(createProductSchema.safeParse({ ...base, price: 0, sizes: [] }).success, false)
})

test('enforces supported unique sizes, private availability and valid variant price precision', () => {
  assert.equal(productSizesSchema.safeParse([{ label: '8" x 10"', price: 1.01, available: false }]).success, true)
  assert.equal(productSizesSchema.safeParse([{ label: '8" x 10"', price: 1.01, available: 'false' }]).success, false)
  assert.equal(productSizesSchema.safeParse([{ label: 'unsupported', price: 1.01 }]).success, false)
  assert.equal(productSizesSchema.safeParse([{ label: '8" x 10"', price: 0 }]).success, false)
  assert.equal(productSizesSchema.safeParse([{ label: '8" x 10"', price: 1.999 }]).success, false)
  assert.equal(productSizesSchema.safeParse([
    { label: '8" x 10"', price: 10 },
    { label: '8" x 10"', price: 10 },
  ]).success, false)
})

test('rejects arbitrary external image protocols, spoofed JSON, and open credentials', () => {
  for (const image of ['http://x.test/a.png', 'javascript:alert(1)', '//evil.test/a.png',
    'https://u:p@example.test/a.png', '["https://valid.test/ok.png","http://bad.test/no.png"]', '[]']) {
    assert.equal(validProductImageField(image), false, image)
  }
  assert.equal(validProductImageField('["https://cdn.test/a.png","/product-placeholder.svg"]'), true)
})

test('patch schema denies mass-assignment and invalid partial updates', () => {
  assert.equal(updateProductSchema.safeParse({ stock: 0 }).success, true)
  assert.equal(updateProductSchema.safeParse({ stock: '0' }).success, false)
  assert.equal(updateProductSchema.safeParse({}).success, false)
  assert.equal(updateProductSchema.safeParse({ payment_status: 'paid' }).success, false)
})

test('create and patch reject conflicting image aliases rather than silently choosing one', () => {
  const conflict = {
    image_url: 'https://a.example.test/print.png',
    imageUrl: 'https://b.example.test/print.png',
  }
  assert.equal(createProductSchema.safeParse({ ...base, ...conflict }).success, false)
  assert.equal(updateProductSchema.safeParse(conflict).success, false)
  assert.equal(updateProductSchema.safeParse({
    image_url: 'https://a.example.test/print.png',
    imageUrl: 'https://a.example.test/print.png',
  }).success, true)
})

test('product sizes reject unknown fields, duplicate labels and oversized selections', () => {
  const valid = { label: '8" x 10"', price: 11.25, cost: 0 }
  assert.equal(productSizesSchema.safeParse([{ ...valid, admin: true }]).success, false)
  assert.equal(productSizesSchema.safeParse(Array.from({ length: 9 }, () => valid)).success, false)
  assert.equal(productSizesSchema.safeParse([{ ...valid, price: 1000000.01 }]).success, false)
  assert.equal(productSizesSchema.safeParse([{ ...valid, cost: -1 }]).success, false)
})

test('create accepts explicitly priced variants with zero baseline but rejects malformed fields', () => {
  assert.equal(createProductSchema.safeParse({ ...base, price: 0 }).success, true)
  for (const invalid of [
    { category: ' ' },
    { name: '' },
    { stock: 1_000_001 },
    { product_type: '4-piece' },
    { description: 'x'.repeat(10_001) },
    { sizes: [{ label: 'unknown', price: 10 }] },
    { image_url: 'javascript:alert(1)' },
  ]) {
    assert.equal(createProductSchema.safeParse({ ...base, ...invalid }).success, false,
      JSON.stringify(Object.keys(invalid)))
  }
})

test('partial patch accepts zero stock and explicit cost removal, rejects mass assignment', () => {
  assert.equal(updateProductSchema.safeParse({ stock: 0, cost: null }).success, true)
  for (const patch of [
    { id: 'forged-id' }, { order_id: 'fake-order' }, { payment_status: 'paid' },
    { sizes: [{ label: '8" x 10"', price: '10.50' }] },
    { stock: Number.POSITIVE_INFINITY },
    { price: -0.01 },
  ]) {
    assert.equal(updateProductSchema.safeParse(patch).success, false, JSON.stringify(patch))
  }
})
