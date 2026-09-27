import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkoutEmailSchema, shippingAddressSchema, checkoutRequestSchema } from '../lib/checkout-schema.ts'

const address = {
  firstName: 'A', lastName: 'B', address: '123 Test St', city: 'Toronto',
  state: 'ON', postalCode: 'M1M 1M1', country: 'CA',
}

test('validates ordinary international address shape without choosing destination policy', () => {
  assert.equal(shippingAddressSchema.safeParse(address).success, true)
  assert.equal(shippingAddressSchema.safeParse({ ...address, country: 'ZZ' }).success, true)
})

test('rejects malformed email, country format, short street or missing required fields', () => {
  assert.equal(checkoutEmailSchema.safeParse('customer@example.com').success, true)
  for (const email of ['bad', 'no@@example.com', '']) {
    assert.equal(checkoutEmailSchema.safeParse(email).success, false)
  }
  for (const value of [
    { ...address, country: '../../../' },
    { ...address, country: 'USA' },
    { ...address, address: 'x' },
    { ...address, postalCode: '' },
    { ...address, state: '' },
  ]) assert.equal(shippingAddressSchema.safeParse(value).success, false)
})

test('shared checkout request refuses malformed quantity, totals and address', () => {
  const body = {
    items: [{ id: 'product-id', quantity: 1, sizeLabel: '8" x 10"' }],
    subtotal: 12.50, shipping: 0, tax: 0, email: 'buyer@example.com',
    shipping_address: address,
  }
  assert.equal(checkoutRequestSchema.safeParse(body).success, true)
  for (const patch of [
    { items: [{ id: 'product-id', quantity: 0 }] },
    { items: [] },
    { tax: -1 },
    { subtotal: Number.NaN },
    { shipping_address: { ...address, country: 'USA' } },
  ]) assert.equal(checkoutRequestSchema.safeParse({ ...body, ...patch }).success, false)
})
