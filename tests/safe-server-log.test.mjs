import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reportServerError } from '../lib/safe-server-log.ts'

test('does not accept raw error bodies or customer identifiers in logs', () => {
  const logs = []
  const previous = console.error
  console.error = (...parts) => { logs.push(parts.join(' ')) }
  try {
    reportServerError('db.orders.create')
    reportServerError('buyer@example.com')
    reportServerError('exception\nSECRET_KEY=private-data')
  } finally {
    console.error = previous
  }
  assert.equal(logs.length, 3)
  const valid = JSON.parse(logs[0])
  assert.equal(valid.level, 'error')
  assert.equal(valid.event, 'db.orders.create')
  assert.match(valid.timestamp, /^\d{4}-\d\d-\d\dT/)
  assert.equal(JSON.parse(logs[1]).event, 'unknown')
  assert.equal(JSON.parse(logs[2]).event, 'unknown')
  assert.ok(logs.every(line => !line.includes('private-data') && !line.includes('buyer@example.com')))
})
