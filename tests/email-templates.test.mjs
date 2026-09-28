import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderOrderConfirmationHtml } from '../lib/email-templates/order-confirmation.ts'

const order = {
  items: [{ productId: 'p', productName: '<svg onload=alert(1)>', quantity: 1, price: 12.50 }],
  email: 'customer@example.test',
  subtotal: 12.50, shipping: 0, taxes: 0, total: 12.50,
  shipping_address: {
    firstName: '<img src=x>', lastName: "O'Reilly", address: '</script><script>alert(1)</script>',
    city: 'Montreal & Quebec', state: 'QC', country: 'CA', postalCode: 'H2H 2H2',
    phone: '<script>1</script>',
  },
}
test('actual outbound template escapes product, customer, address and order reference HTML', () => {
  const old = process.env.SUPPORT_EMAIL
  delete process.env.SUPPORT_EMAIL
  try {
    const html = renderOrderConfirmationHtml('<script>bad</script>', order)
    assert.ok(!html.includes('<svg onload=alert'))
    assert.ok(!html.includes('<img src=x>'))
    assert.ok(!html.includes('</script><script>alert(1)</script>'))
    assert.ok(html.includes('&lt;svg onload=alert(1)&gt;'))
    assert.ok(html.includes('O&#39;Reilly'))
    assert.ok(html.includes('Montreal &amp; Quebec'))
    assert.ok(!html.includes('mailto:support@'))
  } finally {
    if (old === undefined) delete process.env.SUPPORT_EMAIL
    else process.env.SUPPORT_EMAIL = old
  }
})

test('support destination is emitted only when configured and HTML safe', () => {
  const old = process.env.SUPPORT_EMAIL
  try {
    process.env.SUPPORT_EMAIL = 'support@my-store.com'
    assert.ok(renderOrderConfirmationHtml('ORD-1', order).includes('support@my-store.com'))
    process.env.SUPPORT_EMAIL = 'support@my-store.example'
    assert.ok(!renderOrderConfirmationHtml('ORD-1', order).includes('mailto:'))
    process.env.SUPPORT_EMAIL = '<script>@x.example'
    assert.ok(!renderOrderConfirmationHtml('ORD-1', order).includes('mailto:'))
  } finally {
    if (old === undefined) delete process.env.SUPPORT_EMAIL
    else process.env.SUPPORT_EMAIL = old
  }
})
