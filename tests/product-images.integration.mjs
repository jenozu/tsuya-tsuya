import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import sharp from 'sharp'
import { POST, DELETE } from '../app/api/admin/product-images/route.ts'
import { createAdminSessionToken } from '../lib/admin-session.ts'
import { resetR2, writes, failPutOnce, failDeleteOnce } from './fixtures/mock-r2.mjs'

const oldSecret = process.env.ADMIN_SESSION_SECRET
const oldPassword = process.env.ADMIN_PASSWORD
let cookie
before(async () => {
  process.env.ADMIN_SESSION_SECRET = 'isolated-image-test-key-never-for-production'
  process.env.ADMIN_PASSWORD = 'isolated-image-test-password'
  cookie = 'admin_session=' + encodeURIComponent(await createAdminSessionToken())
})
after(() => {
  if (oldSecret === undefined) delete process.env.ADMIN_SESSION_SECRET
  else process.env.ADMIN_SESSION_SECRET = oldSecret
  if (oldPassword === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = oldPassword
})

function headers({auth = true, hostile = false} = {}) {
  const result = {
    origin: hostile ? 'https://attacker.example.invalid' : 'https://tsuyanouchi.com',
    'sec-fetch-site': hostile ? 'cross-site' : 'same-origin',
  }
  if (auth) result.cookie = cookie
  return result
}
function upload(bytes, mime = 'image/png', options = {}) {
  const form = new FormData()
  if (bytes !== null) form.set('file', new File([bytes], 'test-image.png', {type:mime}))
  return new Request('https://tsuyanouchi.com/api/admin/product-images', {
    method:'POST', headers:headers(options), body:form,
  })
}
function remove(body, options = {}) {
  return new Request('https://tsuyanouchi.com/api/admin/product-images', {
    method:'DELETE', headers:{...headers(options), 'content-type':'application/json'},
    body:JSON.stringify(body),
  })
}
const image = async () => sharp({create:{width:4,height:3,channels:3,background:'white'}}).png().toBuffer()

test('upload authenticates and checks Origin before reading image or writing to R2', async () => {
  resetR2()
  const png = await image()
  assert.equal((await POST(upload(png, 'image/png', {auth:false}))).status, 401)
  assert.equal((await POST(upload(png, 'image/png', {hostile:true}))).status, 403)
  assert.equal(writes.length, 0)
})

test('actual upload handler rejects absent, oversized and spoofed data before storage', async () => {
  resetR2()
  assert.equal((await POST(upload(null))).status, 400)
  assert.equal((await POST(upload(Buffer.alloc(0)))).status, 413)
  assert.equal((await POST(upload(Buffer.alloc(10*1024*1024+1)))).status, 413)
  assert.equal((await POST(upload(Buffer.from('<svg onload=alert(1)>')))).status, 400)
  assert.equal((await POST(upload(await image(), 'image/jpeg'))).status, 400)
  assert.equal(writes.length, 0)
})

test('genuine validated image writes exactly once with a generated product-scoped key', async () => {
  resetR2()
  const png = await image()
  const response = await POST(upload(png))
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.match(result.key, /^products\/\d{4}-\d{2}-\d{2}\/[\da-f-]{36}\.png$/)
  assert.equal(result.url, 'https://test-r2.example.invalid/' + result.key)
  assert.equal(result.bytes, png.length)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].action, 'put')
  assert.equal(writes[0].contentType, 'image/png')
  assert.equal(writes[0].key, result.key)
  assert.deepEqual(writes[0].body, png)
})

test('storage failures disclose neither provider errors nor write a success result', async () => {
  resetR2()
  failPutOnce()
  const original = console.error
  const log = []
  try {
    console.error = line => log.push(String(line))
    const response = await POST(upload(await image()))
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), {error:'Image upload failed'})
    assert.doesNotMatch(JSON.stringify(log), /PRIVATE_R2_WRITE_ERROR/)
  } finally { console.error = original }
  assert.equal(writes.length, 0)
})

test('actual deletion handler denies unauthenticated and foreign-origin requests', async () => {
  resetR2()
  const body = {key:'products/2026-09-28/example.png'}
  assert.equal((await DELETE(remove(body, {auth:false}))).status, 401)
  assert.equal((await DELETE(remove(body, {hostile:true}))).status, 403)
  assert.equal(writes.length, 0)
})

test('actual deletion handler rejects missing or non-product keys and resolves public image URLs', async () => {
  resetR2()
  for (const body of [{}, {key:'private/admin-key'}, {url:'https://attacker.invalid/products/a.png'}]) {
    assert.equal((await DELETE(remove(body))).status, 400)
  }
  assert.equal(writes.length, 0)
  const key = 'products/2026-09-28/test-image.png'
  const response = await DELETE(remove({url:'https://test-r2.example.invalid/'+key}))
  assert.equal(response.status, 200)
  assert.deepEqual(writes, [{action:'delete',key}])
})

test('deletion error returns generic response without exposing provider metadata', async () => {
  resetR2()
  failDeleteOnce()
  const original = console.error
  const log = []
  try {
    console.error = line => log.push(String(line))
    const response = await DELETE(remove({key:'products/2026-09-28/test-image.png'}))
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), {error:'Image deletion failed'})
    assert.doesNotMatch(JSON.stringify(log), /PRIVATE_R2_DELETE_ERROR/)
  } finally { console.error = original }
  assert.equal(writes.length, 0)
})
