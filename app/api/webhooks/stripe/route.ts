import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { verifyWebhookSignature, stripe } from '@/lib/stripe'
import { updateOrderStatus, getOrder, createOrder } from '@/lib/supabase-helpers'
import { sendOrderConfirmation, sendOrderNotification } from '@/lib/email'

export const runtime = 'nodejs'

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
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    console.log('Received Stripe webhook:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          id: string
          metadata?: Record<string, string>
          customer_details?: {
            email?: string
            name?: string
            address?: {
              line1?: string
              city?: string
              state?: string
              postal_code?: string
              country?: string
            }
          }
          amount_total?: number
        }
        const orderId = session.metadata?.orderId || `ORD-${session.id}`
        const email = session.customer_details?.email
        if (!email) {
          console.error('No email on checkout.session.completed')
          break
        }
        const meta = session.metadata || {}
        const hasMetaAddress = meta.addr_country != null && meta.addr_country !== ''
        const shipping_address = hasMetaAddress
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
              return {
                firstName: (session.customer_details?.name || '').split(' ')[0] || 'Customer',
                lastName: (session.customer_details?.name || '').split(' ').slice(1).join(' ') || '',
                address: addr?.line1 || '',
                city: addr?.city || '',
                state: addr?.state || '',
                postalCode: addr?.postal_code || '',
                country: addr?.country || '',
              }
            })()
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items.data.price.product'],
        })
        const fs = fullSession as {
          line_items?: {
            data: Array<{
              quantity: number
              amount_total?: number
              price?: {
                unit_amount?: number
                product?: { name?: string }
                recurring?: unknown
              }
              description?: string
            }>
          }
          amount_total?: number
          amount_subtotal?: number
          total_details?: { amount_tax?: number; amount_shipping?: number }
          payment_intent?: string
        }
        const lineItems = fs.line_items?.data || []
        const productLineItems = lineItems.filter((li) => {
          if (!li.price || (li.price as { recurring?: unknown }).recurring) return false
          const name =
            (li.price as { product?: { name?: string } })?.product?.name ??
            (li as { description?: string }).description ??
            ''
          return name !== 'Shipping' && name !== 'Tax'
        })
        const items = productLineItems.map((li) => ({
          productId: '',
          productName:
            (li.price as { product?: { name?: string } })?.product?.name ??
            (li as { description?: string }).description ??
            'Item',
          quantity: li.quantity ?? 1,
          price: ((li.price as { unit_amount?: number })?.unit_amount ?? 0) / 100,
          imageUrl: undefined,
        }))
        let amountShipping = (fs.total_details?.amount_shipping ?? 0) / 100
        let amountTax = (fs.total_details?.amount_tax ?? 0) / 100
        if (amountShipping === 0 || amountTax === 0) {
          for (const li of lineItems) {
            const name =
              (li.price as { product?: { name?: string } })?.product?.name ??
              (li as { description?: string }).description ??
              ''
            const amt = (li.amount_total ?? 0) / 100
            if (name === 'Shipping') amountShipping = amt
            if (name === 'Tax') amountTax = amt
          }
        }
        const amountTotal = fs.amount_total ?? 0
        const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
        const total = amountTotal / 100
        await createOrder({
          order_id: orderId,
          email,
          items,
          subtotal,
          taxes: amountTax,
          shipping: amountShipping,
          total,
          status: 'processing',
          shipping_address,
          payment_intent_id: fs.payment_intent ?? undefined,
          payment_status: 'paid',
          payment_method: 'stripe_checkout',
        })
        const order = await getOrder(orderId)
        if (order) {
          try {
            await sendOrderConfirmation(email, orderId, order)
            await sendOrderNotification(orderId, order)
          } catch (emailError) {
            console.error('Email error after checkout.session.completed:', emailError)
          }
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        const { orderId, email } = paymentIntent.metadata

        if (!orderId) {
          console.error('No orderId in payment intent metadata')
          break
        }

        console.log('Payment succeeded for order:', orderId)

        const updated = await updateOrderStatus(orderId, 'processing', 'paid')

        if (updated) {
          console.log('Order status updated successfully')

          const order = await getOrder(orderId)
          if (order && email) {
            try {
              await sendOrderConfirmation(email, orderId, order)
              await sendOrderNotification(orderId, order)
              console.log('Email notifications sent successfully')
            } catch (emailError) {
              console.error('Error sending email notifications:', emailError)
            }
          }
        } else {
          console.error('Failed to update order status')
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        const { orderId } = paymentIntent.metadata

        if (!orderId) {
          console.error('No orderId in payment intent metadata')
          break
        }

        console.log('Payment failed for order:', orderId)

        await updateOrderStatus(orderId, 'failed', 'failed')

        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object
        const { orderId } = paymentIntent.metadata

        if (orderId) {
          console.log('Payment canceled for order:', orderId)
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
