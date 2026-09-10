import { NextResponse } from 'next/server'
import { getStandardShippingForCountryAndQuantity } from '@/lib/shipping'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country') ?? ''
    const quantityParam = searchParams.get('quantity')
    const quantity = quantityParam ? Math.max(1, parseInt(quantityParam, 10) || 1) : 1
    const price = getStandardShippingForCountryAndQuantity(country, quantity)
    return NextResponse.json({ price })
  } catch (error) {
    console.error('Error fetching shipping rate:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shipping rate' },
      { status: 500 }
    )
  }
}
