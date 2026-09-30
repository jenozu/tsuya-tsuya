import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reconcileCartWithCatalog } from '../lib/cart-reconcile.ts'

const product = {
  id: 'product-1', name: 'New name', price: 18, category: 'Art Prints',
  description: '', stock: 3, image_url: '/product-placeholder.svg',
  sizes: [{ label: '8" x 10"', price: 12 }, { label: '11" x 14"', price: 22 }],
}
const cartItem = {
  id: 'product-1', name: 'Old name', price: 9, quantity: 2,
  imageUrl: '/previous-image.svg', selectedSize: { label: '8" x 10"', price: 10 },
}

test('re-prices retained size from current catalog and keeps its label', () => {
  const r = reconcileCartWithCatalog([cartItem], [product])
  assert.equal(r.changed, true)
  assert.equal(r.items[0].selectedSize.price, 12)
  assert.equal(r.items[0].name, 'New name')
  assert.equal(r.items[0].quantity, 2)
})

test('never silently switches discontinued, deleted or unavailable size selections', () => {
  const stale = { ...cartItem, selectedSize: { label: 'discontinued', price: 8 } }
  assert.deepEqual(reconcileCartWithCatalog([stale], [product]).items, [])
  assert.deepEqual(reconcileCartWithCatalog([cartItem], []).items, [])
  const unavailable={ ...product, stock:0, sizes:[
    { label:'8" x 10"', price:12, available:false },
    { label:'11" x 14"', price:22, available:true },
  ]}
  assert.deepEqual(reconcileCartWithCatalog([cartItem], [unavailable]).items, [])
  assert.deepEqual(reconcileCartWithCatalog([{ ...cartItem, selectedSize:undefined }], [product]).items, [])
})

test('made-to-order sized products are not capped by legacy product stock', () => {
  const other = { ...cartItem, selectedSize: { label:'11" x 14"', price: 20 } }
  const result = reconcileCartWithCatalog([cartItem, other], [{...product,stock:0}])
  assert.equal(result.items.length, 2)
  assert.equal(result.items[0].quantity, 2)
  assert.equal(result.items[1].quantity, 2)
  assert.equal(result.items.reduce((n,i)=>n+i.quantity,0), 4)
})

test('allows genuinely non-variant products with a current price', () => {
  const unvarianted={ ...product, sizes:[], stock:1, price:22 }
  const item={ ...cartItem, selectedSize:undefined }
  const r=reconcileCartWithCatalog([item],[unvarianted])
  assert.equal(r.items.length,1)
  assert.equal(r.items[0].price,22)
  assert.equal(r.items[0].quantity,1)
})
