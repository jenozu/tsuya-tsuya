import { reportServerError } from '@/lib/safe-server-log'
import { NextResponse } from 'next/server'
import { getShippingRates } from '@/lib/data'
export async function GET() {
  try {
    const rates = await getShippingRates()
    return NextResponse.json(rates)
  } catch (error) {
    reportServerError('api.shipping_rates.failure')
    return NextResponse.json(
      { error: 'Failed to fetch shipping rates' },
      { status: 500 }
    )
  }
}
