import { NextResponse } from 'next/server'
import { renderOrderConfirmationHtml } from '@/lib/email-templates/order-confirmation'
import type { Order } from '@/lib/types'
import { hasAdminSession } from '@/lib/admin-session'

/** Mock order for email preview. Edit this to test different content. */
const MOCK_ORDER: Order = {
  id: 'preview-id',
  order_id: 'ORD-02K8FQ7',
  email: 'preview@preview.invalid',
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
    firstName: 'Preview',
    lastName: 'Customer',
    address: 'Preview address only',
    addressLine2: '',
    unitNumber: '',
    city: 'Preview City',
    state: 'NA',
    postalCode: '00000',
    country: 'US',
    phone: '',
  },
  payment_intent_id: 'pi_preview',
  payment_status: 'paid',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export async function GET(request: Request) {
  if (!(await hasAdminSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const html = renderOrderConfirmationHtml(MOCK_ORDER.order_id, MOCK_ORDER)
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
