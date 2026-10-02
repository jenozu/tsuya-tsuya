import profile from '../config/shipping-profile.json' with { type: 'json' }

export interface StandardShippingRate {
  firstItem: number
  additionalItem: number
}

export interface ShippingDestination {
  countryCode: string
  country: string
  deliveryMinBusinessDays: number
  deliveryMaxBusinessDays: number
}

type ProfileRate = {
  firstItemUsd: number
  additionalItemUsd: number
  deliveryBusinessDays: [number, number]
}

type DestinationRow = [string, string, keyof typeof profile.rates]

const rateMap = profile.rates as unknown as Record<string, ProfileRate>
const destinationRows = profile.destinations as unknown as DestinationRow[]

const destinationMap = new Map(destinationRows.map(([countryCode, country, rateKey]) => {
  const rate = rateMap[rateKey]
  if (!rate) throw new Error('Shipping profile references an unknown rate group')
  return [countryCode, { countryCode, country, rateKey, rate }] as const
}))

export function getSupportedShippingDestinations(): ShippingDestination[] {
  return [...destinationMap.values()].map(({ countryCode, country, rate }) => ({
    countryCode,
    country,
    deliveryMinBusinessDays: rate.deliveryBusinessDays[0],
    deliveryMaxBusinessDays: rate.deliveryBusinessDays[1],
  }))
}

export function isSupportedShippingDestination(countryCode: string): boolean {
  if (typeof countryCode !== 'string') return false
  return destinationMap.has(countryCode.trim().toUpperCase())
}

export function getStandardShippingRate(countryCode: string): StandardShippingRate | null {
  if (typeof countryCode !== 'string') return null
  const destination = destinationMap.get(countryCode.trim().toUpperCase())
  if (!destination) return null
  return {
    firstItem: destination.rate.firstItemUsd,
    additionalItem: destination.rate.additionalItemUsd,
  }
}

export function getShippingDeliveryWindow(countryCode: string): [number, number] | null {
  if (typeof countryCode !== 'string') return null
  const destination = destinationMap.get(countryCode.trim().toUpperCase())
  if (!destination) return null
  return [...destination.rate.deliveryBusinessDays] as [number, number]
}

export function getStandardShippingForCountryAndQuantity(
  countryCode: string,
  quantity: number,
): number | null {
  const rate = getStandardShippingRate(countryCode)
  if (!rate) return null
  const q = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1
  return Math.round((rate.firstItem + (q - 1) * rate.additionalItem) * 100) / 100
}

export function getStandardShippingForCountry(countryCode: string): number | null {
  return getStandardShippingForCountryAndQuantity(countryCode, 1)
}
