import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { renderOrderConfirmationHtml } from '../lib/email-templates/order-confirmation.ts'
import { renderOwnerNotificationHtml } from '../lib/email-templates/order-notification.ts'
import { escapeHtml } from '../lib/html-escape.ts'
import { safeSupportEmail } from '../lib/email-config.ts'

const originalSupport = process.env.SUPPORT_EMAIL
after(() => {
  if (originalSupport === undefined) delete process.env.SUPPORT_EMAIL
  else process.env.SUPPORT_EMAIL = originalSupport
})

const hostile = `<img src=x onerror="alert('PII_LEAK')">&`
const order = {
  id: 'private-test-id',
  order_id: 'ORD-TEST',
  email: hostile,
  items: [{ productId: 'p1', productName: hostile, quantity: 2, price: 12.50 }],
  subtotal: 25,
  taxes: 3,
  shipping: 5,
  total: 33,
  status: 'processing',
  shipping_address: {
    firstName: hostile,
    lastName: hostile,
    address: hostile,
    addressLine2: hostile,
    unitNumber: hostile,
    city: hostile,
    state: hostile,
    postalCode: hostile,
    country: hostile,
    phone: hostile,
  },
  payment_status: 'paid',
  created_at: '2026-09-28T00:00:00.000Z',
  updated_at: '2026-09-28T00:00:00.000Z',
}

for (const [label, render] of [
  ['customer confirmation', renderOrderConfirmationHtml],
  ['owner notification', renderOwnerNotificationHtml],
]) {
  test(`${label} escapes every untrusted HTML-bearing order field`, () => {
    delete process.env.SUPPORT_EMAIL
    const result = render(`ORD</title><script>PII_LEAK</script>&`, order)
    assert.ok(result.includes(escapeHtml(hostile)), 'escapes product and address text')
    assert.ok(result.includes('ORD&lt;/title&gt;&lt;script&gt;PII_LEAK&lt;/script&gt;&amp;'))
    assert.ok(!result.includes(hostile), 'does not include the raw hostile input')
    assert.ok(!result.includes('<script>PII_LEAK</script>'), 'cannot inject script elements')
    assert.ok(!result.includes('onerror="alert'), 'cannot inject image event attributes')
    assert.match(result, /\$25\.00/)
    assert.match(result, /\$33\.00/)
  })
}

test('quantity values are escaped even if a legacy order contains malformed runtime data', () => {
  const forged = {
    ...order,
    items: [{ ...order.items[0], quantity: '<svg onload=alert(1)>' }],
  }
  for (const render of [renderOrderConfirmationHtml, renderOwnerNotificationHtml]) {
    const result = render('ORD-TEST', forged)
    assert.ok(result.includes('&lt;svg onload=alert(1)&gt;'))
    assert.ok(!result.includes('<svg onload=alert(1)>'))
  }
})

test('customer optional support link omits sample/invalid and HTML-injectable addresses', () => {
  for (const value of [
    undefined,
    'help@example.test',
    'Tsuya <help@realstore.com>',
    'help@realstore.com\r\nBcc: attacker@test.com',
    'help<script>@realstore.com',
  ]) {
    process.env.SUPPORT_EMAIL = value ?? ''
    const html = renderOrderConfirmationHtml('ORD-TEST', order)
    assert.ok(!html.includes('For inquiries:'), String(value))
    assert.equal(safeSupportEmail(value), null, String(value))
  }
})

test('customer includes safely validated, escaped real support mailbox', () => {
  process.env.SUPPORT_EMAIL = 'help@realstore.com'
  const html = renderOrderConfirmationHtml('ORD-TEST', order)
  assert.equal(safeSupportEmail(process.env.SUPPORT_EMAIL), 'help@realstore.com')
  assert.match(html, /href="mailto:help@realstore\.com"/)
  assert.match(html, /For inquiries:/)
})
