import { NextResponse } from 'next/server'
import { createOrder } from '@/lib/supabase-helpers'

export async function POST(request: Request) {
  try {
    const orderData = await request.json()

    console.log('[orders] Creating order:', orderData.order_id)

    const order = await createOrder(orderData)

    if (!order) {
      console.error('[orders] createOrder returned null for:', orderData.order_id)
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    console.log('[orders] Order created successfully:', order.order_id)
    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[orders] Error creating order:', message, error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
