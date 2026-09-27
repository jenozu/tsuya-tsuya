import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isSameOriginMutation } from '../lib/same-origin.ts'

function mutation(target, headers = {}) {
  return new Request(target, { method: 'POST', headers })
}

test('accepts same-origin HTTPS browser mutations', () => {
  assert.equal(isSameOriginMutation(mutation('https://tsuyanouchi.com/api/products', {
    origin: 'https://tsuyanouchi.com',
    'sec-fetch-site': 'same-origin',
  })), true)
  assert.equal(isSameOriginMutation(mutation('https://tsuya-preview.vercel.app/api/products', {
    origin: 'https://tsuya-preview.vercel.app',
  })), true)
})

test('rejects cross-origin, malformed, or missing-header mutations', () => {
  const target = 'https://tsuyanouchi.com/api/products'
  for (const headers of [
    { origin: 'https://attacker.example' },
    { origin: 'https://tsuyanouchi.com.attacker.example' },
    { origin: 'null' },
    { origin: 'https://tsuyanouchi.com:444' },
    { origin: 'https://tsuyanouchi.com', 'sec-fetch-site': 'cross-site' },
    {},
    { 'sec-fetch-site': 'same-site' },
  ]) assert.equal(isSameOriginMutation(mutation(target, headers)), false, JSON.stringify(headers))
})

test('allows real same-origin browser requests without Origin only when fetch metadata says same-origin', () => {
  assert.equal(isSameOriginMutation(mutation('https://tsuyanouchi.com/api/products', {
    'sec-fetch-site': 'same-origin',
  })), true)
  assert.equal(isSameOriginMutation(mutation('https://tsuyanouchi.com/api/products', {
    'sec-fetch-site': 'none',
  })), false)
})

test('HTTP is restricted to local development, matching precise origin including port', () => {
  assert.equal(isSameOriginMutation(mutation('http://localhost:3000/api/products', {
    origin: 'http://localhost:3000',
  })), true)
  assert.equal(isSameOriginMutation(mutation('http://localhost:3000/api/products', {
    origin: 'http://localhost:3001',
  })), false)
  assert.equal(isSameOriginMutation(mutation('http://public.example/api/products', {
    origin: 'http://public.example',
  })), false)
})
