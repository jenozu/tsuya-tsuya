import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  trustedCheckoutOrigin,
  trustedCheckoutReturnUrls,
} from '../lib/checkout-redirects.ts'

test('production never trusts the caller Origin/Host', () => {
  assert.deepEqual(
    trustedCheckoutReturnUrls('ORD-TEST', {
      nodeEnv: 'production',
      requestOrigin: 'https://attacker.example',
    }),
    {
      success: 'https://tsuyanouchi.com/thank-you?orderId=ORD-TEST',
      cancel: 'https://tsuyanouchi.com/checkout?canceled=1',
    },
  )
})

test('preview redirects remain on the verified Vercel preview host', () => {
  assert.equal(
    trustedCheckoutOrigin({
      nodeEnv: 'production',
      vercelEnv: 'preview',
      vercelUrl: 'tsuya-preview-abc.vercel.app',
      requestOrigin: 'https://attacker.example',
    }),
    'https://tsuya-preview-abc.vercel.app',
  )
})

test('malformed preview host and insecure configured URLs fall back safely', () => {
  assert.equal(trustedCheckoutOrigin({
    nodeEnv: 'production',
    vercelEnv: 'preview',
    vercelUrl: 'attacker.example',
    siteUrl: 'http://tsuyanouchi.com',
    requestOrigin: 'https://attacker.example',
  }), 'https://tsuyanouchi.com')
})

test('trusted configured site accepts HTTPS root only', () => {
  assert.equal(trustedCheckoutOrigin({ nodeEnv: 'production', siteUrl: 'https://www.tsuyanouchi.com/' }), 'https://www.tsuyanouchi.com')
  assert.equal(trustedCheckoutOrigin({ nodeEnv: 'production', siteUrl: 'https://tsuyanouchi.com/unsafe-path' }), 'https://tsuyanouchi.com')
  assert.equal(trustedCheckoutOrigin({ nodeEnv: 'production', siteUrl: 'https://user:pass@attacker.example/' }), 'https://tsuyanouchi.com')
})

test('localhost is permitted for development but arbitrary hosts are not', () => {
  assert.equal(trustedCheckoutOrigin({ nodeEnv: 'development', requestOrigin: 'http://localhost:3000' }), 'http://localhost:3000')
  assert.equal(trustedCheckoutOrigin({ nodeEnv: 'development', requestOrigin: 'http://attacker.example:3000' }), 'https://tsuyanouchi.com')
})

test('order identifiers are URL encoded', () => {
  const result = trustedCheckoutReturnUrls('A&B /', { nodeEnv: 'production' })
  assert.equal(new URL(result.success).searchParams.get('orderId'), 'A&B /')
  assert.equal(new URL(result.success).pathname, '/thank-you')
})
