import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'

interface ShippingAddressPayload {
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
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
      successUrl,
      cancelUrl,
    } = body as {
      items: Array<{ id: string; name: string; price: number; quantity: number; imageUrl?: string }>
      subtotal: number
      shipping: number
      tax: number
      country: string
      state?: string
      shipping_address: ShippingAddressPayload
      email?: string
      successUrl?: string
      cancelUrl?: string
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

    const origin = request.headers.get('origin') || request.nextUrl?.origin || ''
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`

    const MAX_URL_LENGTH = 2048

    const buildSafeUrl = (rawUrl: string | undefined, fallbackBase: string) => {
      const candidate = rawUrl && typeof rawUrl === 'string' ? rawUrl : fallbackBase

      if (candidate.length <= MAX_URL_LENGTH) {
        return candidate
      }

      try {
        const parsed = new URL(candidate)
        const baseOnly = `${parsed.origin}${parsed.pathname}`
        if (baseOnly.length <= MAX_URL_LENGTH) {
          return baseOnly
        }
      } catch {
        // ignore parse errors and fall back below
      }

      if (fallbackBase.length <= MAX_URL_LENGTH) {
        return fallbackBase
      }

      return fallbackBase.slice(0, MAX_URL_LENGTH)
    }

    const defaultSuccessBase = origin ? `${origin}/thank-you` : '/thank-you'
    const defaultCancelBase = origin ? `${origin}/checkout` : '/checkout'

    const successWithOrder = `${defaultSuccessBase}?orderId=${encodeURIComponent(orderId)}`

    const success = buildSafeUrl(successUrl ?? successWithOrder, defaultSuccessBase)
    const cancel = buildSafeUrl(cancelUrl, defaultCancelBase)

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
      addr_city: (addr.city ?? '').slice(0, 500),
      addr_state: (addr.state ?? '').slice(0, 500),
      addr_postalCode: (addr.postalCode ?? '').slice(0, 500),
      addr_country: (addr.country ?? '').slice(0, 500),
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
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout URL' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url, sessionId: session.id, orderId })
  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
