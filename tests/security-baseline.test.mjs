import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
test('security regression guard checks repo without secrets or live calls', () => {
  const r=spawnSync(process.execPath, ['scripts/check-security-baseline.mjs'], {
    encoding:'utf8', timeout:10000,
  })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /Security regression guard passed/)
})
