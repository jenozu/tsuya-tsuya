import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import {
  ALLOWED_SERVER_EVENTS,
  reportServerError,
  reportServerInfo,
  reportServerWarn,
} from '../lib/safe-server-log.ts'
import { PUBLIC_API_FAILURE } from '../lib/public-api-failure.ts'

const root = new URL('../', import.meta.url)
const read = relative => fs.readFileSync(new URL(relative, root), 'utf8')

test('only preapproved operational events can enter server logs', () => {
  const output = []
  const original = { info: console.info, warn: console.warn, error: console.error }
  try {
    console.info = message => output.push(message)
    console.warn = message => output.push(message)
    console.error = message => output.push(message)
    reportServerInfo('stripe.webhook.received')
    reportServerWarn('email.order_confirmation.configuration_incomplete')
    reportServerError('ord-8675309')
    reportServerError('customer.address')
    reportServerError('api.custom_error_with_secret')
    reportServerError('pi_fake_payment_secret_123')
  } finally {
    Object.assign(console, original)
  }
  const parsed = output.map(line => JSON.parse(line))
  assert.deepEqual(parsed.map(x => x.event), [
    'stripe.webhook.received',
    'email.order_confirmation.configuration_incomplete',
    'unknown',
    'unknown',
    'unknown',
    'unknown',
  ])
  assert.ok(!output.join(' ').includes('ord-8675309'))
  assert.ok(!output.join(' ').includes('payment_secret'))
  for (const message of parsed) {
    assert.deepEqual(Object.keys(message).sort(), ['event', 'level', 'timestamp'])
  }
})

test('all explicitly logged route and payment events appear in the static log vocabulary', () => {
  const roots = ['app/api', 'lib/email.ts', 'lib/stripe.ts']
  const files = []
  function visit(item) {
    const full = new URL(item, root)
    if (!fs.existsSync(full)) return
    if (fs.statSync(full).isDirectory()) {
      for (const entry of fs.readdirSync(full)) visit(path.posix.join(item, entry))
    } else if (/\\.(?:ts|tsx)$/.test(item)) files.push(item)
  }
  roots.forEach(visit)
  let matched = 0
  for (const file of files) {
    const source = read(file)
    assert.doesNotMatch(source, /console\\.(?:error|warn|info|log|debug)\\s*\\(/, file + ': raw API logging forbidden')
    assert.doesNotMatch(source, /JSON\\.stringify\\s*\\(\\s*(?:error|err|order|paymentIntent)\\b/, file)
    for (const call of source.matchAll(/reportServer(?:Error|Warn|Info)\\(\\s*(?:'([^']+)'|"([^"]+)")/g)) {
      assert.ok(ALLOWED_SERVER_EVENTS.has(call[1] || call[2]), file + ': unapproved log event')
      matched += 1
    }
  }
  assert.ok(matched > 25, 'audit must actually inspect real API operational events')
})

test('public configuration failure copy cannot include provider diagnostics or secrets', () => {
  for (const text of Object.values(PUBLIC_API_FAILURE)) {
    assert.ok(typeof text === 'string' && text.length > 0)
    assert.doesNotMatch(text, /(?:ADMIN_PASSWORD|PREVIEW_PASSWORD|STRIPE_WEBHOOK_SECRET|DATABASE_URL|metadata|secret|session)/i)
  }
  for (const file of ['app/checkout/page.tsx', 'app/admin/admin-client.tsx']) {
    assert.doesNotMatch(read(file), /console\\.(?:error|log|warn)\\([^\\n]*,\\s*(?:error|err)\\b/,
      file + ': raw exception objects cannot enter browser logs')
  }
  const webhook = read('app/api/webhooks/stripe/route.ts')
  assert.doesNotMatch(webhook, /throw new Error\\(\\s*\\`[^\\`]*\\$\\{(?:session\\.id|orderId)/,
    'payment/order identifiers cannot be embedded in throwable error strings')
  assert.ok(webhook.includes('PUBLIC_API_FAILURE.webhook'))
})
