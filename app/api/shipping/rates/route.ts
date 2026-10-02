import { NextResponse } from 'next/server'
import { getStandardShippingRate, getSupportedShippingDestinations } from '@/lib/shipping'

export async function GET() {
  const rates = getSupportedShippingDestinations().map(destination => {
    const rate = getStandardShippingRate(destination.countryCode)
    return {
      name: destination.country,
      country_code: destination.countryCode,
      price: rate?.firstItem ?? 0,
      additional_item: rate?.additionalItem ?? 0,
      delivery_min_business_days: destination.deliveryMinBusinessDays,
      delivery_max_business_days: destination.deliveryMaxBusinessDays,
    }
  })
  return NextResponse.json(rates, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
  })
}
