import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  breadcrumbStructuredData,
  productCanonicalUrl,
  productStructuredData,
  publicIndexingEnabled,
  serializeStructuredData,
} from '../lib/seo.ts'

const product = {
  id: 'fixed-uuid',
  name: '<img src=x onerror=alert(1)>',
  description: 'Collectible art',
  price: 15,
  stock: 5,
  sizes: [{ label: '8 x 10', price: 12.5 }, { label: '11 x 14', price: 20 }],
}

test('only production without the under-construction gate is indexable', () => {
  assert.equal(publicIndexingEnabled({ deploymentEnvironment: 'production' }), true)
  assert.equal(publicIndexingEnabled({ deploymentEnvironment: 'preview' }), false)
  assert.equal(publicIndexingEnabled({ deploymentEnvironment: 'development' }), false)
  assert.equal(publicIndexingEnabled({ deploymentEnvironment: 'production', underConstruction: true }), false)
})

test('existing product ID URLs remain canonical, including special characters', () => {
  assert.equal(productCanonicalUrl('fixed-uuid'), 'https://tsuyanouchi.com/shop/fixed-uuid')
  assert.equal(productCanonicalUrl('a/b'), 'https://tsuyanouchi.com/shop/a%2Fb')
})

test('Product JSON-LD uses database variant price and availability', () => {
  const data = productStructuredData(product)
  assert.equal(data.offers.price, '12.50')
  assert.equal(data.offers.priceCurrency, 'USD')
  assert.equal(data.offers.availability, 'https://schema.org/InStock')
  assert.equal(productStructuredData({ ...product, stock: 0 }).offers.availability,
    'https://schema.org/OutOfStock')
})

test('breadcrumbs preserve the stable product URL', () => {
  const data = breadcrumbStructuredData(product)
  assert.equal(data.itemListElement[2].item, productCanonicalUrl('fixed-uuid'))
})

test('structured JSON cannot close its script with untrusted product names', () => {
  const serialized = serializeStructuredData(productStructuredData({
    ...product, name: '</script><script>alert(1)</script>',
  }))
  assert.equal(serialized.includes('</script>'), false)
  assert.ok(serialized.includes(String.fromCharCode(92) + 'u003c/script>'))
})
