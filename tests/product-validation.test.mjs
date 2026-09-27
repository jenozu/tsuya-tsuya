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

test('enforces supported unique sizes and valid variant price precision', () => {
  assert.equal(productSizesSchema.safeParse([{ label: '8" x 10"', price: 1.01 }]).success, true)
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
