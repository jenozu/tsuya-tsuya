import assert from 'node:assert/strict'
import { test } from 'node:test'
import { relatedProducts } from '../lib/product-recommendations.ts'

const product = (id, category) => ({
  id, category, name:id, description:'', price:10, image_url:'/product-placeholder.svg', stock:1,
})

test('related prints prioritize the same series/category and exclude the current product', () => {
  const current=product('current','Jujutsu Kaisen')
  const catalog=[
    current,
    product('other-series','Bayonetta'),
    product('same-newest','jujutsu kaisen'),
    product('same-next','Jujutsu Kaisen'),
    product('fallback','Naruto'),
  ]
  assert.deepEqual(relatedProducts(current,catalog,3).map(item=>item.id),
    ['same-newest','same-next','other-series'])
})

test('related prints fall back to other categories and obey a bounded limit', () => {
  const current=product('current','Series A')
  const catalog=[current,product('b','Series B'),product('c','Series C')]
  assert.deepEqual(relatedProducts(current,catalog,4).map(item=>item.id),['b','c'])
  assert.deepEqual(relatedProducts(current,catalog,0),[])
})
