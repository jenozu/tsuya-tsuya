import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { POST } from '../app/api/products/route.ts'
import { PUT, DELETE } from '../app/api/products/[id]/route.ts'
import { createAdminSessionToken } from '../lib/admin-session.ts'
import { resetWrites, writes } from './fixtures/mock-catalog.mjs'

const previousSecret = process.env.ADMIN_SESSION_SECRET
const previousPassword = process.env.ADMIN_PASSWORD
let cookie

before(async () => {
  process.env.ADMIN_PASSWORD = 'test-only-password'
  process.env.ADMIN_SESSION_SECRET = 'independent-test-signature-secret-never-live'
  cookie = 'admin_session=' + encodeURIComponent(await createAdminSessionToken())
})
after(() => {
  if (previousSecret === undefined) delete process.env.ADMIN_SESSION_SECRET
  else process.env.ADMIN_SESSION_SECRET = previousSecret
  if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = previousPassword
})

const valid = {
  name: 'Approved print', category: 'Art Prints', price: 12.50,
  image_url: '/product-placeholder.svg', stock: 3,
  sizes: [{ label: '8" x 10"', price: 12.50 }],
}
function request(path, method, body, { origin='https://tsuyanouchi.com', authenticated=true }={}) {
  const headers = {
    'content-type': 'application/json',
    origin,
    'sec-fetch-site': origin === 'https://tsuyanouchi.com' ? 'same-origin' : 'cross-site',
  }
  if (authenticated) headers.cookie = cookie
  return new Request('https://tsuyanouchi.com' + path, {
    method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}
const productPath = '/api/products'
const itemPath = '/api/products/mock-product'
const params = { params: Promise.resolve({ id: 'mock-product' }) }

test('actual POST handler rejects missing session, foreign Origin and invalid payload before DB call', async () => {
  resetWrites()
  assert.equal((await POST(request(productPath, 'POST', valid, { authenticated:false }))).status, 401)
  assert.equal((await POST(request(productPath, 'POST', valid, { origin:'https://attacker.example' }))).status, 403)
  assert.equal((await POST(request(productPath, 'POST', { ...valid, stock:-1 }))).status, 400)
  assert.equal((await POST(request(productPath, 'POST', { ...valid, price:'0.01' }))).status, 400)
  assert.equal(writes.length, 0)
})

test('actual PUT and DELETE handlers protect writes before persistence', async () => {
  resetWrites()
  assert.equal((await PUT(request(itemPath, 'PUT', { stock: 2 }, { authenticated:false }), params)).status, 401)
  assert.equal((await PUT(request(itemPath, 'PUT', { stock: 2 }, { origin:'https://evil.example' }), params)).status, 403)
  assert.equal((await PUT(request(itemPath, 'PUT', { stock: 1.5 }), params)).status, 400)
  assert.equal((await DELETE(request(itemPath, 'DELETE', undefined, { authenticated:false }), params)).status, 401)
  assert.equal((await DELETE(request(itemPath, 'DELETE', undefined, { origin:'https://evil.example' }), params)).status, 403)
  assert.equal(writes.length, 0)
})

test('valid authorized route operations write once and only whitelisted fields', async () => {
  resetWrites()
  const added = await POST(request(productPath, 'POST', valid))
  assert.equal(added.status, 201)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].method, 'create')
  assert.equal(writes[0].data.stock, 3)
  const updated = await PUT(request(itemPath, 'PUT', { stock: 2 }), params)
  assert.equal(updated.status, 200)
  assert.equal(writes[1].method, 'update')
  assert.deepEqual(writes[1].data, { stock: 2 })
  const deleted = await DELETE(request(itemPath, 'DELETE'), params)
  assert.equal(deleted.status, 200)
  assert.equal(writes[2].method, 'delete')
  assert.equal(writes.length, 3)
})
