import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderOrderShippedHtml } from '../lib/email-templates/order-shipped.ts'
import { getConfiguredEmailDelivery } from '../lib/email-config.ts'

test('shipping email escapes hostile input and rejects non-http tracking urls', () => {
  const html = renderOrderShippedHtml('<script>x</script>', {
    carrier: `"><img src=x>`, number: "O'1", url: 'https://t.example/?a="b"&c=<d>',
  })
  assert.ok(!html.includes('<script>x'))
  assert.ok(!html.includes('<img src=x>'))
  assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt;'))
  assert.ok(html.includes('O&#39;1'))
  assert.ok(!html.includes('href="https://t.example/?a="b"'))
  assert.ok(!renderOrderShippedHtml('1', { url: 'javascript:alert(1)' }).includes('javascript:'))
})

test('from-address comes only from RESEND_FROM_EMAIL', () => {
  const old = process.env.RESEND_FROM_EMAIL
  try {
    delete process.env.RESEND_FROM_EMAIL
    assert.equal(getConfiguredEmailDelivery(), null)
    process.env.RESEND_FROM_EMAIL = 'Shop <sender@brand-store.com>'
    assert.equal(getConfiguredEmailDelivery().from, 'Shop <sender@brand-store.com>')
  } finally {
    if (old === undefined) delete process.env.RESEND_FROM_EMAIL
    else process.env.RESEND_FROM_EMAIL = old
  }
})
