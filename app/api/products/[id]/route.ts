import { reportServerError } from '@/lib/safe-server-log'
import { isSameOriginMutation } from '@/lib/same-origin'
import { NextRequest, NextResponse } from 'next/server'
import { getProduct, updateProduct, deleteProduct } from '@/lib/data'
import { hasAdminSession } from '@/lib/admin-session'
import { revalidatePath } from 'next/cache'
import type { Product } from '@/lib/types'
import { createProductSchema, updateProductSchema, normalizedProductFields } from '@/lib/product-validation'


// GET /api/products/[id] - Get single product
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const product = await getProduct(id)
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(product)
  } catch {
    reportServerError('api.products_id_.failure')
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  if (!(await hasAdminSession(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await context.params;
    const parsed = updateProductSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid product data', fields: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    const { cost, ...rest } = normalizedProductFields(parsed.data)
    const updates: Partial<Product> = {
      ...rest,
      ...(cost !== undefined ? { cost: cost ?? undefined } : {}),
    }

    const updatedProduct = await updateProduct(id, updates)
    
    if (!updatedProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    revalidatePath('/')
    revalidatePath('/shop')
    revalidatePath(`/shop/${id}`)
    return NextResponse.json(updatedProduct)
  } catch {
    reportServerError('api.products_id_.failure')
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  if (!(await hasAdminSession(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await context.params;
    const success = await deleteProduct(id)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    revalidatePath('/')
    revalidatePath('/shop')
    revalidatePath(`/shop/${id}`)
    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch {
    reportServerError('api.products_id_.failure')
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
