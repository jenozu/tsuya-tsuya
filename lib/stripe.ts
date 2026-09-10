import Stripe from 'stripe'

let cachedStripe: Stripe | null = null

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
  }
  if (!cachedStripe) {
    cachedStripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  }
  return cachedStripe
}

// Lazy proxy: avoid build-time failure when env vars are unavailable
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripeClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export async function createPaymentIntent(
  amount: number,
  currency: string = 'usd',
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    })
    
    return paymentIntent
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw error
  }
}

export async function updatePaymentIntent(
  paymentIntentId: string,
  updates: {
    amount?: number
    metadata?: Record<string, string>
  }
): Promise<Stripe.PaymentIntent> {
  try {
    const updateData: Stripe.PaymentIntentUpdateParams = {}
    
    if (updates.amount !== undefined) {
      updateData.amount = Math.round(updates.amount * 100)
    }
    
    if (updates.metadata) {
      updateData.metadata = updates.metadata
    }
    
    const paymentIntent = await stripe.paymentIntents.update(
      paymentIntentId,
      updateData
    )
    
    return paymentIntent
  } catch (error) {
    console.error('Error updating payment intent:', error)
    throw error
  }
}

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }
  
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
    
    return event
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw error
  }
}

export async function retrievePaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return paymentIntent
  } catch (error) {
    console.error('Error retrieving payment intent:', error)
    throw error
  }
}

export async function cancelPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId)
    return paymentIntent
  } catch (error) {
    console.error('Error canceling payment intent:', error)
    throw error
  }
}
