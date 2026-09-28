import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isOperationalEmailAddress } from '../lib/email-config.ts'

test('accepts verified-looking mailbox and display-name sender formats', () => {
  assert.equal(isOperationalEmailAddress('orders@tsuyanouchi.com'), true)
  assert.equal(isOperationalEmailAddress('TsuyaNoUchi <orders@tsuyanouchi.com>'), true)
})

test('rejects sample, test, invalid, local, malformed, and missing destinations', () => {
  for (const value of [
    undefined,
    '',
    'customer@example.com',
    'admin@example.org',
    'owner@company.invalid',
    'nobody@preview.test',
    'admin@localhost',
    'missing-at.example.com',
    'Name <bad@@example.com>',
  ]) {
    assert.equal(isOperationalEmailAddress(value), false, String(value))
  }
})
