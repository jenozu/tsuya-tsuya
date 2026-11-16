import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  consumeMemoryPreviewAttempt, clearMemoryPreviewAttempts, previewPasswordMatches, PREVIEW_MAX_ATTEMPTS,
} from '../lib/preview-access.ts'
import { readFileSync } from 'node:fs'

test('password compare handles unequal lengths without throwing', () => {
  assert.equal(previewPasswordMatches('right', 'right'), true)
  assert.equal(previewPasswordMatches('wrong', 'right'), false)
  assert.equal(previewPasswordMatches('a', 'a-much-longer-password'), false)
})

test('attempts beyond the limit are blocked, other IPs and cleared IPs are not', () => {
  const map = new Map()
  for (let i = 0; i < PREVIEW_MAX_ATTEMPTS; i++) assert.equal(consumeMemoryPreviewAttempt('1.1.1.1', 100, map).allowed, true)
  const blocked = consumeMemoryPreviewAttempt('1.1.1.1', 100, map)
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.retryAfterSeconds > 0)
  assert.equal(consumeMemoryPreviewAttempt('2.2.2.2', 100, map).allowed, true)
  assert.equal(consumeMemoryPreviewAttempt('1.1.1.1', 100 + 901, map).allowed, true)
  clearMemoryPreviewAttempts('2.2.2.2', map)
  assert.equal(map.has('2.2.2.2'), false)
})

test('route uses the constant-time compare and returns 429', () => {
  const src = readFileSync(new URL('../app/api/preview-access/route.ts', import.meta.url), 'utf8')
  assert.match(src, /previewPasswordMatches\(/)
  assert.doesNotMatch(src, /password !== PREVIEW_PASSWORD/)
  assert.match(src, /status: 429/)
})
