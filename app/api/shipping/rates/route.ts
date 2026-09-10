import { NextResponse } from 'next/server'
import { getShippingRates } from '@/lib/supabase-helpers'

export async function GET() {
  try {
    const rates = await getShippingRates()
    return NextResponse.json(rates)
  } catch (error) {
    console.error('Error fetching shipping rates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shipping rates' },
      { status: 500 }
    )
  }
}
