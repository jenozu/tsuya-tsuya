// Task 26.1: refund helper + charge.refunded sync, mock-stripe only (no live refund path exists in tests).
import assert from 'node:assert/strict'
import { test, beforeEach } from 'node:test'
import { issueRefund, syncChargeRefunded } from '../lib/refund-service.ts'
import { stripe, setCharge, refundCalls, resetStripe } from './fixtures/mock-stripe.mjs'
import { applyRefundToOrder, setMockOrder, resetMockOrders, orderMutations } from './fixtures/mock-catalog.mjs'

const order = { order_id: 'ORD-1', payment_intent_id: 'pi_1', payment_status: 'paid' }
beforeEach(() => { resetStripe(); setCharge('pi_1', 5000) })
let n = 0
const tok = () => 'tok_refund_' + String(++n)

test('refuses without explicit confirmation', async () => {
  for (const confirmed of [false, undefined, 'true', 1]) {
    assert.deepEqual(await issueRefund(order, { confirmed, idempotencyToken: tok() }, stripe), { ok: false, reason: 'not_confirmed' })
  }
  assert.equal(refundCalls.length, 0)
})

test('full refund, partial refund, and amount validation against remaining', async () => {
  const part = await issueRefund(order, { confirmed: true, idempotencyToken: tok(), amountCents: 1200 }, stripe)
  assert.deepEqual([part.ok, part.amountCents, part.remainingCents], [true, 1200, 3800])
  const over = await issueRefund({ ...order, payment_status: 'partially_refunded' }, { confirmed: true, idempotencyToken: tok(), amountCents: 3801 }, stripe)
  assert.deepEqual(over, { ok: false, reason: 'exceeds_remaining' })
  for (const amountCents of [0, -5, 1.5, NaN]) {
    assert.equal((await issueRefund(order, { confirmed: true, idempotencyToken: tok(), amountCents }, stripe)).reason, 'invalid_amount')
  }
  const full = await issueRefund(order, { confirmed: true, idempotencyToken: tok() }, stripe)
  assert.deepEqual([full.ok, full.amountCents, full.remainingCents], [true, 3800, 0])
  assert.equal((await issueRefund(order, { confirmed: true, idempotencyToken: tok() }, stripe)).reason, 'not_refundable')
  assert.equal(refundCalls.length, 2)
})

test('idempotency token is required and replays the same Stripe refund on retry', async () => {
  for (const idempotencyToken of [undefined, '', 'short', 'has spaces in it', 42]) {
    assert.equal((await issueRefund(order, { confirmed: true, idempotencyToken, amountCents: 100 }, stripe)).reason, 'missing_idempotency_token')
  }
  const first = await issueRefund(order, { confirmed: true, idempotencyToken: 'tok_retry_1', amountCents: 1000 }, stripe)
  // Lost response, admin retries with the same token: Stripe replays, no second refund.
  const retry = await issueRefund({ ...order, payment_status: 'partially_refunded' },
    { confirmed: true, idempotencyToken: 'tok_retry_1', amountCents: 1000 }, stripe)
  assert.equal(first.ok, true); assert.equal(retry.ok, true)
  assert.equal(retry.refundId, first.refundId)
  assert.equal(refundCalls.length, 1)
  // Same token, different amount: rejected like Stripe does.
  const changed = await issueRefund(order, { confirmed: true, idempotencyToken: 'tok_retry_1', amountCents: 500 }, stripe)
  assert.deepEqual(changed, { ok: false, reason: 'stripe_error' })
  assert.equal(refundCalls.length, 1)
  assert.equal(refundCalls[0].options.idempotencyKey, 'refund-ORD-1-tok_retry_1')
})

test('unpaid or unbound orders are not refundable', async () => {
  assert.equal((await issueRefund({ ...order, payment_status: 'pending' }, { confirmed: true, idempotencyToken: tok() }, stripe)).reason, 'not_refundable')
  assert.equal((await issueRefund({ ...order, payment_intent_id: undefined }, { confirmed: true, idempotencyToken: tok() }, stripe)).reason, 'not_refundable')
  assert.equal(refundCalls.length, 0)
})

function deps() {
  const sent = new Set(); const emails = []; const states = []
  return {
    emails, states,
    async applyRefund(pi, state) { states.push(state); return pi === 'pi_1' ? { order_id: 'ORD-1', email: 'a@example.invalid' } : null },
    async sendOnce(id, kind, send) { if (sent.has(id + kind)) return 'duplicate'; sent.add(id + kind); return (await send()) ? 'sent' : 'failed' },
    async sendRefundEmail(to, id) { emails.push([to, id]); return true },
  }
}

test('charge.refunded syncs state idempotently and emails once, partial then full', async () => {
  const d = deps()
  assert.equal(await syncChargeRefunded({ payment_intent: 'pi_1', amount: 5000, amount_refunded: 1000 }, d), 'synced')
  assert.equal(await syncChargeRefunded({ payment_intent: 'pi_1', amount: 5000, amount_refunded: 1000 }, d), 'synced')
  assert.equal(await syncChargeRefunded({ payment_intent: 'pi_1', amount: 5000, amount_refunded: 5000 }, d), 'synced')
  assert.deepEqual(d.states, ['partially_refunded', 'partially_refunded', 'refunded'])
  assert.equal(d.emails.length, 1)
})

test('unknown intent, no refunded amount, and failed email', async () => {
  const d = deps()
  assert.equal(await syncChargeRefunded({ payment_intent: 'pi_x', amount: 5000, amount_refunded: 5000 }, d), 'no_order')
  assert.equal(await syncChargeRefunded({ id: 'ch', amount: 5000 }, d), 'ignored')
  assert.equal(await syncChargeRefunded({ payment_intent: 'pi_1', amount: 5000, amount_refunded: 0 }, d), 'ignored')
  const bad = { ...deps(), sendRefundEmail: async () => false }
  await assert.rejects(syncChargeRefunded({ payment_intent: 'pi_1', amount: 5000, amount_refunded: 5000 }, bad))
})

test('stale partial refund after full refund never downgrades the order (out-of-order delivery)', async () => {
  resetMockOrders()
  setMockOrder({ order_id: 'ORD-9', payment_intent_id: 'pi_9', payment_status: 'paid', email: 'b@example.invalid' })
  const sent = new Set(); const emails = []
  const d = {
    applyRefund: applyRefundToOrder,
    async sendOnce(id, kind, send) { if (sent.has(id + kind)) return 'duplicate'; sent.add(id + kind); return (await send()) ? 'sent' : 'failed' },
    async sendRefundEmail(_to, id) { emails.push(id); return true },
  }
  assert.equal(await syncChargeRefunded({ payment_intent: 'pi_9', amount: 5000, amount_refunded: 5000 }, d), 'synced')
  assert.equal(await syncChargeRefunded({ payment_intent: 'pi_9', amount: 5000, amount_refunded: 1000 }, d), 'synced')
  assert.deepEqual(orderMutations.map((m) => m.state), ['refunded', 'refunded'])
  assert.equal(emails.length, 1)
  setMockOrder({ order_id: 'ORD-8', payment_intent_id: 'pi_8', payment_status: 'pending' })
  assert.equal(await applyRefundToOrder('pi_8', 'refunded'), null)
})

test('applyRefundToOrder SQL is monotonic (refunded is never downgraded)', async () => {
  const { readFile } = await import('node:fs/promises')
  const src = (await readFile(new URL('../lib/data.ts', import.meta.url), 'utf8')).replace(/\r\n/g, '\n')
  const fn = src.slice(src.indexOf('export async function applyRefundToOrder'))
  assert.match(fn.slice(0, 1200), /CASE WHEN payment_status = 'refunded' THEN 'refunded' ELSE \$\{state\} END/)
})
