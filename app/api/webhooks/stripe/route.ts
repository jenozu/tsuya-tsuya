import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { verifyWebhookSignature, stripe } from '@/lib/stripe'
import { updateOrderStatus, getOrder, createOrder } from '@/lib/data'
import { sendOrderConfirmation, sendOrderNotification } from '@/lib/email'

export const runtime = 'nodejs'

async function processCompletedCheckoutSession(sessionId: string) {
  const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price.product'],
  })

  const session = fullSession as {
    id: string
    metadata?: Record<string, string>
    customer_email?: string | null
    customer_details?: {
      email?: string | null
      name?: string | null
      address?: {
        line1?: string | null
        city?: string | null
        state?: string | null
        postal_code?: string | null
        country?: string | null
      } | null
    } | null
    payment_status?: string
    line_items?: {
      data: Array<{
        quantity: number | null
        amount_total?: number | null
        price?: {
          unit_amount?: number | null
          product?: { name?: string }
          recurring?: unknown
        } | null
        description?: string | null
      }>
    }
    amount_total?: number | null
    total_details?: {
      amount_tax?: number | null
      amount_shipping?: number | null
    } | null
    payment_intent?: string | null
  }

  const orderId = session.metadata?.orderId || `ORD-${session.id}`
  const email =
    session.customer_details?.email ||
    session.customer_email ||
    session.metadata?.email

  if (!email) {
    throw new Error(`No customer email found for Checkout Session ${session.id}`)
  }

  if (session.payment_status && session.payment_status !== 'paid') {
    console.log('Checkout Session is not paid yet:', session.id, session.payment_status)
    return
  }

  const existing = await getOrder(orderId)
  if (existing?.payment_status === 'paid') {
    console.log('Checkout Session already processed:', orderId)
    return
  }

  const meta = session.metadata || {}
  const hasMetaAddress = Boolean(meta.addr_country)
  const shippingAddress = hasMetaAddress
    ? {
        firstName: meta.addr_firstName ?? '',
        lastName: meta.addr_lastName ?? '',
        address: meta.addr_address ?? '',
        city: meta.addr_city ?? '',
        state: meta.addr_state ?? '',
        postalCode: meta.addr_postalCode ?? '',
        country: meta.addr_country ?? '',
      }
    : (() => {
        const addr = session.customer_details?.address
        const nameParts = (session.customer_details?.name || '').split(' ')
        return {
          firstName: nameParts[0] || 'Customer',
          lastName: nameParts.slice(1).join(' '),
          address: addr?.line1 || '',
          city: addr?.city || '',
          state: addr?.state || '',
          postalCode: addr?.postal_code || '',
          country: addr?.country || '',
        }
      })()

  const lineItems = session.line_items?.data || []
  const productLineItems = lineItems.filter((li) => {
    if (!li.price || li.price.recurring) return false
    const name = li.price.product?.name ?? li.description ?? ''
    return name !== 'Shipping' && name !== 'Tax'
  })

  const items = productLineItems.map((li) => ({
    productId: '',
    productName: li.price?.product?.name ?? li.description ?? 'Item',
    quantity: li.quantity ?? 1,
    price: (li.price?.unit_amount ?? 0) / 100,
    imageUrl: undefined,
  }))

  let amountShipping = (session.total_details?.amount_shipping ?? 0) / 100
  let amountTax = (session.total_details?.amount_tax ?? 0) / 100

  if (amountShipping === 0 || amountTax === 0) {
    for (const li of lineItems) {
      const name = li.price?.product?.name ?? li.description ?? ''
      const amount = (li.amount_total ?? 0) / 100
      if (name === 'Shipping') amountShipping = amount
      if (name === 'Tax') amountTax = amount
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = (session.amount_total ?? 0) / 100

  const created = await createOrder({
    order_id: orderId,
    email,
    items,
    subtotal,
    taxes: amountTax,
    shipping: amountShipping,
    total,
    status: 'processing',
    shipping_address: shippingAddress,
    payment_intent_id: session.payment_intent ?? undefined,
    payment_status: 'paid',
    payment_method: 'stripe_checkout',
  })

  if (!created) {
    throw new Error(`Failed to persist order ${orderId}`)
  }

  const confirmationSent = await sendOrderConfirmation(email, orderId, created)
  const notificationSent = await sendOrderNotification(orderId, created)

  console.log('Checkout processing complete:', {
    orderId,
    confirmationSent,
    notificationSent,
  })
}

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    console.error('No Stripe signature found')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = verifyWebhookSignature(body, signature)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Misconfigured webhook secret' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    console.log('Received Stripe webhook:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await processCompletedCheckoutSession(session.id)
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const orderId = paymentIntent.metadata?.orderId

        if (orderId) {
          const existing = await getOrder(orderId)
          if (existing) {
            await updateOrderStatus(orderId, 'processing', 'paid')
            console.log('Existing order marked paid:', orderId)
            break
          }
        }

        const sessions = await stripe.checkout.sessions.list({
          payment_intent: paymentIntent.id,
          limit: 1,
        })

        const checkoutSession = sessions.data[0]
        if (checkoutSession) {
          await processCompletedCheckoutSession(checkoutSession.id)
        } else {
          console.error('No Checkout Session found for PaymentIntent:', paymentIntent.id)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const { orderId } = paymentIntent.metadata

        if (!orderId) {
          console.error('No orderId in failed PaymentIntent metadata')
          break
        }

        await updateOrderStatus(orderId, 'failed', 'failed')
        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const { orderId } = paymentIntent.metadata

        if (orderId) {
          await updateOrderStatus(orderId, 'canceled', 'canceled')
        }
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
