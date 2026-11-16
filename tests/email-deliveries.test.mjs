// Task 10.2: order present and no email -> retry sends exactly once.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sendOrderEmailsOnce } from '../lib/email-deliveries.ts'

function memStore() {
  const rows = new Map()
  return {
    async claim(o, k) {
      const key = o + k, r = rows.get(key)
      if (!r || r === 'failed' || r === 'pending') { rows.set(key, 'sending'); return true }
      return false
    },
    async finish(o, k, ok) { rows.set(o + k, ok ? 'sent' : 'failed') },
  }
}

test('failed email is retried once; sent ones are not resent', async () => {
  const s = memStore(), calls = { customer: 0, owner: 0 }
  let ownerOk = false
  const senders = {
    customer: async () => (calls.customer++, true),
    owner: async () => (calls.owner++, ownerOk),
  }
  assert.equal(await sendOrderEmailsOnce('O1', senders, s), false)
  ownerOk = true
  assert.equal(await sendOrderEmailsOnce('O1', senders, s), true)
  assert.equal(await sendOrderEmailsOnce('O1', senders, s), true)
  assert.deepEqual(calls, { customer: 1, owner: 2 })
})

test('missing table answers null', async () => {
  const s = { claim: async () => { throw Object.assign(new Error('x'), { code: '42P01' }) }, finish: async () => {} }
  assert.equal(await sendOrderEmailsOnce('O2', { customer: async () => true, owner: async () => true }, s), null)
})
