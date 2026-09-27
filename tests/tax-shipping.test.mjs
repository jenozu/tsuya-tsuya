import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getTaxRatePercent, computeTaxAmount } from '../lib/tax.ts'
import {
  getStandardShippingRate,
  getStandardShippingForCountryAndQuantity,
} from '../lib/shipping.ts'

test('keeps existing provisional Canadian, US and overseas rates within their country', () => {
  assert.equal(getTaxRatePercent('CA', 'ON'), 13)
  assert.equal(getTaxRatePercent('ca', 'QC'), 14.975)
  assert.equal(getTaxRatePercent('US', 'NY'), 8.875)
  assert.equal(getTaxRatePercent('GB', 'CA'), 20)
  assert.equal(getTaxRatePercent('US', 'ON'), 0)
  assert.equal(getTaxRatePercent('CA', 'NY'), 5)
})

test('calculates taxable amount with cent-level rounding', () => {
  assert.equal(computeTaxAmount(100, 'GB', 'CA'), 20)
  assert.equal(computeTaxAmount(100.01, 'CA', 'ON'), 13)
  assert.equal(computeTaxAmount(10, 'US', 'NY'), 0.89)
})

test('US shipping remains free; additional-item charges use configured existing rates', () => {
  assert.equal(getStandardShippingForCountryAndQuantity('US', 5), 0)
  assert.equal(getStandardShippingForCountryAndQuantity('CA', 1), 9.99)
  assert.equal(getStandardShippingForCountryAndQuantity('ca', 3), 14.99)
})

test('malformed quantity/country never generates non-finite shipping rates', () => {
  assert.equal(getStandardShippingForCountryAndQuantity('CA', Number.NaN), 9.99)
  assert.equal(getStandardShippingForCountryAndQuantity('CA', Infinity), 9.99)
  assert.equal(getStandardShippingForCountryAndQuantity('CA', 0), 9.99)
  assert.deepEqual(getStandardShippingRate('constructor'), { firstItem: 24.99, additionalItem: 5.99 })
  assert.deepEqual(getStandardShippingRate('ZZ'), { firstItem: 24.99, additionalItem: 5.99 })
})
