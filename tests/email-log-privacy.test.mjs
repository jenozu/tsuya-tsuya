import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import {
  reportServerInfo,
  reportServerWarn,
  reportServerError,
} from '../lib/safe-server-log.ts'

test('email delivery helpers do not log addresses, order IDs, or provider errors directly', () => {
  const source = fs.readFileSync(new URL('../lib/email.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /console\.(?:log|info|warn|error)\s*\(/)
  assert.doesNotMatch(source, /reportServer(?:Info|Warn|Error)\s*\(\s*(?!['"])[^)]/s)
  assert.ok(source.includes("reportServerError('email.order_confirmation.send_failed')"))
  assert.ok(source.includes("reportServerError('email.owner_notification.send_failed')"))
})

test('structured operational logging never serializes supplied addresses or raw objects', () => {
  const output = []
  const original = { info: console.info, warn: console.warn, error: console.error }
  try {
    console.info = line => output.push(line)
    console.warn = line => output.push(line)
    console.error = line => output.push(line)
    reportServerInfo('email.order_confirmation.sent')
    reportServerWarn('email.owner_notification.configuration_incomplete')
    reportServerError('private-customer@example.com')
  } finally {
    console.info = original.info
    console.warn = original.warn
    console.error = original.error
  }
  assert.equal(output.length, 3)
  const events = output.map(line => JSON.parse(line))
  assert.deepEqual(events.map(x => x.event), [
    'email.order_confirmation.sent',
    'email.owner_notification.configuration_incomplete',
    'unknown',
  ])
  for (const row of events) {
    assert.deepEqual(Object.keys(row).sort(), ['event', 'level', 'timestamp'])
  }
  assert.ok(!output.join(' ').includes('private-customer@example.com'))
})
