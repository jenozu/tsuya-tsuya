import { reportServerError } from '@/lib/safe-server-log'
import { isSameOriginMutation } from '@/lib/same-origin'
import { NextResponse } from 'next/server'
import { createOrder, getOrder, transitionOrderStatus } from '@/lib/data'
import { canTransition } from '@/lib/order-status'
import { hasAdminSession } from '@/lib/admin-session'

async function guardAdminMutation(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  if (!(await hasAdminSession(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

export async function POST(request: Request) {
  const denied = await guardAdminMutation(request)
  if (denied) return denied
  try {
    const orderData = await request.json()


    const order = await createOrder(orderData)

    if (!order) {
      reportServerError('api.orders.persist_failed')
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    return NextResponse.json(order, { status: 201 })
  } catch {
    reportServerError('api.orders.create_failure')
    return NextResponse.json(
      { error: 'Unable to create order' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const denied = await guardAdminMutation(request)
  if (denied) return denied
  try {
    const body = await request.json().catch(() => null)
    const orderId = typeof body?.order_id === 'string' ? body.order_id : ''
    if (!orderId) return NextResponse.json({ error: 'order_id required' }, { status: 400 })
    const order = await getOrder(orderId)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (!canTransition(order.status, body.status)) {
      return NextResponse.json({ error: 'Status change not allowed' }, { status: 409 })
    }
    if (!(await transitionOrderStatus(orderId, order.status, body.status))) {
      return NextResponse.json({ error: 'Order changed, reload and retry' }, { status: 409 })
    }
    return NextResponse.json({ order_id: orderId, status: body.status })
  } catch {
    reportServerError('api.orders.update_failure')
    return NextResponse.json({ error: 'Unable to update order' }, { status: 500 })
  }
}
