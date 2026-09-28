import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkoutAttemptForPayload, clearCheckoutAttempt, payloadDigest } from '../lib/checkout-attempt-client.ts'
const firstId='11111111-1111-4111-8111-111111111111'
const nextId='22222222-2222-4222-8222-222222222222'
function memoryStorage() {
  const state=new Map()
  return {
    getItem:key=>state.get(key)??null,
    setItem:(key,value)=>state.set(key,value),
    removeItem:key=>state.delete(key),
    snapshot:()=>Array.from(state.values()),
  }
}
test('same checkout details reuse attempt on refresh and rotation follows changed cart or address',async()=>{
  const store=memoryStorage()
  const digest=await payloadDigest({cart:['size-one'],email:'synthetic@example.invalid'})
  const edited=await payloadDigest({cart:['size-two'],email:'synthetic@example.invalid'})
  assert.notEqual(digest,edited)
  assert.equal(checkoutAttemptForPayload(store,digest,1000,()=>firstId),firstId)
  assert.equal(checkoutAttemptForPayload(store,digest,2000,()=>nextId),firstId)
  assert.equal(checkoutAttemptForPayload(store,edited,3000,()=>nextId),nextId)
  // No raw email/address is stored; only digest and random attempt ID.
  assert.doesNotMatch(store.snapshot().join(' '),/synthetic@example.invalid|size-two/)
  clearCheckoutAttempt(store)
  assert.equal(store.snapshot().length,0)
})
test('stale, malformed or unavailable browser storage never reuses an unsafe attempt',()=>{
  const store=memoryStorage()
  const digest='digest'
  const start=1000
  assert.equal(checkoutAttemptForPayload(store,digest,start,()=>firstId),firstId)
  assert.equal(checkoutAttemptForPayload(store,digest,start+21*60*60*1000,()=>nextId),nextId)
  store.setItem('tsuya_checkout_attempt_v1','{broken')
  assert.equal(checkoutAttemptForPayload(store,digest,start,()=>firstId),firstId)
  const unavailable={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}}
  assert.equal(checkoutAttemptForPayload(unavailable,digest,start,()=>nextId),nextId)
})
