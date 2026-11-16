// Task 20: signed events update the order and send exactly one shipped email; unsigned/tampered are rejected.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHmac } from 'node:crypto'
import { handlePrintifyWebhook } from '../lib/printify-webhook.ts'

const SECRET = 'test-secret'
const sign = (b) => 'sha256=' + createHmac('sha256', SECRET).update(b).digest('hex')
const evt = (id, type, data = {}) => JSON.stringify({ id, type, resource: { id: 'P1', type: 'order', data } })

function fake() {
  const s = { events: new Set(), advances: [], claimed: false, mails: [] }
  s.store = {
    recordEvent: async (id) => !s.events.has(id) && (s.events.add(id), true),
    forgetEvent: async (id) => { s.events.delete(id) },
    advance: async (...a) => { s.advances.push(a) },
    claimShippedEmail: async () => (s.claimed ? null : (s.claimed = true, { orderId: 'O1', email: 'a@b.co', tracking: { number: '9' } })),
    releaseShippedEmail: async () => { s.claimed = false },
  }
  s.send = async (...a) => (s.mails.push(a), s.sendOk !== false)
  return s
}
const run = (s, body, sig = sign(body)) => handlePrintifyWebhook(body, sig, SECRET, s.store, s.send)

test('signed shipment event updates order and sends one email; replay and second event add none', async () => {
  const s = fake()
  const body = evt('E1', 'order:shipment:created', { carrier: { code: 'usps' }, tracking_number: '9', tracking_url: 'https://t.example/9' })
  assert.equal(await run(s, body), 'processed')
  assert.equal(await run(s, body), 'duplicate')
  assert.equal(await run(s, evt('E2', 'order:shipment:created', { tracking_number: '9' })), 'processed')
  assert.equal(s.mails.length, 1)
  assert.deepEqual(s.advances[0].slice(0, 3), ['P1', 'shipped', ['submitted', 'in_production']])
  assert.equal(s.advances[0][3].carrier, 'usps')
})

test('unsigned, wrongly signed and tampered events are rejected with no side effects', async () => {
  const s = fake()
  const body = evt('E1', 'order:shipment:created', { tracking_number: '9' })
  assert.equal(await run(s, body, null), 'invalid_signature')
  assert.equal(await run(s, body, 'sha256=00'), 'invalid_signature')
  assert.equal(await run(s, body.replace('"9"', '"8"'), sign(body)), 'invalid_signature')
  assert.equal(s.events.size + s.advances.length + s.mails.length, 0)
})

test('failed email lets the event be retried and sends again', async () => {
  const s = fake(); s.sendOk = false
  const body = evt('E1', 'order:shipment:created')
  assert.equal(await run(s, body), 'error')
  s.sendOk = true
  assert.equal(await run(s, body), 'processed')
  assert.equal(s.mails.length, 2)
})

test('unknown topics are ignored; production and delivered move state without email', async () => {
  const s = fake()
  assert.equal(await run(s, evt('E1', 'order:created')), 'ignored')
  assert.equal(await run(s, evt('E2', 'order:sent-to-production')), 'processed')
  assert.equal(await run(s, evt('E3', 'order:shipment:delivered')), 'processed')
  assert.equal(s.mails.length, 0)
  assert.equal(s.advances[1][1], 'delivered')
})

test('admin tracking view keeps state and tracking, drops non-http(s) links', async () => {
  const { toAdminTracking } = await import('../lib/printify-store.ts')
  assert.deepEqual(
    toAdminTracking({ state: 'shipped', tracking_carrier: 'usps', tracking_number: '9', tracking_url: 'https://t.example/9' }),
    { state: 'shipped', carrier: 'usps', number: '9', url: 'https://t.example/9' },
  )
  assert.equal(toAdminTracking({ state: 'shipped', tracking_url: 'javascript:alert(1)' }).url, null)
  assert.deepEqual(toAdminTracking({ state: 'in_production' }), { state: 'in_production', carrier: null, number: null, url: null })
})
