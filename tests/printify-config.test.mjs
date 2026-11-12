import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import {
  getPrintifyConfig,
  getPrintifyWebhookSecret,
  isPrintifyOrdersEnabled,
} from '../lib/printify-config.ts'

const NAMES = ['PRINTIFY_ORDERS_ENABLED', 'PRINTIFY_API_TOKEN', 'PRINTIFY_SHOP_ID', 'PRINTIFY_WEBHOOK_SECRET']
const saved = {}

beforeEach(() => {
  for (const name of NAMES) {
    saved[name] = process.env[name]
    delete process.env[name]
  }
})

afterEach(() => {
  for (const name of NAMES) {
    if (saved[name] === undefined) delete process.env[name]
    else process.env[name] = saved[name]
  }
})

test('orders flag is on only for the exact string true', () => {
  assert.equal(isPrintifyOrdersEnabled(), false, 'unset')
  for (const value of ['', '1', 'yes', 'TRUE', 'True', ' true ']) {
    process.env.PRINTIFY_ORDERS_ENABLED = value
    assert.equal(isPrintifyOrdersEnabled(), false, JSON.stringify(value))
  }
  process.env.PRINTIFY_ORDERS_ENABLED = 'true'
  assert.equal(isPrintifyOrdersEnabled(), true)
})

test('missing token or shop id throws naming the variable, never a set value', () => {
  const secret = 'SECRET-VALUE-123'
  process.env.PRINTIFY_SHOP_ID = '  12345  '
  assert.throws(() => getPrintifyConfig(), (error) => {
    assert.match(error.message, /PRINTIFY_API_TOKEN/)
    assert.doesNotMatch(error.message, /12345/)
    return true
  })

  process.env.PRINTIFY_API_TOKEN = secret
  delete process.env.PRINTIFY_SHOP_ID
  assert.throws(() => getPrintifyConfig(), (error) => {
    assert.match(error.message, /PRINTIFY_SHOP_ID/)
    assert.doesNotMatch(error.message, /SECRET-VALUE/)
    return true
  })

  process.env.PRINTIFY_SHOP_ID = '   '
  assert.throws(() => getPrintifyConfig(), /PRINTIFY_SHOP_ID/)
})

test('values are trimmed and the webhook secret follows the same rules', () => {
  process.env.PRINTIFY_API_TOKEN = '  token-abc \n'
  process.env.PRINTIFY_SHOP_ID = ' 999 '
  assert.deepEqual(getPrintifyConfig(), { apiToken: 'token-abc', shopId: '999' })

  assert.throws(() => getPrintifyWebhookSecret(), /PRINTIFY_WEBHOOK_SECRET/)
  process.env.PRINTIFY_WEBHOOK_SECRET = ' whsec-x '
  assert.equal(getPrintifyWebhookSecret(), 'whsec-x')
})
