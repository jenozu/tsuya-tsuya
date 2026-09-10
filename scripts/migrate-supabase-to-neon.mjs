import fs from 'node:fs/promises'
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
