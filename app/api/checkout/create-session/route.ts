import { reportServerError } from '@/lib/safe-server-log'
import { isSameOriginMutation } from '@/lib/same-origin'
import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { trustedCheckoutReturnUrls } from '@/lib/checkout-redirects'
import { priceCheckoutBasket, CheckoutBasketError } from '@/lib/checkout-pricing'
import { getProduct } from '@/lib/data'
import { getStandardShippingForCountryAndQuantity } from '@/lib/shipping'
import { computeTaxAmount } from '@/lib/tax'
import { checkoutRequestSchema } from '@/lib/checkout-schema'

export const runtime = 'nodejs'


function createShortOrderId(): string {
  const max = 36 ** 7
  const code = randomInt(0, max).toString(36).toUpperCase().padStart(7, '0')
  return `ORD-${code}`
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  try {
    // Verify the incoming structure; never accept the client's amounts as charge authority.
    const declaredLength = Number(request.headers.get('content-length') || 0)
    if (declaredLength > 32_768) {
      return NextResponse.json({ error: 'Checkout request is too large.' }, { status: 413 })
    }
    const parsed = checkoutRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Please check your checkout details.' }, { status: 400 })
    }
    const { items, subtotal, shipping, tax, shipping_address, email } = parsed.data
    const priced = await priceCheckoutBasket(items, getProduct)
    const country = shipping_address.country.toUpperCase()
    const state = shipping_address.state.toUpperCase()
    const shippingCents = Math.round(getStandardShippingForCountryAndQuantity(country, priced.quantity) * 100)
    const taxCents = Math.round(
      computeTaxAmount((priced.subtotalCents + shippingCents) / 100, country, state) * 100,
    )

    // An edited price, expired variant or stale rate stops checkout instead
    // of silently charging an amount different from the displayed cart.
    const clientCents = [subtotal, shipping, tax].map(value => Math.round(value * 100))
    if ([priced.subtotalCents, shippingCents, taxCents].some((value, index) =>
      !Number.isSafeInteger(value) || value < 0 || Math.abs(value - clientCents[index]) > 1)) {
      return NextResponse.json(
        { error: 'Your cart totals changed. Please refresh checkout before paying.' },
        { status: 409 },
      )
    }

    const orderId = createShortOrderId()
    const { success, cancel } = trustedCheckoutReturnUrls(orderId, {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      siteUrl: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL,
      requestOrigin: request.nextUrl.origin,
    })

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priced.lines.map(item => ({
      price_data: {
        currency: 'usd',
        unit_amount: item.unitCents,
        product_data: {
          name: item.name,
          ...(item.sizeLabel ? { description: `Print size: ${item.sizeLabel}` } : {}),
          metadata: {
            productId: item.productId,
            sizeLabel: item.sizeLabel ?? '',
          },
        },
      },
      quantity: item.quantity,
    }))
    if (shippingCents > 0) lineItems.push({
      price_data: {
        currency: 'usd',
        unit_amount: shippingCents,
        product_data: { name: 'Shipping' },
      },
      quantity: 1,
    })
    if (taxCents > 0) lineItems.push({
      price_data: {
        currency: 'usd',
        unit_amount: taxCents,
        product_data: { name: 'Tax' },
      },
      quantity: 1,
    })

    const addr = shipping_address
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
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      automatic_tax: { enabled: false },
      success_url: success,
      cancel_url: cancel,
      customer_creation: 'always',
      customer_email: email,
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
    if (error instanceof CheckoutBasketError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    reportServerError('api.checkout_create_session.failure')
    return NextResponse.json(
      { error: 'Unable to start checkout. Please try again.' },
      { status: 500 }
    )
  }
}
