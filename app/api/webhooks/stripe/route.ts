import { PUBLIC_API_FAILURE } from '@/lib/public-api-failure'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { reportServerError, reportServerInfo } from '@/lib/safe-server-log'
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
      phone?: string | null
      address?: {
        line1?: string | null
        line2?: string | null
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
          product?: { name?: string; metadata?: Record<string, string> }
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

  const orderId = session.metadata?.orderId || `ORD-${session.id.slice(-7).toUpperCase()}`
  const email =
    session.customer_details?.email ||
    session.customer_email ||
    session.metadata?.email

  if (!email) {
    throw new Error('Stripe Checkout Session is missing a customer email')
  }

  if (session.payment_status && session.payment_status !== 'paid') {
    reportServerInfo('stripe.checkout.deferred_pending_payment')
    return
  }

  const existing = await getOrder(orderId)
  if (existing?.payment_status === 'paid') {
    reportServerInfo('stripe.checkout.already_processed')
    return
  }

  const meta = session.metadata || {}
  const hasMetaAddress = Boolean(meta.addr_country)
  const shippingAddress = hasMetaAddress
    ? {
        firstName: meta.addr_firstName ?? '',
        lastName: meta.addr_lastName ?? '',
        address: meta.addr_address ?? '',
        addressLine2: meta.addr_address2 ?? '',
        unitNumber: meta.addr_unit ?? '',
        city: meta.addr_city ?? '',
        state: meta.addr_state ?? '',
        postalCode: meta.addr_postalCode ?? '',
        country: meta.addr_country ?? '',
        phone: meta.phone ?? '',
      }
    : (() => {
        const addr = session.customer_details?.address
        const nameParts = (session.customer_details?.name || '').split(' ')
        return {
          firstName: nameParts[0] || 'Customer',
          lastName: nameParts.slice(1).join(' '),
          address: addr?.line1 || '',
          addressLine2: addr?.line2 || '',
          unitNumber: '',
          city: addr?.city || '',
          state: addr?.state || '',
          postalCode: addr?.postal_code || '',
          country: addr?.country || '',
          phone: session.customer_details?.phone || '',
        }
      })()

  const lineItems = session.line_items?.data || []
  const productLineItems = lineItems.filter((li) => {
    if (!li.price || li.price.recurring) return false
    const name = li.price.product?.name ?? li.description ?? ''
    return name !== 'Shipping' && name !== 'Tax'
  })

  const items = productLineItems.map((li) => ({
    productId: li.price?.product?.metadata?.productId ?? '',
    productName: li.price?.product?.name ?? li.description ?? 'Item',
    quantity: li.quantity ?? 1,
    price: (li.price?.unit_amount ?? 0) / 100,
    selectedSize: li.price?.product?.metadata?.sizeLabel || undefined,
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
    throw new Error('Could not persist paid checkout order')
  }

  const confirmationSent = await sendOrderConfirmation(email, orderId, created)
  const notificationSent = await sendOrderNotification(orderId, created)

  reportServerInfo(confirmationSent && notificationSent ? 'stripe.checkout.processing_complete' : 'stripe.checkout.processing_complete_email_incomplete')
}

export async function POST(request: Request) {
  let body: string
  try {
    body = await request.text()
  } catch {
    reportServerError('stripe.webhook.request_read_failure')
    return NextResponse.json({ error: PUBLIC_API_FAILURE.webhookRequest }, {
      status: 400, headers: { 'Cache-Control': 'no-store' },
    })
  }
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    reportServerError('stripe.webhook.signature_missing')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = verifyWebhookSignature(body, signature)
  } catch {
    reportServerError('stripe.webhook.invalid_signature')
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: PUBLIC_API_FAILURE.webhook }, {
        status: 500, headers: { 'Cache-Control': 'no-store' },
      })
    }
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    reportServerInfo('stripe.webhook.received')

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
            reportServerInfo('stripe.webhook.order_marked_paid')
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
          reportServerError('stripe.webhook.checkout_session_missing')
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const { orderId } = paymentIntent.metadata

        if (!orderId) {
          reportServerError('stripe.webhook.failed_payment_order_reference_missing')
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
        reportServerInfo('stripe.webhook.event_ignored')
    }

    return NextResponse.json({ received: true })
  } catch {
    reportServerError('stripe.webhook.processing_failure')
    return NextResponse.json({ error: PUBLIC_API_FAILURE.webhook }, {
      status: 500, headers: { 'Cache-Control': 'no-store' },
    })
  }
}
