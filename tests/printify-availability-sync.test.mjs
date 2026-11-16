import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runAvailabilitySync } from '../lib/printify-availability-sync.ts'
import { createMockPrintify } from './fixtures/mock-printify.mjs'

process.env.PRINTIFY_API_TOKEN = 't'; process.env.PRINTIFY_SHOP_ID = 's'
const sz = (label, vid, extra = {}) => ({ label, price: 20, printifyProductId: 'pp1', printifyVariantId: vid, ...extra })
const variants = (...v) => ({ body: { variants: v } })

// In-memory store: getProduct returns the live row (optionally edited by a concurrent admin before the write).
function memStore(rows, { failUpdate = false, beforeRead } = {}) {
  const saved = {}
  return {
    saved,
    getProduct: async id => { beforeRead?.(rows); return rows[id] ? structuredClone(rows[id]) : null },
    updateProduct: async (id, u) => {
      if (failUpdate) return null
      rows[id] = { ...rows[id], ...u }; saved[id] = u.sizes; return rows[id]
    },
  }
}

test('unavailable variant disables size and flags; no re-enable; unmapped flagged', async () => {
  const products = [{ id: 'a', sizes: [sz('8x10', 1), sz('11x14', 2), sz('16x20', 3, { available: false }), sz('A3', 9), { label: 'x', price: 1 }] }]
  const mock = createMockPrintify(variants(
    { id: 1, is_enabled: true, is_available: true }, { id: 2, is_enabled: true, is_available: false },
    { id: 3, is_enabled: true, is_available: true }))
  const store = memStore({ a: structuredClone(products[0]) })
  const r = await runAvailabilitySync(products, store, mock.fetch)
  assert.equal(mock.calls.length, 1)
  assert.equal(mock.calls[0].init.method, 'GET')
  assert.match(mock.calls[0].url, /\/v1\/shops\/s\/products\/pp1\.json$/)
  assert.deepEqual(r.flags.map(f => f.reason).sort(),
    ['local_off_remote_on', 'unmapped', 'variant_missing', 'variant_unavailable'])
  assert.deepEqual(r.updatedIds, ['a'])
  assert.equal(r.disabled, 1)
  const saved = store.saved.a
  assert.equal(saved[0].available, undefined)
  assert.equal(saved[1].available, false)
  assert.equal(saved[1].printifyVariantId, 2)
  assert.equal(saved[2].available, false)
  assert.equal(saved[3].available, false)
  assert.ok(!JSON.stringify(r).match(/stock|count|left/i), 'no counts in the result')
})

test('is_enabled false disables; missing is_available is flagged, never assumed available or changed', async () => {
  const products = [{ id: 'a', sizes: [sz('8x10', 1), sz('11x14', 2)] }]
  const mock = createMockPrintify(variants({ id: 1, is_enabled: false, is_available: true }, { id: 2, is_enabled: true }))
  const store = memStore({ a: structuredClone(products[0]) })
  const r = await runAvailabilitySync(products, store, mock.fetch)
  assert.deepEqual(r.flags.map(f => [f.label, f.reason]), [['8x10', 'variant_unavailable'], ['11x14', 'variant_state_unknown']])
  assert.equal(store.saved.a[0].available, false)
  assert.equal(store.saved.a[1].available, undefined)
})

test('fetch failure changes nothing and flags', async () => {
  const products = [{ id: 'a', sizes: [sz('8x10', 1)] }]
  const mock = createMockPrintify({ status: 500 })
  const store = memStore({ a: structuredClone(products[0]) })
  const r = await runAvailabilitySync(products, store, mock.fetch)
  assert.deepEqual(store.saved, {})
  assert.equal(r.flags[0].reason, 'fetch_failed')
  assert.equal(r.disabled, 0)
})

test('failed DB update (updateProduct returns null) is not counted and raises update_failed', async () => {
  const products = [{ id: 'a', sizes: [sz('8x10', 1)] }]
  const mock = createMockPrintify(variants({ id: 1, is_enabled: true, is_available: false }))
  const r = await runAvailabilitySync(products, memStore({ a: structuredClone(products[0]) }, { failUpdate: true }), mock.fetch)
  assert.equal(r.disabled, 0)
  assert.deepEqual(r.updatedIds, [])
  assert.deepEqual(r.flags.map(f => f.reason), ['variant_unavailable', 'update_failed'])
})

test('product deleted before write raises update_failed', async () => {
  const products = [{ id: 'a', sizes: [sz('8x10', 1)] }]
  const mock = createMockPrintify(variants({ id: 1, is_enabled: true, is_available: false }))
  const r = await runAvailabilitySync(products, memStore({}), mock.fetch)
  assert.equal(r.disabled, 0)
  assert.equal(r.flags.at(-1).reason, 'update_failed')
})

test('concurrent admin edit after the snapshot is kept; only the matching label flips off', async () => {
  const products = [{ id: 'a', sizes: [sz('8x10', 1), sz('11x14', 2)] }]
  const mock = createMockPrintify(variants({ id: 1, is_enabled: true, is_available: true }, { id: 2, is_enabled: true, is_available: false }))
  const rows = { a: structuredClone(products[0]) }
  const store = memStore(rows, { beforeRead: r => {
    // Admin reprices 8x10 and adds a size while Printify is being fetched.
    r.a.sizes[0].price = 99
    r.a.sizes.push(sz('A2', 7))
  } })
  const r = await runAvailabilitySync(products, store, mock.fetch)
  assert.equal(r.disabled, 1)
  assert.deepEqual(rows.a.sizes.map(s => [s.label, s.price, s.available]),
    [['8x10', 99, undefined], ['11x14', 20, false], ['A2', 20, undefined]])
})
