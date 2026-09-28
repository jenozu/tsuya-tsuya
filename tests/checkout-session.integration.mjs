import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { NextRequest } from 'next/server.js'
import { POST } from '../app/api/checkout/create-session/route.ts'
import { computeTaxAmount } from '../lib/tax.ts'
import { checkoutAttemptIdentity, checkoutSessionAvailability } from '../lib/checkout-attempt.ts'
import { calls, resetStripe, expireSession, markSession } from './fixtures/mock-stripe.mjs'

const beforeStripeKey = process.env.STRIPE_SECRET_KEY
const beforeSite = process.env.SITE_URL
before(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_SYNTHETIC_NEVER_USED_WITH_PROVIDER'
  process.env.SITE_URL = 'https://tsuyanouchi.com'
})
after(() => {
  if (beforeStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY
  else process.env.STRIPE_SECRET_KEY = beforeStripeKey
  if (beforeSite === undefined) delete process.env.SITE_URL
  else process.env.SITE_URL = beforeSite
})
const a = '11111111-1111-4111-8111-111111111111'
const b = '22222222-2222-4222-8222-222222222222'
const payload = {
  items:[{id:'mock-product',quantity:1,sizeLabel:'8" x 10"'}],
  subtotal:12.5,shipping:0,
  tax:computeTaxAmount(12.5,'US','NY'),
  email:'synthetic@example.invalid',
  shipping_address:{
    firstName:'Test',lastName:'Buyer',address:'123 Synthetic Street',
    city:'Testville',state:'NY',postalCode:'10001',country:'US',
  },
}
function request(attempt, body=payload, options={}) {
  const headers = {
    origin:options.hostile?'https://attacker.invalid':'https://tsuyanouchi.com',
    'sec-fetch-site':options.hostile?'cross-site':'same-origin',
    'content-type':'application/json',
    ...(attempt === undefined?{}:{'x-checkout-attempt':attempt}),
  }
  return new NextRequest('https://tsuyanouchi.com/api/checkout/create-session',{
    method:'POST',headers,body:JSON.stringify(body),
  })
}

test('stable opaque identifiers accept only UUIDv4 and never leak the client UUID or signing secret', () => {
  const first=checkoutAttemptIdentity(a,'synthetic-signing-key')
  assert.equal(first.orderId,checkoutAttemptIdentity(a,'synthetic-signing-key').orderId)
  assert.notEqual(first.orderId,checkoutAttemptIdentity(b,'synthetic-signing-key').orderId)
  assert.match(first.orderId,/^ORD-[0-9A-F]{20}$/)
  assert.doesNotMatch(JSON.stringify(first),/11111111|synthetic-signing/)
  assert.throws(()=>checkoutAttemptIdentity('bad','secret'))
})
test('session availability refuses expired/completed and missing URLs', () => {
  assert.equal(checkoutSessionAvailability({status:'open',expires_at:100,url:'https://stripe.invalid'},101),'expired')
  assert.equal(checkoutSessionAvailability({status:'complete',url:'https://stripe.invalid'}),'completed')
  assert.equal(checkoutSessionAvailability({status:'open',url:null}),'unavailable')
  assert.equal(checkoutSessionAvailability({status:'open',url:'https://stripe.invalid'}),'open')
})
test('two repeated requests share the same Stripe session, return URL and order ID',async()=>{
  resetStripe()
  const first=await POST(request(a))
  const second=await POST(request(a))
  assert.equal(first.status,200)
  assert.equal(second.status,200)
  const f=await first.json(),s=await second.json()
  assert.deepEqual(f,s)
  assert.equal(calls.length,2)
  assert.equal(calls[0].options.idempotencyKey,calls[1].options.idempotencyKey)
  assert.equal(calls[0].params.metadata.orderId,f.orderId)
  assert.ok(f.url.startsWith('https://checkout.stripe.example.invalid/'))
  assert.ok(calls[0].params.success_url.includes(f.orderId))
  assert.ok(calls[0].params.cancel_url.endsWith('/checkout?canceled=1'))
})
test('distinct checkout attempts create independent sessions without exposing customer details in key',async()=>{
  resetStripe()
  const first=await(await POST(request(a))).json()
  const second=await(await POST(request(b))).json()
  assert.notEqual(first.sessionId,second.sessionId)
  assert.notEqual(first.orderId,second.orderId)
  assert.notEqual(calls[0].options.idempotencyKey,calls[1].options.idempotencyKey)
  assert.ok(!calls[0].options.idempotencyKey.includes(payload.email))
})
test('bad UUID, wrong origin and invalid totals never contact Stripe',async()=>{
  resetStripe()
  assert.equal((await POST(request('not-a-uuid'))).status,400)
  assert.equal((await POST(request(a,payload,{hostile:true}))).status,403)
  assert.equal((await POST(request(a,{...payload,subtotal:9.00}))).status,409)
  assert.equal((await POST(request(a,{...payload,items:[{...payload.items[0],quantity:99}]}))).status,400)
  assert.equal(calls.length,0)
})
test('same attempt with changed details fails closed instead of opening another paid session',async()=>{
  resetStripe()
  assert.equal((await POST(request(a))).status,200)
  const response=await POST(request(a,{...payload,email:'another@example.invalid'}))
  assert.equal(response.status,500)
  assert.deepEqual(await response.json(),{error:'Unable to start checkout. Please try again.'})
  assert.equal(calls.length,2)
  assert.equal(calls[0].options.idempotencyKey,calls[1].options.idempotencyKey)
})
test('expired or already completed sessions never return an actionable checkout URL',async()=>{
  resetStripe()
  assert.equal((await POST(request(a))).status,200)
  const key=calls[0].options.idempotencyKey
  expireSession(key)
  const expired=await POST(request(a))
  assert.equal(expired.status,409)
  assert.deepEqual((await expired.json()).code,'CHECKOUT_SESSION_EXPIRED')
  resetStripe()
  assert.equal((await POST(request(a))).status,200)
  markSession(calls[0].options.idempotencyKey,'complete')
  const completed=await POST(request(a))
  assert.equal(completed.status,409)
  assert.deepEqual((await completed.json()).code,'CHECKOUT_ALREADY_COMPLETED')
})
