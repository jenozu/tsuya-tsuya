import { NextResponse } from 'next/server'
import { getSupportedShippingDestinations } from '@/lib/shipping'

export async function GET() {
  return NextResponse.json({
    currency: 'USD',
    destinations: getSupportedShippingDestinations(),
  }, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
  })
}
