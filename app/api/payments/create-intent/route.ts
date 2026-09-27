import { NextResponse } from 'next/server'

// Legacy, browser-accessible amount-driven PaymentIntent creation/update is
// deliberately retired. Only the server-validated Checkout Session flow may
// initiate payments. Do not re-enable without server-side catalog price,
// inventory, destination and authorization validation.
export async function POST() {
  return NextResponse.json(
    { error: 'This payment endpoint is retired. Use Checkout instead.' },
    { status: 410 },
  )
}
