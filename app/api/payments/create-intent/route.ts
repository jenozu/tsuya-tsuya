import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createPaymentIntent } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, currency = 'usd', metadata } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    console.log('[create-intent] Creating payment intent:', { amount, currency, metadata })

    const paymentIntent = await createPaymentIntent(amount, currency, metadata)

    console.log('[create-intent] Success:', paymentIntent.id)

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('[create-intent] Stripe error:', {
        type: error.type,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      })
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode || 500 }
      )
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[create-intent] Unexpected error:', message, error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
