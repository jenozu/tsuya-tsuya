import { NextRequest, NextResponse } from 'next/server'
import { deleteProduct } from '@/lib/data'
import { hasAdminSession } from '@/lib/admin-session'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  if (!(await hasAdminSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({})) as { ids?: unknown }
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : []

    const uniqueIds = Array.from(new Set(ids)).slice(0, 500)
    if (uniqueIds.length === 0) {
      return NextResponse.json({ error: 'No product IDs provided' }, { status: 400 })
    }

    const results = await Promise.all(
      uniqueIds.map(async id => ({ id, success: await deleteProduct(id) }))
    )

    const deleted = results.filter(result => result.success).length
    const failedIds = results.filter(result => !result.success).map(result => result.id)

    revalidatePath('/')
    revalidatePath('/shop')
    revalidatePath('/admin')

    return NextResponse.json({
      success: failedIds.length === 0,
      deleted,
      failed: failedIds.length,
      failedIds,
    })
  } catch (error) {
    console.error('Bulk product delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete selected products' },
      { status: 500 }
    )
  }
}
