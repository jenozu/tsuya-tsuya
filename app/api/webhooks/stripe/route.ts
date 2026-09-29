import { PUBLIC_API_FAILURE } from '@/lib/public-api-failure'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { reportServerError, reportServerInfo } from '@/lib/safe-server-log'
import { verifyWebhookSignature, stripe } from '@/lib/stripe'
import { getOrder, createOrder, markUnpaidOrderPaymentState, markExistingOrderPaidForIntent } from '@/lib/data'
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
  // A completed Checkout UI is not evidence of settled funds. Delayed
  // payment methods are handled by later paid-intent webhook retries.
  if (session.payment_status !== 'paid') {
    reportServerInfo('stripe.checkout.deferred_pending_payment')
    return 'deferred' as const
  }

  const email =
    session.customer_details?.email ||
    session.customer_email ||
    session.metadata?.email

  if (!email) {
    throw new Error('Paid Stripe Checkout Session is missing a customer email')
  }

  const existing = await getOrder(orderId)
  if (existing?.payment_intent_id && session.payment_intent &&
      existing.payment_intent_id !== session.payment_intent) {
    throw new Error('Checkout payment intent does not match existing order')
  }
  if (existing?.payment_status === 'paid' ||
      existing?.payment_status === 'refunded' ||
      existing?.payment_status === 'partially_refunded') {
    reportServerInfo('stripe.checkout.already_processed')
    return 'already_processed' as const
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
  return 'processed' as const
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
            if (existing.payment_intent_id && existing.payment_intent_id !== paymentIntent.id) {
              throw new Error('Payment intent does not match existing order')
            }
            if (existing.payment_status === 'paid' ||
                existing.payment_status === 'refunded' ||
                existing.payment_status === 'partially_refunded') {
              reportServerInfo('stripe.checkout.already_processed')
              break
            }
            // Conditional SQL also checks current DB state, even if a
            // concurrent webhook marks the order paid after this read.
            const updated = await markExistingOrderPaidForIntent(orderId, paymentIntent.id)
            if (!updated) throw new Error('Could not safely advance paid order')
            reportServerInfo('stripe.webhook.order_marked_paid')
            break
          }
        }

        const sessions = await stripe.checkout.sessions.list({
          payment_intent: paymentIntent.id,
          limit: 1,
        })

        const checkoutSession = sessions.data[0]
        if (!checkoutSession) {
          if (!orderId) {
            // Other, unassociated PaymentIntents may share a Stripe account.
            // With no order reference or matching Checkout Session there is
            // no evidence this payment belongs to a Tsuya purchase.
            reportServerInfo('stripe.webhook.unattributed_payment_ignored')
            break
          }
          reportServerError('stripe.webhook.checkout_session_missing')
          // Do not acknowledge a referenced paid order we cannot reconstruct.
          // Stripe should retry while an operator investigates.
          throw new Error('Paid payment has no recoverable checkout session')
        }
        const result = await processCompletedCheckoutSession(checkoutSession.id)
        if (result === 'deferred') {
          throw new Error('Paid payment checkout details are not yet ready')
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

        const outcome = await markUnpaidOrderPaymentState(orderId, paymentIntent.id, 'failed')
        if (outcome === 'error') throw new Error('Failed to record failed payment')
        if (outcome === 'protected') reportServerInfo('stripe.webhook.settled_order_preserved')
        if (outcome === 'missing') reportServerInfo('stripe.webhook.unmatched_unpaid_order')
        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const { orderId } = paymentIntent.metadata

        if (orderId) {
          const outcome = await markUnpaidOrderPaymentState(orderId, paymentIntent.id, 'canceled')
          if (outcome === 'error') throw new Error('Failed to record canceled payment')
          if (outcome === 'protected') reportServerInfo('stripe.webhook.settled_order_preserved')
          if (outcome === 'missing') reportServerInfo('stripe.webhook.unmatched_unpaid_order')
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
