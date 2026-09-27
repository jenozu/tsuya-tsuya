import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { trustedCheckoutReturnUrls } from '@/lib/checkout-redirects'

export const runtime = 'nodejs'

interface ShippingAddressPayload {
  firstName: string
  lastName: string
  address: string
  addressLine2?: string
  unitNumber?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone?: string
}

function createShortOrderId(): string {
  const max = 36 ** 7
  const code = randomInt(0, max).toString(36).toUpperCase().padStart(7, '0')
  return `ORD-${code}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      items,
      subtotal,
      shipping,
      tax,
      country,
      state,
      shipping_address,
      email,
    } = body as {
      items: Array<{ id: string; name: string; price: number; quantity: number; imageUrl?: string }>
      subtotal: number
      shipping: number
      tax: number
      country: string
      state?: string
      shipping_address: ShippingAddressPayload
      email?: string
    }

    if (!items?.length) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 })
    }

    if (typeof subtotal !== 'number' || typeof shipping !== 'number' || typeof tax !== 'number') {
      return NextResponse.json({ error: 'Missing or invalid subtotal, shipping, or tax' }, { status: 400 })
    }

    if (!shipping_address || typeof shipping_address !== 'object') {
      return NextResponse.json({ error: 'Missing shipping_address' }, { status: 400 })
    }

    const orderId = createShortOrderId()
    const { success, cancel } = trustedCheckoutReturnUrls(orderId, {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      siteUrl: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL,
      requestOrigin: request.nextUrl.origin,
    })

    const STRIPE_MAX_IMAGE_URL = 2048
    const safeImageUrl = (url: string | undefined): string | undefined => {
      if (!url || typeof url !== 'string') return undefined
      if (url.length <= STRIPE_MAX_IMAGE_URL) return url
      try {
        const parsed = new URL(url)
        const base = `${parsed.origin}${parsed.pathname}`
        return base.length <= STRIPE_MAX_IMAGE_URL ? base : undefined
      } catch {
        return undefined
      }
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
      const unitAmount = Math.round((item.price ?? 0) * 100)
      const imageUrl = safeImageUrl(item.imageUrl)
      return {
        price_data: {
          currency: 'usd',
          unit_amount: unitAmount,
          product_data: {
            name: item.name,
            ...(imageUrl ? { images: [imageUrl] } : {}),
          },
        },
        quantity: item.quantity,
      }
    })

    const shippingCents = Math.round(shipping * 100)
    if (shippingCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          unit_amount: shippingCents,
          product_data: {
            name: 'Shipping',
          },
        },
        quantity: 1,
      })
    }

    const taxCents = Math.round(tax * 100)
    if (taxCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          unit_amount: taxCents,
          product_data: {
            name: 'Tax',
          },
        },
        quantity: 1,
      })
    }

    const addr = shipping_address as ShippingAddressPayload
    const metadata: Record<string, string> = {
      orderId,
      addr_firstName: (addr.firstName ?? '').slice(0, 500),
      addr_lastName: (addr.lastName ?? '').slice(0, 500),
      addr_address: (addr.address ?? '').slice(0, 500),
      addr_address2: (addr.addressLine2 ?? '').slice(0, 500),
      addr_unit: (addr.unitNumber ?? '').slice(0, 500),
      addr_city: (addr.city ?? '').slice(0, 500),
      addr_state: (addr.state ?? '').slice(0, 500),
      addr_postalCode: (addr.postalCode ?? '').slice(0, 500),
      addr_country: (addr.country ?? '').slice(0, 500),
      phone: (addr.phone ?? '').slice(0, 500),
    }

    const paymentIntentMetadata: Record<string, string> = {
      orderId,
      ...(email && typeof email === 'string' && email.includes('@') ? { email } : {}),
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      automatic_tax: { enabled: false },
      success_url: success,
      cancel_url: cancel,
      customer_creation: 'always',
      ...(email && typeof email === 'string' && email.includes('@') ? { customer_email: email } : {}),
      metadata,
      payment_intent_data: {
        metadata: paymentIntentMetadata,
      },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout URL' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url, sessionId: session.id, orderId })
  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json(
      { error: 'Unable to start checkout. Please try again.' },
      { status: 500 }
    )
  }
}
