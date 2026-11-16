// Task 26.2: admin-only refund. Policy wording stays TBD (owner decision). Refunds only with explicit confirmation.
import { NextResponse } from 'next/server'
import { getOrder } from '@/lib/data'
import { hasAdminSession } from '@/lib/admin-session'
import { isSameOriginMutation } from '@/lib/same-origin'
import { stripe } from '@/lib/stripe'
import { issueRefund, type RefundStripe } from '@/lib/refund-service'
import { reportServerError } from '@/lib/safe-server-log'

const STATUS: Record<string, number> = {
  not_confirmed: 400, missing_idempotency_token: 400, invalid_amount: 400,
  not_refundable: 409, exceeds_remaining: 409, stripe_error: 502,
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  if (!(await hasAdminSession(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json().catch(() => null)
    const orderId = typeof body?.order_id === 'string' ? body.order_id : ''
    if (!orderId) return NextResponse.json({ error: 'order_id required' }, { status: 400 })
    // Confirmation = confirm literally true AND the order id typed back exactly.
    if (body.confirm !== true || body.confirm_order_id !== orderId) {
      return NextResponse.json({ error: 'Explicit confirmation required' }, { status: 400 })
    }
    if (typeof body.idempotencyToken !== 'string') return NextResponse.json({ error: 'idempotencyToken required' }, { status: 400 })
    const amountCents = body.amount_cents === undefined ? undefined : body.amount_cents
    if (amountCents !== undefined && (!Number.isInteger(amountCents) || amountCents <= 0)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    const order = await getOrder(orderId)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    const result = await issueRefund(order, { confirmed: true, idempotencyToken: body.idempotencyToken, amountCents }, stripe as unknown as RefundStripe)
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: STATUS[result.reason] ?? 500 })
    return NextResponse.json({ refund_id: result.refundId, amount_cents: result.amountCents, remaining_cents: result.remainingCents })
  } catch {
    reportServerError('api.orders.refund_failure')
    return NextResponse.json({ error: 'Unable to refund order' }, { status: 500 })
  }
}
