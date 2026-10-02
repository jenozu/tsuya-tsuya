import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const productDetail = await readFile(new URL('../app/shop/[id]/product-detail-client.tsx', import.meta.url), 'utf8')
const shippingPolicy = await readFile(new URL('../app/shipping/page.tsx', import.meta.url), 'utf8')
const faq = await readFile(new URL('../app/faq/page.tsx', import.meta.url), 'utf8')
const footer = await readFile(new URL('../components/footer.tsx', import.meta.url), 'utf8')

test('customer-facing shipping copy uses the approved launch policy', () => {
  for (const content of [shippingPolicy, faq]) {
    assert.match(content, /2–5 business days/)
    assert.match(content, /\$2\.99/)
  }
  assert.match(shippingPolicy, /free for orders delivered within the United States/i)
  assert.match(faq, /free within the United States/i)
})

test('outdated product trust claims are removed and policy pages are discoverable', () => {
  assert.doesNotMatch(productDetail, /orders over \$500/i)
  assert.doesNotMatch(productDetail, /Hassle-free returns within 30 days/i)
  assert.match(productDetail, /Free on US orders/)
  assert.match(productDetail, /2–5 business days to produce/)
  assert.match(footer, /href="\/shipping"/)
  assert.match(footer, /href="\/faq"/)
})
