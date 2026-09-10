/**
 * Standard shipping rates by country (Printify standard shipping).
 * Uses first-item + additional-item pricing from gemini/tsuyanouchi/shipping docs.
 * USA = free. Other countries: firstItem + (quantity - 1) * additionalItem.
 * Ranges use the high end so we don't undercharge.
 */
export interface StandardShippingRate {
  firstItem: number
  additionalItem: number
}

const DEFAULT_REST_OF_WORLD: StandardShippingRate = {
  firstItem: 24.99,
  additionalItem: 5.99,
}

/** Per-country standard shipping: first item and each additional item (USD). */
const STANDARD_SHIPPING_BY_COUNTRY: Record<string, StandardShippingRate> = {
  US: { firstItem: 0, additionalItem: 0 },
  CA: { firstItem: 9.99, additionalItem: 2.5 },
  GB: { firstItem: 10.89, additionalItem: 5.29 },
  AU: { firstItem: 20.99, additionalItem: 6.09 },
  JP: { firstItem: 18.99, additionalItem: 5.5 },
  AT: { firstItem: 10.89, additionalItem: 5.29 },
  BE: { firstItem: 10.89, additionalItem: 5.29 },
  FR: { firstItem: 10.89, additionalItem: 5.29 },
  DE: { firstItem: 10.89, additionalItem: 5.29 },
  IE: { firstItem: 10.89, additionalItem: 5.29 },
  IT: { firstItem: 10.89, additionalItem: 5.29 },
  NL: { firstItem: 10.89, additionalItem: 5.29 },
  ES: { firstItem: 10.89, additionalItem: 5.29 },
  SE: { firstItem: 10.89, additionalItem: 5.29 },
  CH: { firstItem: 18.39, additionalItem: 5.39 },
  NO: { firstItem: 18.39, additionalItem: 5.39 },
  DK: { firstItem: 18.39, additionalItem: 5.39 },
  FI: { firstItem: 18.39, additionalItem: 5.39 },
  IS: { firstItem: 18.39, additionalItem: 5.39 },
  LI: { firstItem: 18.39, additionalItem: 5.39 },
  LV: { firstItem: 14.39, additionalItem: 5.39 },
  LT: { firstItem: 14.39, additionalItem: 5.39 },
  EE: { firstItem: 14.39, additionalItem: 5.39 },
}

/**
 * Returns the standard shipping rate (first item + additional item) for a country.
 * Unknown countries return DEFAULT_REST_OF_WORLD.
 */
export function getStandardShippingRate(countryCode: string): StandardShippingRate {
  if (!countryCode || typeof countryCode !== 'string') {
    return DEFAULT_REST_OF_WORLD
  }
  const code = countryCode.toUpperCase().trim()
  if (code in STANDARD_SHIPPING_BY_COUNTRY) {
    return STANDARD_SHIPPING_BY_COUNTRY[code]
  }
  return DEFAULT_REST_OF_WORLD
}

/**
 * Returns total standard shipping in USD for the given country and item quantity.
 * Formula: firstItem + (quantity - 1) * additionalItem, with quantity >= 1.
 */
export function getStandardShippingForCountryAndQuantity(
  countryCode: string,
  quantity: number
): number {
  const q = Math.max(1, Math.floor(quantity))
  const rate = getStandardShippingRate(countryCode)
  return rate.firstItem + (q - 1) * rate.additionalItem
}

/**
 * Returns the standard shipping price for one item (backward compatibility).
 * Prefer getStandardShippingForCountryAndQuantity when you have quantity.
 */
export function getStandardShippingForCountry(countryCode: string): number {
  return getStandardShippingForCountryAndQuantity(countryCode, 1)
}
