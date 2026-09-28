import { reportServerError } from '@/lib/safe-server-log'
import { isSameOriginMutation } from '@/lib/same-origin'
import { NextResponse } from 'next/server'
import { createOrder } from '@/lib/data'
import { hasAdminSession } from '@/lib/admin-session'

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  if (!(await hasAdminSession(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  } catch (error) {
    reportServerError('api.orders.create_failure')
    return NextResponse.json(
      { error: 'Unable to create order' },
      { status: 500 }
    )
  }
}
