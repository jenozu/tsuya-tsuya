import { getDb } from './db'
import type {
  Product,
  ProductSize,
  Order,
  OrderItem,
  ShippingAddress,
  ShippingRate,
} from './types'

export type {
  Product,
  ProductSize,
  Order,
  OrderItem,
  ShippingAddress,
  ShippingRate,
} from './types'
export { getImageUrls, parseProductImageUrls } from './types'

type Row = Record<string, unknown>

function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stringValue(value: unknown, fallback = ''): string {
  if (value == null) return fallback
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function jsonValue<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T } catch { return fallback }
  }
  return value as T
}

function mapProduct(row: Row): Product {
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    description: stringValue(row.description),
    price: numberValue(row.price),
    cost: row.cost == null ? undefined : numberValue(row.cost),
    category: stringValue(row.category),
    image_url: stringValue(row.image_url),
    stock: Math.max(0, Math.trunc(numberValue(row.stock))),
    sizes: jsonValue<ProductSize[]>(row.sizes, []),
    product_type: row.product_type == null ? null : stringValue(row.product_type),
    created_at: row.created_at == null ? undefined : stringValue(row.created_at),
    updated_at: row.updated_at == null ? undefined : stringValue(row.updated_at),
  }
}

function mapOrder(row: Row): Order {
  return {
    id: stringValue(row.id),
    order_id: stringValue(row.order_id),
    email: stringValue(row.email),
    items: jsonValue<OrderItem[]>(row.items, []),
    subtotal: numberValue(row.subtotal),
    taxes: numberValue(row.taxes),
    shipping: numberValue(row.shipping),
    total: numberValue(row.total),
    status: stringValue(row.status, 'pending'),
    shipping_address: jsonValue<ShippingAddress>(row.shipping_address, {
      firstName: '', lastName: '', address: '', city: '', state: '', postalCode: '', country: '',
    }),
    payment_intent_id: row.payment_intent_id == null ? undefined : stringValue(row.payment_intent_id),
    payment_status: stringValue(row.payment_status, 'pending'),
    payment_method: row.payment_method == null ? undefined : stringValue(row.payment_method),
    created_at: stringValue(row.created_at),
    updated_at: stringValue(row.updated_at),
  }
}

function mapShippingRate(row: Row): ShippingRate {
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    country_code: stringValue(row.country_code),
    price: numberValue(row.price),
    created_at: row.created_at == null ? undefined : stringValue(row.created_at),
    updated_at: row.updated_at == null ? undefined : stringValue(row.updated_at),
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const sql = getDb()
    const rows = (await sql`SELECT id, name, description, price, cost, category, image_url, stock, sizes, product_type, created_at, updated_at FROM products ORDER BY created_at DESC`) as unknown as Row[]
    return rows.map(mapProduct)
  } catch (error) {
    console.error('Error fetching products from Neon:', error)
    return []
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  try {
    const sql = getDb()
    const rows = (await sql`SELECT id, name, description, price, cost, category, image_url, stock, sizes, product_type, created_at, updated_at FROM products WHERE id::text = ${id} LIMIT 1`) as unknown as Row[]
    return rows[0] ? mapProduct(rows[0]) : null
  } catch (error) {
    console.error('Error fetching product from Neon:', error)
    return null
  }
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product | null> {
  try {
    const sql = getDb()
    const sizes = JSON.stringify(product.sizes ?? [])
    const rows = (await sql`
      INSERT INTO products (name, description, price, cost, category, image_url, stock, sizes, product_type)
      VALUES (${product.name}, ${product.description ?? ''}, ${product.price}, ${product.cost ?? null}, ${product.category}, ${product.image_url ?? ''}, ${Math.max(0, Math.trunc(product.stock ?? 0))}, ${sizes}::jsonb, ${product.product_type ?? null})
      RETURNING *
    `) as unknown as Row[]
    return rows[0] ? mapProduct(rows[0]) : null
  } catch (error) {
    console.error('Error creating product in Neon:', error)
    return null
  }
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  try {
    const existing = await getProduct(id)
    if (!existing) return null
    const merged: Product = { ...existing, ...updates, id: existing.id }
    const sql = getDb()
    const sizes = JSON.stringify(merged.sizes ?? [])
    const rows = (await sql`
      UPDATE products SET
        name = ${merged.name},
        description = ${merged.description ?? ''},
        price = ${merged.price},
        cost = ${merged.cost ?? null},
        category = ${merged.category},
        image_url = ${merged.image_url ?? ''},
        stock = ${Math.max(0, Math.trunc(merged.stock ?? 0))},
        sizes = ${sizes}::jsonb,
        product_type = ${merged.product_type ?? null},
        updated_at = NOW()
      WHERE id::text = ${id}
      RETURNING *
    `) as unknown as Row[]
    return rows[0] ? mapProduct(rows[0]) : null
  } catch (error) {
    console.error('Error updating product in Neon:', error)
    return null
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const sql = getDb()
    const rows = (await sql`DELETE FROM products WHERE id::text = ${id} RETURNING id`) as unknown as Row[]
    return rows.length > 0
  } catch (error) {
    console.error('Error deleting product from Neon:', error)
    return false
  }
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  try {
    const sql = getDb()
    const rows = (await sql`SELECT * FROM products WHERE category = ${category} ORDER BY created_at DESC`) as unknown as Row[]
    return rows.map(mapProduct)
  } catch (error) {
    console.error('Error fetching products by category from Neon:', error)
    return []
  }
}

export async function getOrders(): Promise<Order[]> {
  try {
    const sql = getDb()
    const rows = (await sql`SELECT * FROM orders ORDER BY created_at DESC`) as unknown as Row[]
    return rows.map(mapOrder)
  } catch (error) {
    console.error('Error fetching orders from Neon:', error)
    return []
  }
}

export async function getOrder(orderId: string): Promise<Order | null> {
  try {
    const sql = getDb()
    const rows = (await sql`SELECT * FROM orders WHERE order_id = ${orderId} LIMIT 1`) as unknown as Row[]
    return rows[0] ? mapOrder(rows[0]) : null
  } catch (error) {
    console.error('Error fetching order from Neon:', error)
    return null
  }
}

export async function createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order | null> {
  try {
    const sql = getDb()
    const items = JSON.stringify(orderData.items ?? [])
    const address = JSON.stringify(orderData.shipping_address ?? {})
    const rows = (await sql`
      INSERT INTO orders (
        order_id, email, items, subtotal, taxes, shipping, total, status,
        shipping_address, payment_intent_id, payment_status, payment_method
      ) VALUES (
        ${orderData.order_id}, ${orderData.email}, ${items}::jsonb, ${orderData.subtotal},
        ${orderData.taxes}, ${orderData.shipping}, ${orderData.total}, ${orderData.status || 'pending'},
        ${address}::jsonb, ${orderData.payment_intent_id ?? null}, ${orderData.payment_status || 'pending'}, ${orderData.payment_method ?? null}
      )
      ON CONFLICT (order_id) DO UPDATE SET
        email = EXCLUDED.email,
        items = EXCLUDED.items,
        subtotal = EXCLUDED.subtotal,
        taxes = EXCLUDED.taxes,
        shipping = EXCLUDED.shipping,
        total = EXCLUDED.total,
        status = EXCLUDED.status,
        shipping_address = EXCLUDED.shipping_address,
        payment_intent_id = COALESCE(EXCLUDED.payment_intent_id, orders.payment_intent_id),
        payment_status = EXCLUDED.payment_status,
        payment_method = COALESCE(EXCLUDED.payment_method, orders.payment_method),
        updated_at = NOW()
      RETURNING *
    `) as unknown as Row[]
    return rows[0] ? mapOrder(rows[0]) : null
  } catch (error) {
    console.error('Error creating order in Neon:', error)
    return null
  }
}

export async function updateOrderStatus(orderId: string, status: string, paymentStatus?: string): Promise<boolean> {
  try {
    const sql = getDb()
    const rows = paymentStatus
      ? (await sql`UPDATE orders SET status = ${status}, payment_status = ${paymentStatus}, updated_at = NOW() WHERE order_id = ${orderId} RETURNING id`) as unknown as Row[]
      : (await sql`UPDATE orders SET status = ${status}, updated_at = NOW() WHERE order_id = ${orderId} RETURNING id`) as unknown as Row[]
    return rows.length > 0
  } catch (error) {
    console.error('Error updating order status in Neon:', error)
    return false
  }
}

export async function updateOrderPaymentIntent(orderId: string, paymentIntentId: string): Promise<boolean> {
  try {
    const sql = getDb()
    const rows = (await sql`UPDATE orders SET payment_intent_id = ${paymentIntentId}, updated_at = NOW() WHERE order_id = ${orderId} RETURNING id`) as unknown as Row[]
    return rows.length > 0
  } catch (error) {
    console.error('Error updating payment intent in Neon:', error)
    return false
  }
}

export async function getShippingRates(): Promise<ShippingRate[]> {
  try {
    const sql = getDb()
    const rows = (await sql`SELECT * FROM shipping_rates ORDER BY name ASC`) as unknown as Row[]
    return rows.map(mapShippingRate)
  } catch (error) {
    console.error('Error fetching shipping rates from Neon:', error)
    return []
  }
}

export async function getShippingRate(countryCode: string): Promise<ShippingRate | null> {
  try {
    const sql = getDb()
    const rows = (await sql`SELECT * FROM shipping_rates WHERE country_code = ${countryCode.toUpperCase()} ORDER BY name ASC LIMIT 1`) as unknown as Row[]
    return rows[0] ? mapShippingRate(rows[0]) : null
  } catch (error) {
    console.error('Error fetching shipping rate from Neon:', error)
    return null
  }
}

export async function createShippingRate(rate: Omit<ShippingRate, 'id' | 'created_at' | 'updated_at'>): Promise<ShippingRate | null> {
  try {
    const sql = getDb()
    const rows = (await sql`INSERT INTO shipping_rates (name, country_code, price) VALUES (${rate.name}, ${rate.country_code.toUpperCase()}, ${rate.price}) RETURNING *`) as unknown as Row[]
    return rows[0] ? mapShippingRate(rows[0]) : null
  } catch (error) {
    console.error('Error creating shipping rate in Neon:', error)
    return null
  }
}

export async function updateShippingRate(id: string, updates: Partial<ShippingRate>): Promise<ShippingRate | null> {
  try {
    const sql = getDb()
    const existingRows = (await sql`SELECT * FROM shipping_rates WHERE id::text = ${id} LIMIT 1`) as unknown as Row[]
    if (!existingRows[0]) return null
    const current = mapShippingRate(existingRows[0])
    const next = { ...current, ...updates }
    const rows = (await sql`
      UPDATE shipping_rates
      SET name = ${next.name}, country_code = ${next.country_code.toUpperCase()}, price = ${next.price}, updated_at = NOW()
      WHERE id::text = ${id}
      RETURNING *
    `) as unknown as Row[]
    return rows[0] ? mapShippingRate(rows[0]) : null
  } catch (error) {
    console.error('Error updating shipping rate in Neon:', error)
    return null
  }
}

export async function deleteShippingRate(id: string): Promise<boolean> {
  try {
    const sql = getDb()
    const rows = (await sql`DELETE FROM shipping_rates WHERE id::text = ${id} RETURNING id`) as unknown as Row[]
    return rows.length > 0
  } catch (error) {
    console.error('Error deleting shipping rate from Neon:', error)
    return false
  }
}

export async function getUserFavorites(userId: string): Promise<string[]> {
  try {
    const sql = getDb()
    const rows = (await sql`SELECT product_id FROM favorites WHERE user_id = ${userId} ORDER BY created_at ASC`) as unknown as Row[]
    return rows.map(row => stringValue(row.product_id))
  } catch (error) {
    console.error('Error fetching favorites from Neon:', error)
    return []
  }
}

export async function addFavorite(userId: string, productId: string): Promise<boolean> {
  try {
    const sql = getDb()
    await sql`INSERT INTO favorites (user_id, product_id) VALUES (${userId}, ${productId}::uuid) ON CONFLICT (user_id, product_id) DO NOTHING`
    return true
  } catch (error) {
    console.error('Error adding favorite in Neon:', error)
    return false
  }
}

export async function removeFavorite(userId: string, productId: string): Promise<boolean> {
  try {
    const sql = getDb()
    await sql`DELETE FROM favorites WHERE user_id = ${userId} AND product_id::text = ${productId}`
    return true
  } catch (error) {
    console.error('Error removing favorite from Neon:', error)
    return false
  }
}

export async function addWaitlistEmail(email: string): Promise<'added' | 'duplicate'> {
  const sql = getDb()
  const rows = (await sql`INSERT INTO waitlist (email) VALUES (${email.toLowerCase().trim()}) ON CONFLICT (email) DO NOTHING RETURNING id`) as unknown as Row[]
  return rows.length > 0 ? 'added' : 'duplicate'
}
