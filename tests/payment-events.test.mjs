// Task 10.1: claim/lease logic against an in-memory store that mirrors the SQL's atomic upsert.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { claimPaymentEvent, finishPaymentEvent } from '../lib/payment-events.ts'

function memStore() {
  const rows = new Map()
  return {
    rows,
    async claim(id) {
      const r = rows.get(id)
      if (!r) { rows.set(id, { status: 'processing', attempts: 1, expired: false }); return true }
      if (r.status === 'failed' || r.status === 'pending' || (r.status === 'processing' && r.expired)) {
        Object.assign(r, { status: 'processing', attempts: r.attempts + 1, expired: false }); return true
      }
      return false
    },
    async status(id) { return rows.get(id)?.status ?? null },
    async finish(id, ok) { const r = rows.get(id); if (r?.status === 'processing') r.status = ok ? 'processed' : 'failed' },
  }
}

test('first claim wins, second is in flight', async () => {
  const s = memStore()
  assert.equal(await claimPaymentEvent('evt_1', 't', s), 'claimed')
  assert.equal(await claimPaymentEvent('evt_1', 't', s), 'in_flight')
})

test('concurrent claims: exactly one claimed', async () => {
  const s = memStore()
  const res = await Promise.all(Array.from({ length: 10 }, () => claimPaymentEvent('evt_2', 't', s)))
  assert.equal(res.filter(r => r === 'claimed').length, 1)
})

test('processed event is a duplicate', async () => {
  const s = memStore()
  await claimPaymentEvent('evt_3', 't', s)
  await finishPaymentEvent('evt_3', true, s)
  assert.equal(await claimPaymentEvent('evt_3', 't', s), 'duplicate')
})

test('failed event is reclaimable, attempts increase', async () => {
  const s = memStore()
  await claimPaymentEvent('evt_4', 't', s)
  await finishPaymentEvent('evt_4', false, s)
  assert.equal(await claimPaymentEvent('evt_4', 't', s), 'claimed')
  assert.equal(s.rows.get('evt_4').attempts, 2)
})

test('expired lease is reclaimable', async () => {
  const s = memStore()
  await claimPaymentEvent('evt_5', 't', s)
  s.rows.get('evt_5').expired = true
  assert.equal(await claimPaymentEvent('evt_5', 't', s), 'claimed')
})

test('missing table (42P01) means unavailable, other errors propagate', async () => {
  const missing = { claim: async () => { throw Object.assign(new Error('x'), { code: '42P01' }) } }
  assert.equal(await claimPaymentEvent('e', 't', missing), 'unavailable')
  const boom = { claim: async () => { throw new Error('db down') } }
  await assert.rejects(claimPaymentEvent('e', 't', boom))
})
