import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { POST } from '../app/api/webhooks/stripe/route.ts'
import { setSyntheticSignature } from './fixtures/mock-next-headers.mjs'
import { resetMockOrders, setMockOrder, getOrder, orderMutations, failMockOrderWrite } from './fixtures/mock-catalog.mjs'
import { resetStripe, setWebhookSession, setPaymentSessions } from './fixtures/mock-stripe.mjs'
import { resetMockEmail, emailSends } from './fixtures/mock-email.mjs'

const oldWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
before(() => { process.env.STRIPE_WEBHOOK_SECRET = 'whsec_synthetic_never_used' })
after(() => {
  if (oldWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET
  else process.env.STRIPE_WEBHOOK_SECRET = oldWebhookSecret
  setSyntheticSignature(null)
})

function clear() {
  resetStripe()
  resetMockOrders()
  resetMockEmail()
  setSyntheticSignature('synthetic-signed-webhook-event')
}
function event(type, object, id='evt_synthetic_1') {
  return new Request('https://tsuyanouchi.com/api/webhooks/stripe', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, type, data: { object } }),
  })
}
function intent(id='pi_synthetic_1', orderId='ORD-SYNTHETIC') {
  return { id, metadata: { orderId } }
}
function paidSession(id='cs_synthetic_1', orderId='ORD-SYNTHETIC', intentId='pi_synthetic_1') {
  return {
    id, payment_status: 'paid', payment_intent: intentId,
    customer_email: 'synthetic-buyer@example.invalid',
    metadata: { orderId, addr_country: 'US', addr_city: 'Test City', addr_state:'NY' },
    amount_total: 1250,
    total_details: { amount_tax: 0, amount_shipping: 0 },
    line_items: {
      data: [
        { quantity: 1, amount_total:1250, price: { unit_amount: 1250,
          product: { name: 'Synthetic Art Print', metadata: {
            productId:'synthetic-product',sizeLabel:'8\" x 10\"',
          } } } },
      ],
    },
  }
}
function saved(orderId='ORD-SYNTHETIC', status='processing', paymentStatus='paid', intentId='pi_synthetic_1') {
  return { id:'synthetic-db-row',order_id:orderId,status,payment_status:paymentStatus,
    payment_intent_id:intentId }
}

test('webhook rejects a missing or invalid synthetic signature before any writes', async () => {
  clear()
  setSyntheticSignature(null)
  assert.equal((await POST(event('checkout.session.completed',{id:'cs_synthetic_1'}))).status,400)
  setSyntheticSignature('bad-signature')
  assert.equal((await POST(event('checkout.session.completed',{id:'cs_synthetic_1'}))).status,400)
  assert.equal(orderMutations.length,0)
  assert.equal(emailSends.length,0)
})

test('a completed UI checkout without confirmed payment cannot create or email an order', async () => {
  clear()
  setWebhookSession({ ...paidSession(), payment_status:'unpaid' })
  const response=await POST(event('checkout.session.completed',{id:'cs_synthetic_1'}))
  assert.equal(response.status,200)
  assert.equal(orderMutations.length,0)
  assert.equal(emailSends.length,0)
})

test('paid completion records and emails once, then suppresses duplicate settled notification', async () => {
  clear()
  setWebhookSession(paidSession())
  for (let index=0;index<2;index++) {
    const response=await POST(event('checkout.session.completed',{id:'cs_synthetic_1'}))
    assert.equal(response.status,200)
  }
  assert.equal((await getOrder('ORD-SYNTHETIC')).payment_status,'paid')
  assert.deepEqual(orderMutations.map(x=>x.kind),['create'])
  assert.deepEqual(emailSends.map(x=>x.kind),['customer','owner'])
})

test('out-of-order failed and canceled intent webhooks cannot downgrade a shipped paid order', async () => {
  clear()
  setMockOrder(saved('ORD-SYNTHETIC','shipped','paid'))
  for (const type of ['payment_intent.payment_failed','payment_intent.canceled']) {
    const response=await POST(event(type,intent()))
    assert.equal(response.status,200)
  }
  assert.equal((await getOrder('ORD-SYNTHETIC')).payment_status,'paid')
  assert.equal((await getOrder('ORD-SYNTHETIC')).status,'shipped')
  assert.equal(orderMutations.length,0)
  assert.equal(emailSends.length,0)
})

test('signed failures update matching unpaid orders but refuse a different payment intent', async () => {
  clear()
  setMockOrder(saved('ORD-SYNTHETIC','pending','pending'))
  assert.equal((await POST(event('payment_intent.payment_failed',intent()))).status,200)
  assert.equal((await getOrder('ORD-SYNTHETIC')).payment_status,'failed')
  assert.equal((await POST(event('payment_intent.canceled',intent('pi_other')))).status,200)
  assert.equal((await getOrder('ORD-SYNTHETIC')).payment_status,'failed')
  assert.deepEqual(orderMutations.map(x=>x.kind),['unpaid'])
})

test('an unrelated intent without a Tsuya order or Checkout Session does not trigger endless retries', async () => {
  clear()
  const response = await POST(event('payment_intent.succeeded',intent('pi_unrelated','')))
  assert.equal(response.status,200)
  assert.equal(orderMutations.length,0)
  assert.equal(emailSends.length,0)
})

test('an unmatched paid event requests Stripe retry; its next attempt can recover a paid order', async () => {
  clear()
  const paymentEvent=event('payment_intent.succeeded',intent())
  let response=await POST(paymentEvent)
  assert.equal(response.status,500)
  assert.equal(emailSends.length,0)
  setWebhookSession(paidSession())
  setPaymentSessions('pi_synthetic_1',['cs_synthetic_1'])
  response=await POST(event('payment_intent.succeeded',intent()))
  assert.equal(response.status,200)
  assert.deepEqual(orderMutations.map(x=>x.kind),['create'])
  assert.deepEqual(emailSends.map(x=>x.kind),['customer','owner'])
})

test('payment-intent success retries when its Checkout Session still reports an unpaid state',async()=>{
  clear()
  setWebhookSession({ ...paidSession(), payment_status:'unpaid' })
  setPaymentSessions('pi_synthetic_1',['cs_synthetic_1'])
  assert.equal((await POST(event('payment_intent.succeeded',intent()))).status,500)
  assert.equal(orderMutations.length,0)
  setWebhookSession(paidSession())
  assert.equal((await POST(event('payment_intent.succeeded',intent()))).status,200)
  assert.equal(orderMutations.length,1)
})

test('late succeeded event does not rewind a shipped paid order and mismatched intent is retryable',async()=>{
  clear()
  setMockOrder(saved('ORD-SYNTHETIC','shipped','paid'))
  assert.equal((await POST(event('payment_intent.succeeded',intent()))).status,200)
  assert.equal((await getOrder('ORD-SYNTHETIC')).status,'shipped')
  assert.equal(orderMutations.length,0)
  assert.equal((await POST(event('payment_intent.succeeded',intent('pi_different')))).status,500)
  assert.equal(orderMutations.length,0)
})

test('unavailable order persistence returns retryable 500 rather than acknowledging a failed transition',async()=>{
  clear()
  setMockOrder(saved('ORD-SYNTHETIC','pending','pending'))
  failMockOrderWrite(true)
  assert.equal((await POST(event('payment_intent.canceled',intent()))).status,500)
  assert.equal((await getOrder('ORD-SYNTHETIC')).payment_status,'pending')
})
