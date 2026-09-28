import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

test('offline migration CLI emits stable ordered baseline without needing DB access', () => {
  const env = { ...process.env }
  delete env.DATABASE_URL
  const result = spawnSync(process.execPath, ['scripts/migrate.mjs', '--plan'], {
    encoding: 'utf8', env, timeout: 10_000,
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /^002_neon_r2_schema [a-f0-9]{64}\s*$/)
  assert.doesNotMatch(result.stdout, /postgres|password|secret/i)
})
