import assert from 'node:assert/strict'
import { test } from 'node:test'
import { trustedImagePatterns } from '../lib/trusted-image-patterns.ts'

test('bare image configuration allows only documented fixed sample host', () => {
  assert.deepEqual(trustedImagePatterns(), [{
    protocol: 'https',
    hostname: 'images.unsplash.com',
    pathname: '/**',
  }])
})

test('R2 HTTPS public origins are exact and preserve a path prefix', () => {
  const rules = trustedImagePatterns('https://static.tsuyanouchi.com/product-media/')
  assert.deepEqual(rules[1], {
    protocol: 'https',
    hostname: 'static.tsuyanouchi.com',
    pathname: '/product-media/**',
  })
  assert.deepEqual(trustedImagePatterns('https://abcd1234.r2.dev')[1], {
    protocol: 'https',
    hostname: 'abcd1234.r2.dev',
    pathname: '/**',
  })
})

test('rejects HTTP, wildcard, port, embedded credentials and query fragments', () => {
  for (const bad of [
    'http://unsafe.example/',
    'https://**/',
    'https://bad.example:8443',
    'https://name:secret@cdn.example/',
    'https://cdn.example/?token=secret',
    'https://cdn.example/#fragment',
    'not a URL',
  ]) {
    assert.equal(trustedImagePatterns(bad).length, 1, bad)
  }
})

test('does not duplicate an already-approved exact sample host', () => {
  assert.equal(trustedImagePatterns('https://images.unsplash.com').length, 1)
})
