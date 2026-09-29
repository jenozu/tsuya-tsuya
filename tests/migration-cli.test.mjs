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
  const lines = result.stdout.trim().split(/\r?\n/)
  assert.deepEqual(lines.map(line => line.split(' ')[0]), [
    '002_neon_r2_schema', '003_payment_delivery_foundation',
  ])
  for (const line of lines) assert.match(line, /^\d{3}_[a-z0-9_]+ [a-f0-9]{64}$/)
  assert.doesNotMatch(result.stdout, /postgres|password|secret/i)
})
