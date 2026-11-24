import assert from 'node:assert/strict'
import { test } from 'node:test'
import profile from '../config/shipping-profile.json' with { type: 'json' }
import { getTaxRatePercent, getConfiguredTaxRatePercent, computeTaxAmount, taxFromRate } from '../lib/tax.ts'
import { TAX_COLLECTION_ENABLED } from '../lib/tax-rates.ts'
import {
  getStandardShippingRate,
  getStandardShippingForCountryAndQuantity,
  getShippingDeliveryWindow,
  getSupportedShippingDestinations,
  isSupportedShippingDestination,
} from '../lib/shipping.ts'

test('keeps existing provisional Canadian, US and overseas rate tables within their country (not charged at launch)', () => {
  assert.equal(getConfiguredTaxRatePercent('CA', 'ON'), 13)
  assert.equal(getConfiguredTaxRatePercent('ca', 'QC'), 14.975)
  assert.equal(getConfiguredTaxRatePercent('US', 'NY'), 8.875)
  assert.equal(getConfiguredTaxRatePercent('GB', 'CA'), 20)
  assert.equal(getConfiguredTaxRatePercent('US', 'ON'), 0)
  assert.equal(getConfiguredTaxRatePercent('CA', 'NY'), 5)
})

test('calculates taxable amount with cent-level rounding', () => {
  assert.equal(taxFromRate(100, 20), 20)
  assert.equal(taxFromRate(100.01, 13), 13)
  assert.equal(taxFromRate(10, 8.875), 0.89)
})

test('launch collects no tax anywhere while TAX_COLLECTION_ENABLED is false (task 42, 2026-11-24)', () => {
  assert.equal(TAX_COLLECTION_ENABLED, false)
  for (const [country, state] of [['US', 'NY'], ['US', 'CA'], ['US', 'TX'], ['US', 'WA'], ['US', 'FL'], ['US', 'OR'], ['CA', 'ON'], ['CA', 'QC'], ['CA', 'AB'], ['GB', ''], ['DE', '']]) {
    assert.equal(getTaxRatePercent(country, state), 0, `${country}-${state}`)
    assert.equal(computeTaxAmount(125.5, country, state), 0, `${country}-${state}`)
  }
})

test('canonical JSON shipping profile uses owner-approved first-item rates and +$2.99 additional items', () => {
  assert.equal(getStandardShippingForCountryAndQuantity('US', 5), 0)
  assert.equal(getStandardShippingForCountryAndQuantity('CA', 1), 9.99)
  assert.equal(getStandardShippingForCountryAndQuantity('ca', 3), 15.97)
})

test('unsupported countries fail closed instead of silently using a fallback', () => {
  assert.equal(getStandardShippingForCountryAndQuantity('CA', Number.NaN), 9.99)
  assert.equal(getStandardShippingForCountryAndQuantity('CA', Infinity), 9.99)
  assert.equal(getStandardShippingForCountryAndQuantity('CA', 0), 9.99)
  assert.equal(getStandardShippingRate('constructor'), null)
  assert.equal(getStandardShippingRate('ZZ'), null)
  assert.equal(isSupportedShippingDestination('ZZ'), false)
})

test('launch scope is United States and Canada only (task 41, 2026-11-24)', () => {
  const destinations = getSupportedShippingDestinations()
  assert.deepEqual(destinations.map(item => item.countryCode).sort(), ['CA', 'US'])
  for (const code of ['GB', 'DE', 'FR', 'ES', 'AU', 'NO', 'CH', 'UA', 'MX']) {
    assert.equal(isSupportedShippingDestination(code), false, code)
    assert.equal(getStandardShippingRate(code), null, code)
    assert.equal(getStandardShippingForCountryAndQuantity(code, 1), null, code)
    assert.equal(getShippingDeliveryWindow(code), null, code)
  }
  assert.equal(getStandardShippingForCountryAndQuantity('US', 1), 0)
  assert.equal(getStandardShippingForCountryAndQuantity('CA', 1), 9.99)
  assert.equal(getStandardShippingForCountryAndQuantity('CA', 2), 12.98)
})

test('disabled destinations stay in the profile with valid rate groups so enabling one later is a move, not a rebuild', () => {
  const rates = profile.rates
  const enabled = new Set(profile.destinations.map(row => row[0]))
  assert.ok(profile.disabledDestinations.length >= 50)
  for (const [code, name, rateKey] of profile.disabledDestinations) {
    assert.ok(rates[rateKey], `${code} references unknown rate group ${rateKey}`)
    assert.ok(name)
    assert.equal(enabled.has(code), false, `${code} is both enabled and disabled`)
  }
  const codes = profile.disabledDestinations.map(row => row[0])
  assert.equal(new Set(codes).size, codes.length)
})

test('destination list and delivery windows come from the same profile', () => {
  const destinations = getSupportedShippingDestinations()
  assert.equal(destinations.length, 2)
  assert.ok(destinations.some(item => item.countryCode === 'US' && item.country === 'United States'))
  assert.ok(destinations.some(item => item.countryCode === 'CA' && item.country === 'Canada'))
  assert.deepEqual(getShippingDeliveryWindow('CA'), [2, 5])
  assert.equal(getShippingDeliveryWindow('ZZ'), null)
})
