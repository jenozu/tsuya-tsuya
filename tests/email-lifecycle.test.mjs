import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  renderOrderCanceledHtml, renderOrderRefundedHtml, renderPaymentFailedHtml,
} from '../lib/email-templates/order-lifecycle.ts'
import { renderOrderShippedHtml } from '../lib/email-templates/order-shipped.ts'
import { sendLifecycleEmailOnce } from '../lib/email-deliveries.ts'

const evil = '<script>x</script>"&'
const noRaw = (h) => {
  assert.ok(!h.includes('<script>x'))
  assert.ok(h.includes('&lt;script&gt;x&lt;/script&gt;'))
}

test('shipped, canceled, refunded, payment-failed templates escape input', () => {
  noRaw(renderOrderShippedHtml(evil, { carrier: evil }))
  noRaw(renderOrderCanceledHtml(evil, evil))
  noRaw(renderOrderRefundedHtml(evil, evil))
  noRaw(renderPaymentFailedHtml(evil, 'https://x.example/?a="b"<c>'))
  assert.ok(!renderPaymentFailedHtml('1', 'javascript:alert(1)').includes('javascript:'))
  assert.ok(!renderPaymentFailedHtml('1', 'https://x.example/?a="b"').includes('a="b"'))
})

function memStore() {
  const rows = new Map()
  return {
    async claim(o, k) {
      const key = `${o}:${k}`
      const st = rows.get(key)
      if (st === 'sent' || st === 'sending') return false
      rows.set(key, 'sending')
      return true
    },
    async finish(o, k, ok) { rows.set(`${o}:${k}`, ok ? 'sent' : 'failed') },
  }
}

test('lifecycle email: sent once, duplicate suppressed, failure retryable', async () => {
  const store = memStore()
  let n = 0
  assert.equal(await sendLifecycleEmailOnce('o1', 'refunded', async () => (n++, false), store), 'failed')
  assert.equal(await sendLifecycleEmailOnce('o1', 'refunded', async () => (n++, true), store), 'sent')
  assert.equal(await sendLifecycleEmailOnce('o1', 'refunded', async () => (n++, true), store), 'duplicate')
  assert.equal(n, 2)
  assert.equal(await sendLifecycleEmailOnce('o1', 'canceled', async () => { throw new Error('x') }, store), 'failed')
})

test('lifecycle email: missing table or unwidened CHECK -> unavailable', async () => {
  for (const code of ['42P01', '23514']) {
    const store = { claim: async () => { throw Object.assign(new Error('x'), { code }) }, finish: async () => {} }
    assert.equal(await sendLifecycleEmailOnce('o', 'shipped', async () => true, store), 'unavailable')
  }
})
