import { NextResponse } from 'next/server'
import { renderOrderConfirmationHtml } from '@/lib/email-templates/order-confirmation'
import type { Order } from '@/lib/supabase-helpers'

/** Mock order for email preview. Edit this to test different content. */
const MOCK_ORDER: Order = {
  id: 'preview-id',
  order_id: 'ORD-1730000000-ABC123XYZ',
  email: 'customer@example.com',
  items: [
    { productId: '1', productName: 'Sample Product One', quantity: 1, price: 85.0 },
    { productId: '2', productName: 'Sample Product Two', quantity: 2, price: 42.5 },
  ],
  subtotal: 170.0,
  taxes: 17.0,
  shipping: 12.5,
  total: 199.5,
  status: 'processing',
  shipping_address: {
    firstName: 'Jane',
    lastName: 'Doe',
    address: '123 Main Street, Apt 4',
    city: 'Brooklyn',
    state: 'NY',
    postalCode: '11201',
    country: 'US',
  },
  payment_intent_id: 'pi_preview',
  payment_status: 'paid',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export function GET() {
  const html = renderOrderConfirmationHtml(MOCK_ORDER.order_id, MOCK_ORDER)
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
