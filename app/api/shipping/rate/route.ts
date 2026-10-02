import { reportServerError } from '@/lib/safe-server-log'
import { NextResponse } from 'next/server'
import { getShippingDeliveryWindow, getStandardShippingForCountryAndQuantity } from '@/lib/shipping'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country') ?? ''
    const quantityParam = searchParams.get('quantity')
    const quantity = quantityParam ? Math.max(1, parseInt(quantityParam, 10) || 1) : 1
    const price = getStandardShippingForCountryAndQuantity(country, quantity)
    const deliveryBusinessDays = getShippingDeliveryWindow(country)
    if (price === null || deliveryBusinessDays === null) {
      return NextResponse.json({ error: 'Shipping is not available to this destination.' }, { status: 400 })
    }
    return NextResponse.json({ price, deliveryBusinessDays })
  } catch {
    reportServerError('api.shipping_rate.failure')
    return NextResponse.json(
      { error: 'Failed to fetch shipping rate' },
      { status: 500 }
    )
  }
}
