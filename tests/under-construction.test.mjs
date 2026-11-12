import assert from 'node:assert/strict'
import { test } from 'node:test'
import { underConstructionEnabled } from '../lib/under-construction.ts'

test('under-construction: on, off, unset', () => {
  assert.equal(underConstructionEnabled('true'), true)
  assert.equal(underConstructionEnabled('false'), false)
  assert.equal(underConstructionEnabled(''), false)
  delete process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION
  assert.equal(underConstructionEnabled(), false)
})
