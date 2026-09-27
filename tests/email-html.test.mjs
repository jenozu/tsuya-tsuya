import assert from 'node:assert/strict'
import { test } from 'node:test'
import { escapeHtml } from '../lib/html-escape.ts'

test('escapes untrusted product and customer HTML', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('XSS')">&`),
    '&lt;img src=x onerror=&quot;alert(&#39;XSS&#39;)&quot;&gt;&amp;',
  )
})
test('converts missing values to empty escaped text', () => {
  assert.equal(escapeHtml(null), '')
  assert.equal(escapeHtml(undefined), '')
  assert.equal(escapeHtml('Safe text'), 'Safe text')
})
