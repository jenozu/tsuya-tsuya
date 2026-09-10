from pathlib import Path
import json
import re

ROOT = Path('.')

def write(path: str, content: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')

# ---------------------------------------------------------------------------
# Shared types + image parsing (safe for server and client bundles)
# ---------------------------------------------------------------------------
write('lib/types.ts', r'''export interface ProductSize {
  label: string
  price: number
  cost?: number
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  cost?: number
  category: string
  image_url: string
  stock: number
  sizes?: ProductSize[]
  product_type?: string | null
  created_at?: string
  updated_at?: string
}

export interface Order {
  id: string
  order_id: string
  email: string
  items: OrderItem[]
  subtotal: number
  taxes: number
  shipping: number
  total: number
  status: string
  shipping_address: ShippingAddress
  payment_intent_id?: string
  payment_status: string
  payment_method?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  selectedSize?: string
  imageUrl?: string
}

export interface ShippingAddress {
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface ShippingRate {
  id: string
  name: string
  country_code: string
  price: number
  created_at?: string
  updated_at?: string
}

export function parseProductImageUrls(value: string | null | undefined): string[] {
  if (!value || typeof value !== 'string' || !value.trim()) return []
  const trimmed = value.trim()
  if (!trimmed.startsWith('[')) return [trimmed]

  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : []
  } catch {
    return [trimmed]
  }
}

export function getImageUrls(product: Pick<Product, 'image_url'>): string[] {
  return parseProductImageUrls(product.image_url)
}
''')

# ---------------------------------------------------------------------------
# Neon connection + data access layer
# ---------------------------------------------------------------------------
write('lib/db.ts', r'''import { neon } from '@neondatabase/serverless'

let sqlClient: ReturnType<typeof neon> | null = null
let currentUrl: string | null = null

export function getDb(): ReturnType<typeof neon> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured')

  if (!sqlClient || currentUrl !== databaseUrl) {
    sqlClient = neon(databaseUrl)
    currentUrl = databaseUrl
  }

  return sqlClient
}
''')

write('lib/data.ts', r'''import { getDb } from './db'
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
''')

# ---------------------------------------------------------------------------
# R2 object storage
# ---------------------------------------------------------------------------
write('lib/r2.ts', r'''import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

let r2Client: S3Client | null = null

function env(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

export function getR2Client(): S3Client {
  if (!r2Client) {
    const accountId = env('R2_ACCOUNT_ID')
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env('R2_ACCESS_KEY_ID'),
        secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
      },
    })
  }
  return r2Client
}

export function getR2Bucket(): string {
  return env('R2_BUCKET_NAME')
}

export function getR2PublicBaseUrl(): string {
  return env('R2_PUBLIC_URL').replace(/\/+$/, '')
}

export function publicObjectUrl(key: string): string {
  const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/')
  return `${getR2PublicBaseUrl()}/${encodedKey}`
}

export function objectKeyFromPublicUrl(url: string): string | null {
  try {
    const base = `${getR2PublicBaseUrl()}/`
    if (!url.startsWith(base)) return null
    return url.slice(base.length).split('/').map(segment => decodeURIComponent(segment)).join('/')
  } catch {
    return null
  }
}

export async function putR2Object(input: {
  key: string
  body: Uint8Array | Buffer
  contentType: string
  cacheControl?: string
}): Promise<string> {
  await getR2Client().send(new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
    CacheControl: input.cacheControl ?? 'public, max-age=31536000, immutable',
  }))
  return publicObjectUrl(input.key)
}

export async function deleteR2Object(key: string): Promise<void> {
  await getR2Client().send(new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key }))
}
''')

write('lib/image-upload-client.ts', r'''export async function uploadProductImage(file: File, fileName?: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file, fileName || file.name)

  const response = await fetch('/api/admin/product-images', { method: 'POST', body: formData })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || typeof result.url !== 'string') {
    throw new Error(result.error || 'Image upload failed')
  }
  return result.url
}

export async function deleteProductImage(imageUrl: string): Promise<boolean> {
  const response = await fetch('/api/admin/product-images', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: imageUrl }),
  })
  return response.ok
}
''')

write('app/api/admin/product-images/route.ts', r'''import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { hasAdminSession } from '@/lib/admin-session'
import { deleteR2Object, objectKeyFromPublicUrl, putR2Object } from '@/lib/r2'

export const runtime = 'nodejs'

const MAX_INPUT_SIZE = 15 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(request: NextRequest) {
  if (!(await hasAdminSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, and WebP images are supported' }, { status: 400 })
    if (file.size <= 0 || file.size > MAX_INPUT_SIZE) return NextResponse.json({ error: 'Image must be between 1 byte and 15 MB' }, { status: 413 })

    const input = Buffer.from(await file.arrayBuffer())
    const optimized = await sharp(input)
      .rotate()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84, effort: 4 })
      .toBuffer()

    const day = new Date().toISOString().slice(0, 10)
    const key = `products/${day}/${crypto.randomUUID()}.webp`
    const url = await putR2Object({ key, body: optimized, contentType: 'image/webp' })

    return NextResponse.json({ url, key, bytes: optimized.byteLength })
  } catch (error) {
    console.error('R2 product image upload error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Image upload failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await hasAdminSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({})) as { url?: string; key?: string }
    const key = body.key || (body.url ? objectKeyFromPublicUrl(body.url) : null)
    if (!key || !key.startsWith('products/')) return NextResponse.json({ error: 'Invalid R2 product image key' }, { status: 400 })
    await deleteR2Object(key)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('R2 product image delete error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Image deletion failed' }, { status: 500 })
  }
}
''')

# ---------------------------------------------------------------------------
# Neon schema
# ---------------------------------------------------------------------------
write('migrations/002_neon_r2_schema.sql', r'''-- Tsuyanouchi Neon PostgreSQL schema
-- Run once in the Neon SQL Editor before switching production traffic.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  cost NUMERIC(10,2),
  category TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxes NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment_intent_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, country_code)
);

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_country ON shipping_rates(country_code);

INSERT INTO shipping_rates (name, country_code, price) VALUES
  ('Standard Shipping - United States', 'US', 9.99),
  ('Express Shipping - United States', 'US', 24.99),
  ('Standard Shipping - Canada', 'CA', 14.99),
  ('Standard Shipping - United Kingdom', 'GB', 19.99),
  ('Standard Shipping - Australia', 'AU', 24.99),
  ('Standard Shipping - Japan', 'JP', 19.99),
  ('International Shipping', 'INTL', 29.99)
ON CONFLICT (name, country_code) DO NOTHING;
''')

# ---------------------------------------------------------------------------
# Waitlist now writes to Neon
# ---------------------------------------------------------------------------
write('app/api/waitlist/route.ts', r'''import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { addWaitlistEmail } from '@/lib/data'

const bodySchema = z.object({ email: z.string().email('Please enter a valid email address') })
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Tsuyanouchi <orders@tsuyanouchi.com>'
const ADMIN_EMAIL = process.env.ORDER_NOTIFICATION_EMAIL || 'admin@tsuyanouchi.com'

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid email' }, { status: 400 })
    }

    const email = parsed.data.email.toLowerCase().trim()
    const result = await addWaitlistEmail(email)
    if (result === 'duplicate') return NextResponse.json({ error: 'This email is already on the list.' }, { status: 409 })

    if (resend) {
      resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: 'New Waitlist Signup — Tsuyanouchi',
        html: `<p style="font-family: Georgia, serif; color: #2D2A26;">A new visitor has joined the waitlist:</p><p style="font-family: Georgia, serif; font-size: 18px; color: #2D2A26;"><strong>${email.replace(/[<>&"']/g, '')}</strong></p>`,
      }).catch((err: unknown) => console.error('Waitlist notification email error:', err))
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Waitlist API error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
''')

# ---------------------------------------------------------------------------
# Bulk R2 uploader for the existing product-images folders
# ---------------------------------------------------------------------------
write('scripts/bulk-upload-images.js', r'''#!/usr/bin/env node

try { process.loadEnvFile?.('.env.local') } catch {}
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const fs = require('fs')
const path = require('path')

const subfolder = process.argv[2]
const baseFolder = path.join(__dirname, '../product-images')
const imagesFolder = subfolder ? path.join(baseFolder, subfolder) : baseFolder
const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing ${name} in .env.local`)
    process.exit(1)
  }
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
})

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

async function run() {
  if (!fs.existsSync(imagesFolder)) throw new Error(`Folder not found: ${imagesFolder}`)
  const files = fs.readdirSync(imagesFolder).filter(name => MIME[path.extname(name).toLowerCase()])
  if (!files.length) throw new Error(`No JPG, PNG, or WebP files found in ${imagesFolder}`)

  let uploaded = 0
  for (const filename of files) {
    const ext = path.extname(filename).toLowerCase()
    const relative = subfolder ? `${subfolder}/${filename}` : filename
    const key = `products/${relative.replace(/\\/g, '/')}`
    const body = fs.readFileSync(path.join(imagesFolder, filename))
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: MIME[ext],
      CacheControl: 'public, max-age=31536000, immutable',
    }))
    uploaded += 1
    const publicUrl = `${process.env.R2_PUBLIC_URL.replace(/\/+$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`
    console.log(`Uploaded ${filename} -> ${publicUrl}`)
  }
  console.log(`Done. Uploaded ${uploaded} image(s) to Cloudflare R2.`)
}

run().catch(error => { console.error(error); process.exit(1) })
''')

# ---------------------------------------------------------------------------
# One-time Supabase -> Neon/R2 migration utility. No Supabase SDK dependency.
# ---------------------------------------------------------------------------
write('scripts/migrate-supabase-to-neon.mjs', r'''import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

try { process.loadEnvFile?.('.env.local') } catch {}

const required = [
  'DATABASE_URL', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME', 'R2_PUBLIC_URL', 'LEGACY_SUPABASE_URL', 'LEGACY_SUPABASE_SERVICE_ROLE_KEY',
]
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`)

const sql = neon(process.env.DATABASE_URL)
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
})
const r2Base = process.env.R2_PUBLIC_URL.replace(/\/+$/, '')
const legacyBase = process.env.LEGACY_SUPABASE_URL.replace(/\/+$/, '')
const legacyKey = process.env.LEGACY_SUPABASE_SERVICE_ROLE_KEY

async function sourceTable(table) {
  const response = await fetch(`${legacyBase}/rest/v1/${table}?select=*`, {
    headers: { apikey: legacyKey, Authorization: `Bearer ${legacyKey}` },
  })
  if (response.status === 404) return []
  if (!response.ok) throw new Error(`Could not read ${table}: ${response.status} ${await response.text()}`)
  return response.json()
}

function parseImages(value) {
  if (!value || typeof value !== 'string') return []
  const trimmed = value.trim()
  if (!trimmed.startsWith('[')) return [trimmed]
  try { const parsed = JSON.parse(trimmed); return Array.isArray(parsed) ? parsed.filter(Boolean) : [] } catch { return [trimmed] }
}

async function bytesForImage(source) {
  if (source.startsWith('data:image/')) {
    const match = source.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) throw new Error('Unsupported data URL')
    return Buffer.from(match[2], 'base64')
  }
  if (source.startsWith('/product-images/')) {
    return fs.readFile(path.join(process.cwd(), source.slice(1)))
  }
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source)
    if (!response.ok) throw new Error(`Image download failed: ${response.status} ${source}`)
    return Buffer.from(await response.arrayBuffer())
  }
  const local = path.join(process.cwd(), 'product-images', source.replace(/^products\//, ''))
  return fs.readFile(local)
}

async function migrateImage(source) {
  if (!source) return source
  if (source.startsWith(`${r2Base}/`)) return source
  const isSupabase = source.includes('.supabase.co/storage/') || source.startsWith('data:image/')
  const isLocal = source.startsWith('/product-images/') || (!/^https?:\/\//i.test(source) && !source.startsWith('/'))
  if (!isSupabase && !isLocal) return source

  const input = await bytesForImage(source)
  const output = await sharp(input).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer()
  const key = `products/migrated/${crypto.randomUUID()}.webp`
  await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, Body: output, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }))
  return `${r2Base}/${key}`
}

async function migrateImageValue(value) {
  const images = parseImages(value)
  const migrated = []
  for (const source of images) {
    try { migrated.push(await migrateImage(source)) }
    catch (error) { console.warn(`Leaving image unchanged because migration failed: ${source}`, error) ; migrated.push(source) }
  }
  if (!migrated.length) return ''
  return migrated.length === 1 ? migrated[0] : JSON.stringify(migrated)
}

const products = await sourceTable('products')
for (const p of products) {
  const imageUrl = await migrateImageValue(p.image_url)
  await sql`
    INSERT INTO products (id, name, description, price, cost, category, image_url, stock, sizes, product_type, created_at, updated_at)
    VALUES (${p.id}::uuid, ${p.name}, ${p.description ?? ''}, ${p.price}, ${p.cost ?? null}, ${p.category}, ${imageUrl}, ${p.stock ?? 0}, ${JSON.stringify(p.sizes ?? [])}::jsonb, ${p.product_type ?? null}, ${p.created_at ?? new Date().toISOString()}, ${p.updated_at ?? new Date().toISOString()})
    ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price, cost=EXCLUDED.cost, category=EXCLUDED.category, image_url=EXCLUDED.image_url, stock=EXCLUDED.stock, sizes=EXCLUDED.sizes, product_type=EXCLUDED.product_type, updated_at=EXCLUDED.updated_at
  `
  console.log(`Migrated product: ${p.name}`)
}

const orders = await sourceTable('orders')
for (const o of orders) {
  await sql`
    INSERT INTO orders (id, order_id, email, items, subtotal, taxes, shipping, total, status, shipping_address, payment_intent_id, payment_status, payment_method, created_at, updated_at)
    VALUES (${o.id}::uuid, ${o.order_id}, ${o.email}, ${JSON.stringify(o.items ?? [])}::jsonb, ${o.subtotal ?? 0}, ${o.taxes ?? 0}, ${o.shipping ?? 0}, ${o.total ?? 0}, ${o.status ?? 'pending'}, ${JSON.stringify(o.shipping_address ?? {})}::jsonb, ${o.payment_intent_id ?? null}, ${o.payment_status ?? 'pending'}, ${o.payment_method ?? null}, ${o.created_at ?? new Date().toISOString()}, ${o.updated_at ?? new Date().toISOString()})
    ON CONFLICT (order_id) DO UPDATE SET email=EXCLUDED.email, items=EXCLUDED.items, subtotal=EXCLUDED.subtotal, taxes=EXCLUDED.taxes, shipping=EXCLUDED.shipping, total=EXCLUDED.total, status=EXCLUDED.status, shipping_address=EXCLUDED.shipping_address, payment_intent_id=EXCLUDED.payment_intent_id, payment_status=EXCLUDED.payment_status, payment_method=EXCLUDED.payment_method, updated_at=EXCLUDED.updated_at
  `
}

const rates = await sourceTable('shipping_rates')
for (const r of rates) {
  await sql`INSERT INTO shipping_rates (id, name, country_code, price, created_at, updated_at) VALUES (${r.id}::uuid, ${r.name}, ${r.country_code}, ${r.price}, ${r.created_at ?? new Date().toISOString()}, ${r.updated_at ?? new Date().toISOString()}) ON CONFLICT (name, country_code) DO UPDATE SET price=EXCLUDED.price, updated_at=EXCLUDED.updated_at`
}

const waitlist = await sourceTable('waitlist')
for (const w of waitlist) {
  await sql`INSERT INTO waitlist (id, email, created_at) VALUES (${w.id}::uuid, ${w.email}, ${w.created_at ?? new Date().toISOString()}) ON CONFLICT (email) DO NOTHING`
}

console.log(`Migration complete: ${products.length} products, ${orders.length} orders, ${rates.length} shipping rates, ${waitlist.length} waitlist entries.`)
''')

# ---------------------------------------------------------------------------
# Rewire old helper imports. Server functions go to data; shared types/helpers
# go to types; client upload methods go to image-upload-client.
# ---------------------------------------------------------------------------
DATA_NAMES = {
    'getProducts','getProduct','createProduct','updateProduct','deleteProduct','getProductsByCategory',
    'getOrders','getOrder','createOrder','updateOrderStatus','updateOrderPaymentIntent',
    'getShippingRates','getShippingRate','createShippingRate','updateShippingRate','deleteShippingRate',
    'getUserFavorites','addFavorite','removeFavorite','addWaitlistEmail',
}
TYPE_NAMES = {'ProductSize','Product','Order','OrderItem','ShippingAddress','ShippingRate','getImageUrls','parseProductImageUrls'}
CLIENT_NAMES = {'uploadProductImage','deleteProductImage'}

pattern = re.compile(r"import\s*\{([^}]+)\}\s*from\s*(['\"])(@/lib/supabase-helpers|\./supabase-helpers)\2\s*;?")

for p in list(ROOT.rglob('*.ts')) + list(ROOT.rglob('*.tsx')):
    if p.as_posix() in {'lib/supabase-helpers.ts','lib/supabase-client.ts','lib/supabase-admin.ts'}:
        continue
    text = p.read_text(encoding='utf-8')
    def repl(match):
        raw_names = [x.strip() for x in match.group(1).split(',') if x.strip()]
        groups = {'data': [], 'types': [], 'client': []}
        for raw in raw_names:
            base = raw.replace('type ', '', 1).strip().split(' as ')[0].strip()
            if base in DATA_NAMES: groups['data'].append(raw)
            elif base in TYPE_NAMES: groups['types'].append(raw)
            elif base in CLIENT_NAMES: groups['client'].append(raw)
            else: raise RuntimeError(f'Unknown supabase-helper import {raw!r} in {p}')
        alias = match.group(3).startswith('@/')
        prefix = '@/lib/' if alias else './'
        lines = []
        if groups['data']: lines.append(f"import {{ {', '.join(groups['data'])} }} from '{prefix}data'")
        if groups['types']: lines.append(f"import {{ {', '.join(groups['types'])} }} from '{prefix}types'")
        if groups['client']: lines.append(f"import {{ {', '.join(groups['client'])} }} from '{prefix}image-upload-client'")
        return '\n'.join(lines)
    updated = pattern.sub(repl, text)
    if updated != text:
        p.write_text(updated, encoding='utf-8')

# csv-parser is server-side and filename URLs now point at R2.
csv = ROOT / 'lib/csv-parser.ts'
text = csv.read_text(encoding='utf-8')
start = text.index('function normalizeImageUrl(')
end = text.index('/**\n * Validates required fields', start)
new_normalizer = r'''function normalizeImageUrl(imageUrlOrFilename: string): string {
  const trimmed = imageUrlOrFilename.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) return trimmed;

  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '');
  if (!publicBase) throw new Error('R2_PUBLIC_URL is required when CSV imageUrl contains a filename');

  const key = trimmed.startsWith('products/') ? trimmed : `products/${trimmed}`;
  const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/');
  return `${publicBase}/${encodedKey}`;
}

'''
text = text[:start] + new_normalizer + text[end:]
text = text.replace('Converts filename to Supabase Storage URL if needed', 'Converts a filename to its Cloudflare R2 public URL if needed')
csv.write_text(text, encoding='utf-8')

# Admin explicitly uses the client upload helper; keep types out of server data module.
admin = ROOT / 'app/admin/admin-client.tsx'
text = admin.read_text(encoding='utf-8')
text = text.replace("import { Product, Order, ShippingRate, ProductSize } from '@/lib/data'", "import type { Product, Order, ShippingRate, ProductSize } from '@/lib/types'")
text = text.replace("import { uploadProductImage } from '@/lib/data'", "import { uploadProductImage } from '@/lib/image-upload-client'")
admin.write_text(text, encoding='utf-8')

# Ensure client product components import shared types/helpers only.
for filename in ['components/product-card.tsx', 'app/shop/[slug]/product-detail-client.tsx']:
    p = ROOT / filename
    text = p.read_text(encoding='utf-8')
    text = text.replace("from '@/lib/data'", "from '@/lib/types'")
    p.write_text(text, encoding='utf-8')

# Update environment/setup docs to the new architecture.
write('ENV_TEMPLATE.md', r'''# Tsuyanouchi environment variables

# Neon PostgreSQL
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require

# Cloudflare R2 object storage
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=tsuya-tsuya-images
# Public custom domain or r2.dev URL, no trailing slash
R2_PUBLIC_URL=https://images.example.com

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin
ADMIN_PASSWORD=choose-a-strong-password
ADMIN_SESSION_SECRET=generate-a-long-random-secret

# Owner preview
PREVIEW_PASSWORD=choose-a-preview-password

# Email
RESEND_API_KEY=re_...
ORDER_NOTIFICATION_EMAIL=admin@tsuyanouchi.com
RESEND_FROM_EMAIL=Tsuyanouchi <orders@tsuyanouchi.com>

# Gemini descriptions
GEMINI_API_KEY=...

# Temporary migration-only source credentials. Remove after migration.
LEGACY_SUPABASE_URL=https://your-old-project.supabase.co
LEGACY_SUPABASE_SERVICE_ROLE_KEY=your-old-service-role-key
''')

write('NEON_R2_SETUP.md', r'''# Neon + Cloudflare R2 setup

Tsuyanouchi now uses **Neon PostgreSQL for structured data** and **Cloudflare R2 for product image files**. The production application has no Supabase SDK/runtime dependency.

## 1. Neon
1. Create a Neon project/database.
2. Open Neon's SQL Editor and run `migrations/002_neon_r2_schema.sql`.
3. Copy the pooled PostgreSQL connection string into Vercel as `DATABASE_URL`.

## 2. Cloudflare R2
1. Create an R2 bucket (recommended name: `tsuya-tsuya-images`).
2. Enable public access through an R2 custom domain or the development `r2.dev` public URL.
3. Create an R2 API token with Object Read & Write access to this bucket.
4. Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL` to Vercel.

Uploaded admin images are automatically rotated, resized to fit within 2400×2400 without enlargement, converted to WebP at quality 84, and stored under `products/YYYY-MM-DD/<uuid>.webp`. Neon stores only the resulting URL/string metadata.

## 3. Existing data
Before removing the old service, temporarily add `LEGACY_SUPABASE_URL` and `LEGACY_SUPABASE_SERVICE_ROLE_KEY` to a local `.env.local`, then run:

```bash
node scripts/migrate-supabase-to-neon.mjs
```

The migration copies products, orders, shipping rates, and waitlist entries into Neon. Supabase-hosted, legacy base64, and local product images are copied/optimized into R2 and product image URLs are rewritten. External non-Supabase image URLs are left unchanged.

After validating the new site, delete the two `LEGACY_SUPABASE_*` values. They are not used by the application itself.

## 4. Existing repository image folders
If you want to upload the tracked `product-images/1`, `2`, or `3` folders directly while retaining filenames:

```bash
npm run upload-images-1
npm run upload-images-2
npm run upload-images-3
```

## Required Vercel production variables
`DATABASE_URL`, all five `R2_*` variables, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` are required for the admin/catalogue pipeline. Stripe/Resend/Gemini variables remain feature-specific.
''')

# Update old admin audit note so it no longer instructs production to add Supabase.
audit = ROOT / 'ADMIN_AUDIT_2026-09-10.md'
if audit.exists():
    text = audit.read_text(encoding='utf-8')
    text += '\n\n## Storage/database architecture update\n\nSupabase has subsequently been replaced by Neon PostgreSQL + Cloudflare R2. See `NEON_R2_SETUP.md`.\n'
    audit.write_text(text, encoding='utf-8')

# Old Supabase runtime/source files are removed; historical SQL is superseded by Neon schema.
for old in [
    'lib/supabase-helpers.ts', 'lib/supabase-client.ts', 'lib/supabase-admin.ts',
    'SUPABASE_SCHEMA.sql', 'supabase-migration-add-product-type.sql', 'supabase-waitlist-table.sql',
]:
    p = ROOT / old
    if p.exists(): p.unlink()

# Future local source images should not be accidentally committed after R2 migration.
gitignore = ROOT / '.gitignore'
text = gitignore.read_text(encoding='utf-8') if gitignore.exists() else ''
for entry in ['tsconfig.tsbuildinfo', '.env.migration']:
    if entry not in text.splitlines(): text += ('\n' if text and not text.endswith('\n') else '') + entry + '\n'
gitignore.write_text(text, encoding='utf-8')

print('Neon + R2 migration patch applied')
