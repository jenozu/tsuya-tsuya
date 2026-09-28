import { reportServerError } from '@/lib/safe-server-log'
import { isSameOriginMutation } from '@/lib/same-origin'
import { NextRequest, NextResponse } from 'next/server'
import { getProducts, createProduct } from '@/lib/data'
import { hasAdminSession } from '@/lib/admin-session'
import { revalidatePath } from 'next/cache'
import { createProductSchema, updateProductSchema, normalizedProductFields } from '@/lib/product-validation'


// GET /api/products - Get all products
export async function GET() {
  try {
    const products = await getProducts()
    return NextResponse.json(products)
  } catch (error) {
    reportServerError('api.products.failure')
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create new product
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  if (!(await hasAdminSession(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const parsed = createProductSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid product data', fields: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    const product = normalizedProductFields(parsed.data)
    const newProduct = await createProduct({
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      cost: product.cost ?? undefined,
      category: product.category,
      image_url: product.image_url ?? '/product-placeholder.svg',
      stock: product.stock ?? 0,
      sizes: product.sizes ?? [],
      product_type: product.product_type ?? undefined,
    })

    if (!newProduct) {
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      )
    }
    
    revalidatePath('/')
    revalidatePath('/shop')
    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    reportServerError('api.products.failure')
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
