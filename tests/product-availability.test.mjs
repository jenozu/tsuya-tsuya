import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  internalAvailabilityCount,
  productIsPurchasable,
  purchasableSizes,
  sizeIsAvailable,
} from '../lib/product-availability.ts'

const base={
  id:'p1',name:'Print',description:'',price:20,category:'Series',
  image_url:'/product-placeholder.svg',stock:0,
  sizes:[
    {label:'8" x 10"',price:20},
    {label:'11" x 14"',price:30,available:false},
    {label:'16" x 20"',price:40,available:true},
  ],
}

test('missing availability remains backwards-compatible and means available',()=>{
  assert.equal(sizeIsAvailable(base.sizes[0]),true)
  assert.equal(sizeIsAvailable(base.sizes[1]),false)
  assert.deepEqual(purchasableSizes(base).map(s=>s.label),['8" x 10"','16" x 20"'])
  assert.equal(internalAvailabilityCount(base),2)
  assert.equal(productIsPurchasable(base),true)
})

test('all sized variants unavailable makes product unavailable regardless of legacy stock',()=>{
  const p={...base,stock:999,sizes:base.sizes.map(s=>({...s,available:false}))}
  assert.equal(productIsPurchasable(p),false)
  assert.equal(internalAvailabilityCount(p),0)
})

test('legacy no-size products keep stock fallback during transition',()=>{
  assert.equal(productIsPurchasable({...base,sizes:[],stock:1}),true)
  assert.equal(productIsPurchasable({...base,sizes:[],stock:0}),false)
  assert.equal(internalAvailabilityCount({...base,sizes:[],stock:1}),1)
})
