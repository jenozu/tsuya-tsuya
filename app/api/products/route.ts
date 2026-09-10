import { NextRequest, NextResponse } from 'next/server'
import { getProducts, createProduct } from '@/lib/supabase-helpers'

// GET /api/products - Get all products
export async function GET() {
  try {
    const products = await getProducts()
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields (price == null check allows price:0)
    if (!body.name || body.price == null || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price, category' },
        { status: 400 }
      )
    }
    
    const newProduct = await createProduct({
      name: body.name,
      description: body.description || '',
      price: parseFloat(body.price),
      cost: body.cost ? parseFloat(body.cost) : undefined,
      category: body.category,
      image_url: body.image_url || body.imageUrl || '',
      stock: parseInt(body.stock) || 0,
      sizes: body.sizes || [],
    })
    
    if (!newProduct) {
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
