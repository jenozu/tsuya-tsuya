import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { POST as adminLogin } from '../app/api/admin/auth/route.ts'
import { POST as checkout } from '../app/api/checkout/create-session/route.ts'
import { POST as waitlist } from '../app/api/waitlist/route.ts'
import { POST as upload } from '../app/api/admin/product-images/route.ts'
import { calls as stripeCalls, resetStripe } from './fixtures/mock-stripe.mjs'

const oldPassword = process.env.ADMIN_PASSWORD
const oldSecret = process.env.ADMIN_SESSION_SECRET
before(() => {
  process.env.ADMIN_PASSWORD = 'isolated-task-10-admin-password'
  process.env.ADMIN_SESSION_SECRET = 'isolated-task-10-signing-secret'
})
after(() => {
  if (oldPassword === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = oldPassword
  if (oldSecret === undefined) delete process.env.ADMIN_SESSION_SECRET
  else process.env.ADMIN_SESSION_SECRET = oldSecret
})
function jsonRequest(path, body, extraHeaders = {}) {
  return new Request('https://tsuyanouchi.com'+path, {
    method:'POST',
    headers:{
      origin:'https://tsuyanouchi.com',
      'sec-fetch-site':'same-origin',
      'content-type':'application/json',
      ...extraHeaders,
    },
    body,
  })
}
test('admin login rejects actual huge, forged-length, invalid and non-JSON payloads with no cookie',async()=>{
  for(const [body,headers,status] of [
    [JSON.stringify({password:'x'.repeat(10000)}),{},413],
    ['{}',{'content-length':'5000000'},413],
    ['{bad',{},400],
    ['{"password":"foo"}',{'content-type':'text/plain'},415],
  ]){
    const res=await adminLogin(jsonRequest('/api/admin/auth',body,headers))
    assert.equal(res.status,status)
    assert.equal(res.headers.get('set-cookie'),null)
    assert.equal(res.headers.get('cache-control'),'no-store')
  }
})
test('admin login accepts valid bounded request with signed HTTP-only session',async()=>{
  const res=await adminLogin(jsonRequest('/api/admin/auth',JSON.stringify({password:'isolated-task-10-admin-password'})))
  assert.equal(res.status,200)
  assert.match(res.headers.get('set-cookie'),/HttpOnly/)
  assert.equal(res.headers.get('cache-control'),'no-store')
})
test('waitlist refuses giant/non-JSON input before database or email operations',async()=>{
  for(const [body,headers,status] of [
    [JSON.stringify({email:'x'.repeat(5000)}),{},413],
    ['{"email":"x@y.invalid"}',{'content-type':'text/plain'},415],
  ]){
    const res=await waitlist(jsonRequest('/api/waitlist',body,headers))
    assert.equal(res.status,status)
  }
})
test('checkout oversized streamed payload fails before even calling Stripe',async()=>{
  resetStripe()
  const res=await checkout(jsonRequest('/api/checkout/create-session',
    JSON.stringify({items:[],padding:'x'.repeat(40000)})))
  assert.equal(res.status,413)
  assert.equal(stripeCalls.length,0)
})
test('admin image upload rejects giant declared multipart size before parsing',async()=>{
  const login=await adminLogin(jsonRequest('/api/admin/auth',JSON.stringify({password:'isolated-task-10-admin-password'})))
  const cookie=login.headers.get('set-cookie').split(';')[0]
  const res=await upload(jsonRequest('/api/admin/product-images','malformed-partial-upload',{
    cookie,'content-type':'multipart/form-data; boundary=123',
    'content-length':String(20*1024*1024),
  }))
  assert.equal(res.status,413)
  assert.deepEqual(await res.json(),{error:'Image request is too large'})
})
