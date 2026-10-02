import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getTaxRatePercent, computeTaxAmount } from '../lib/tax.ts'
import {
  getStandardShippingRate,
  getStandardShippingForCountryAndQuantity,
  getShippingDeliveryWindow,
  getSupportedShippingDestinations,
  isSupportedShippingDestination,
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

test('canonical JSON shipping profile uses owner-approved first-item rates and +$2.99 additional items', () => {
  assert.equal(getStandardShippingForCountryAndQuantity('US', 5), 0)
  assert.equal(getStandardShippingForCountryAndQuantity('CA', 1), 9.99)
  assert.equal(getStandardShippingForCountryAndQuantity('ca', 3), 15.97)
  assert.equal(getStandardShippingForCountryAndQuantity('GB', 2), 13.88)
  assert.equal(getStandardShippingForCountryAndQuantity('AU', 2), 23.98)
})

test('unsupported countries fail closed instead of silently using a fallback', () => {
  assert.equal(getStandardShippingForCountryAndQuantity('CA', Number.NaN), 9.99)
  assert.equal(getStandardShippingForCountryAndQuantity('CA', Infinity), 9.99)
  assert.equal(getStandardShippingForCountryAndQuantity('CA', 0), 9.99)
  assert.equal(getStandardShippingRate('constructor'), null)
  assert.equal(getStandardShippingRate('ZZ'), null)
  assert.equal(isSupportedShippingDestination('ZZ'), false)
})

test('destination list and delivery windows come from the same profile', () => {
  const destinations = getSupportedShippingDestinations()
  assert.ok(destinations.length >= 50)
  assert.ok(destinations.some(item => item.countryCode === 'US' && item.country === 'United States'))
  assert.ok(destinations.some(item => item.countryCode === 'CA' && item.country === 'Canada'))
  assert.deepEqual(getShippingDeliveryWindow('GB'), [2, 3])
  assert.deepEqual(getShippingDeliveryWindow('CA'), [2, 5])
  assert.deepEqual(getShippingDeliveryWindow('UA'), [10, 30])
  assert.equal(getShippingDeliveryWindow('ZZ'), null)
})
