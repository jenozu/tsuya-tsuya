/**
 * Custom tax rates by country (and optionally state).
 * Edit this file to add or change rates. Rate is a percentage (e.g. 20 = 20%).
 * Used when Stripe automatic tax is disabled; set aside collected amounts for tax remittance.
 */

/** Country code (ISO 3166-1 alpha-2) -> rate percent (e.g. 5 = 5%) */
export const TAX_RATES_BY_COUNTRY: Record<string, number> = {
  CA: 5,   // Canada GST (federal); provinces may add PST/HST - use state overrides below
  US: 0,   // US: no federal sales tax; use state overrides
  GB: 20,  // UK VAT
  AU: 10,  // Australia GST
  JP: 10,  // Japan consumption tax
  // EU countries (VAT approx.)
  AT: 20, BE: 21, BG: 20, HR: 25, CY: 19, CZ: 21, DK: 25, EE: 20, FI: 24, FR: 20,
  DE: 19, GR: 24, HU: 27, IE: 23, IT: 22, LV: 21, LT: 21, LU: 17, MT: 18, NL: 21,
  PL: 23, PT: 23, RO: 19, SK: 20, SI: 22, ES: 21, SE: 25,
  // EFTA / other Europe (from shipping docs)
  NO: 25,   // Norway
  CH: 8.1,  // Switzerland
  IS: 24,   // Iceland
  LI: 8.1,  // Liechtenstein
  MD: 20,   // Moldova
}

/** State/province code -> rate percent. Overrides country rate when present. */
export const TAX_RATES_BY_STATE: Record<string, number> = {
  // Canadian provinces (HST or GST+PST approx.)
  'ON': 13, 'BC': 12, 'AB': 5, 'QC': 14.975, 'MB': 12, 'SK': 11, 'NS': 15,
  'NB': 15, 'NL': 15, 'PE': 15,
  // US states (examples; add others as needed)
  'CA': 7.25, 'NY': 8.875, 'TX': 6.25, 'WA': 6.5, 'FL': 6,
}

/** Default rate when country (and state) not in table (percent). */
export const DEFAULT_TAX_RATE_PERCENT = 0
