import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { POST as create } from '../app/api/products/route.ts'
import { PUT as update } from '../app/api/products/[id]/route.ts'
import { POST as deleteMany } from '../app/api/products/bulk-delete/route.ts'
import { POST as importCsv } from '../app/api/products/import/route.ts'
import { createAdminSessionToken } from '../lib/admin-session.ts'
import { resetWrites, setExistingProductByName, writes } from './fixtures/mock-catalog.mjs'

const originalSecret = process.env.ADMIN_SESSION_SECRET
const originalPassword = process.env.ADMIN_PASSWORD
let cookie

before(async () => {
  process.env.ADMIN_SESSION_SECRET = 'task-05-isolated-signing-secret-not-for-any-real-store'
  process.env.ADMIN_PASSWORD = 'task-05-test-password'
  cookie = 'admin_session=' + encodeURIComponent(await createAdminSessionToken())
})
after(() => {
  if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET
  else process.env.ADMIN_SESSION_SECRET = originalSecret
  if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = originalPassword
})

const valid = {
  name: 'Verified Art Print', category: 'Art Prints', price: 12.5,
  image_url: '/product-placeholder.svg', stock: 3,
  sizes: [{ label: '8" x 10"', price: 12.5 }],
}
const params = { params: Promise.resolve({ id: 'mock-product' }) }

function request(path, method, body, { auth = true, hostileOrigin = false, raw = false } = {}) {
  const origin = hostileOrigin ? 'https://attacker.invalid' : 'https://tsuyanouchi.com'
  const headers = {
    origin,
    'sec-fetch-site': hostileOrigin ? 'cross-site' : 'same-origin',
    'content-type': 'application/json',
  }
  if (auth) headers.cookie = cookie
  return new Request('https://tsuyanouchi.com' + path, {
    method, headers,
    ...(body === undefined ? {} : { body: raw ? body : JSON.stringify(body) }),
  })
}

function importRequest(csv, { auth = true, hostileOrigin = false, fileName = 'prints.csv' } = {}) {
  const form = new FormData()
  form.set('file', new File([csv], fileName, { type: 'text/csv' }))
  const origin = hostileOrigin ? 'https://attacker.invalid' : 'https://tsuyanouchi.com'
  const headers = { origin, 'sec-fetch-site': hostileOrigin ? 'cross-site' : 'same-origin' }
  if (auth) headers.cookie = cookie
  return new Request('https://tsuyanouchi.com/api/products/import', {
    method: 'POST', headers, body: form,
  })
}

test('invalid create payloads are rejected without any catalog write', async () => {
  const cases = [
    { ...valid, stock: -1 },
    { ...valid, stock: '5' },
    { ...valid, price: '12.50' },
    { ...valid, price: 0, sizes: [] },
    { ...valid, price: 1.234 },
    { ...valid, name: ' ' },
    { ...valid, category: '' },
    { ...valid, role: 'admin' },
    { ...valid, sizes: [{ label: '8" x 10"', price: 12.5 }, { label: '8" x 10"', price: 18 }] },
    { ...valid, sizes: [{ label: 'invalid size', price: 12.5 }] },
    { ...valid, image_url: 'javascript:alert(1)' },
    { ...valid, imageUrl: 'https://another.example.test/file.png' },
  ]
  for (const body of cases) {
    resetWrites()
    const response = await create(request('/api/products', 'POST', body))
    assert.equal(response.status, 400, JSON.stringify(body))
    assert.equal(writes.length, 0, JSON.stringify(body))
  }
  resetWrites()
  assert.equal((await create(request('/api/products', 'POST', '{invalid json', { raw: true }))).status, 400)
  assert.equal(writes.length, 0)
})

test('invalid, malicious and conflicting updates cannot reach persistence', async () => {
  const cases = [
    { payment_status: 'paid' },
    { price: '12.50' },
    { stock: 2.1 },
    { sizes: [{ label: 'bogus', price: 1 }] },
    { imageUrl: 'https://cdn.test/new.png', image_url: 'https://cdn.test/different.png' },
    {},
  ]
  for (const body of cases) {
    resetWrites()
    assert.equal((await update(request('/api/products/mock-product', 'PUT', body), params)).status, 400,
      JSON.stringify(body))
    assert.equal(writes.length, 0)
  }
})

test('valid authorized create and update persist only allowlisted normalized fields', async () => {
  resetWrites()
  const added = await create(request('/api/products', 'POST', valid))
  assert.equal(added.status, 201)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].method, 'create')
  assert.equal(writes[0].data.price, 12.5)
  const updated = await update(request('/api/products/mock-product', 'PUT', {
    stock: 0, imageUrl: 'https://cdn.test/safe.png',
  }), params)
  assert.equal(updated.status, 200)
  assert.equal(writes.length, 2)
  assert.deepEqual(writes[1].data, { stock: 0, image_url: 'https://cdn.test/safe.png' })
})

test('bulk delete rejects malformed, mixed, oversized and unauthorized batches before deleting', async () => {
  const endpoint = '/api/products/bulk-delete'
  const cases = [
    {}, { ids: [] }, { ids: 'mock-product' },
    { ids: ['mock-product', 7] }, { ids: ['mock-product', '   '] },
    { ids: Array.from({ length: 501 }, (_, i) => 'product-' + i) },
    { ids: ['mock-product'], role: 'owner' },
  ]
  for (const body of cases) {
    resetWrites()
    const response = await deleteMany(request(endpoint, 'POST', body))
    assert.equal(response.status, 400, JSON.stringify(body).slice(0, 120))
    assert.equal(writes.length, 0)
  }
  resetWrites()
  assert.equal((await deleteMany(request(endpoint, 'POST', { ids: ['valid'] }, { auth: false }))).status, 401)
  assert.equal((await deleteMany(request(endpoint, 'POST', { ids: ['valid'] }, { hostileOrigin: true }))).status, 403)
  assert.equal(writes.length, 0)

  const accepted = await deleteMany(request(endpoint, 'POST', { ids: ['product-a', 'product-a', 'product-b'] }))
  assert.equal(accepted.status, 200)
  assert.equal(writes.length, 2)
  assert.deepEqual(writes.map(x => x.id), ['product-a', 'product-b'])
})

test('CSV import checks authentication/origin before parsing or writing', async () => {
  const csv = 'name,category,productType,stock,price_8x10\nSample,Art Prints,1-piece,2,14.50'
  resetWrites()
  assert.equal((await importCsv(importRequest(csv, { auth: false }))).status, 401)
  assert.equal((await importCsv(importRequest(csv, { hostileOrigin: true }))).status, 403)
  assert.equal(writes.length, 0)
})

test('CSV invalid rows do not write while valid rows use the same product schema', async () => {
  resetWrites()
  const invalid = 'name,category,productType,stock,price_8x10\nBroken,Art Prints,1-piece,-1,11.00'
  const rejected = await importCsv(importRequest(invalid))
  assert.equal(rejected.status, 400)
  assert.equal(writes.length, 0)

  const partial = [
    'name,category,productType,stock,price_8x10',
    'Good Print,Art Prints,1-piece,2,14.50',
    'Bad Print,Art Prints,1-piece,2.5,14.50',
  ].join('\n')
  const response = await importCsv(importRequest(partial))
  assert.equal(response.status, 200)
  const summary = await response.json()
  assert.equal(summary.imported, 1)
  assert.equal(summary.skipped, 1)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].method, 'create')
  assert.equal(writes[0].data.name, 'Good Print')
})

test('CSV updating an existing product preserves its image when incoming CSV has none', async () => {
  resetWrites()
  setExistingProductByName('Existing Print', {
    id: 'existing-id', name: 'Existing Print', image_url: 'https://cdn.test/real-image.webp',
  })
  const csv = 'name,category,productType,stock,price_8x10\nExisting Print,Art Prints,1-piece,2,16.00'
  const response = await importCsv(importRequest(csv))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).updated, 1)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].method, 'update')
  assert.equal(writes[0].data.image_url, 'https://cdn.test/real-image.webp')
})
