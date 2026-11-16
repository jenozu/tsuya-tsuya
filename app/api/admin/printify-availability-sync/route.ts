import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { hasAdminSession } from '@/lib/admin-session'
import { isSameOriginMutation } from '@/lib/same-origin'
import { reportServerError } from '@/lib/safe-server-log'
import { getProduct, getProducts, updateProduct } from '@/lib/data'
import { runAvailabilitySync } from '@/lib/printify-availability-sync'

export const runtime = 'nodejs'

// Admin-only; read-only against Printify (GET). Returns admin warnings, never customer-facing.
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  if (!(await hasAdminSession(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await runAvailabilitySync(await getProducts(), { getProduct, updateProduct })
    if (result.updatedIds.length) {
      revalidatePath('/')
      revalidatePath('/shop')
      for (const id of result.updatedIds) revalidatePath(`/shop/${id}`)
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    reportServerError('api.admin_printify_availability_sync.failure')
    return NextResponse.json({ error: 'Availability sync failed' }, { status: 500 })
  }
}
