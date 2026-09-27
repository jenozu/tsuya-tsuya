import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseCSV } from '../lib/csv-parser.ts'

const headers = 'name,category,productType,stock,price_8x10,cost_8x10'
function parse(row) {
  return parseCSV(headers + '\n' + row)
}

test('imports quoted product names and exact variant currency amounts', () => {
  const result = parse('"Blossom, Gold",Art Prints,1-piece,3,19.99,5.00')
  assert.equal(result.success, true)
  assert.equal(result.products.length, 1)
  assert.equal(result.products[0].name, 'Blossom, Gold')
  assert.deepEqual(result.products[0].sizes, [{ label: '8" x 10"', price: 19.99, cost: 5 }])
})

test('rejects fractional, negative, malformed, or overflowing stock instead of truncating', () => {
  for (const stock of ['1.5', '-1', '3oops', '1000001']) {
    const result = parse(`Blossom,Art Prints,1-piece,${stock},19.99,5`)
    assert.equal(result.success, false, stock)
    assert.equal(result.skipped, 1)
  }
})

test('rejects malformed, zero, negative, or overprecise size prices and costs', () => {
  for (const price of ['0', '-1', '12.345', '12oops', '9999999']) {
    const result = parse(`Blossom,Art Prints,1-piece,3,${price},5`)
    assert.equal(result.success, false, price)
  }
  for (const cost of ['-1', '1.234', '2oops']) {
    assert.equal(parse(`Blossom,Art Prints,1-piece,3,19.99,${cost}`).success, false, cost)
  }
})

test('keeps rows that are valid while reporting invalid skipped rows', () => {
  const result = parseCSV(headers + '\nGood,Art Prints,1-piece,3,19.99,5\nBad,Art Prints,1-piece,3.5,19.99,5')
  assert.equal(result.success, true)
  assert.equal(result.imported, 1)
  assert.equal(result.skipped, 1)
  assert.equal(result.errors.length, 1)
})
