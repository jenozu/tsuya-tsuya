import { TAX_RATES_BY_COUNTRY, TAX_RATES_BY_STATE, DEFAULT_TAX_RATE_PERCENT } from './tax-rates.ts'

/**
 * Get tax rate percent for a country (and optional state).
 * State overrides country when present in TAX_RATES_BY_STATE.
 * Apply to (subtotal + shipping) or subtotal only as you prefer.
 */
// Existing configured overrides are country-specific. Never apply a US
// state rate to a Canadian or overseas address (or vice versa).
const CANADIAN_PROVINCES = new Set(['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE'])
const US_STATE_OVERRIDES = new Set(['CA', 'NY', 'TX', 'WA', 'FL'])

export function getTaxRatePercent(countryCode: string, stateCode?: string): number {
  const country = (countryCode || '').toUpperCase().trim()
  const state = (stateCode || '').toUpperCase().trim()

  if (((country === 'CA' && CANADIAN_PROVINCES.has(state)) ||
       (country === 'US' && US_STATE_OVERRIDES.has(state))) &&
      TAX_RATES_BY_STATE[state] !== undefined) {
    return TAX_RATES_BY_STATE[state]
  }
  if (country && TAX_RATES_BY_COUNTRY[country] !== undefined) {
    return TAX_RATES_BY_COUNTRY[country]
  }
  return DEFAULT_TAX_RATE_PERCENT
}

/**
 * Compute tax amount from a taxable amount (e.g. subtotal + shipping).
 */
export function computeTaxAmount(taxableAmount: number, countryCode: string, stateCode?: string): number {
  const rate = getTaxRatePercent(countryCode, stateCode)
  return Math.round(taxableAmount * (rate / 100) * 100) / 100
}
