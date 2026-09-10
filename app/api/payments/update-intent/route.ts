import { NextResponse } from 'next/server'
import { updatePaymentIntent } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const { paymentIntentId, orderId, email, amount } = await request.json()
    
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      )
    }
    
    const updates: any = {}
    
    if (amount !== undefined) {
      updates.amount = amount
    }
    
    if (orderId || email) {
      updates.metadata = {}
      if (orderId) updates.metadata.orderId = orderId
      if (email) updates.metadata.email = email
    }
    
    const paymentIntent = await updatePaymentIntent(paymentIntentId, updates)
    
    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
      },
    })
  } catch (error) {
    console.error('Error updating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to update payment intent' },
      { status: 500 }
    )
  }
}
