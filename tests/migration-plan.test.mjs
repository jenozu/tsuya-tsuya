import assert from 'node:assert/strict'
import { test } from 'node:test'
import { migrationChecksum, planMigrations, BASELINE_ID } from '../lib/migration-plan.mjs'

const baseline = { id: BASELINE_ID, statements: ['CREATE TABLE products (id uuid)'], checksum: migrationChecksum('baseline') }
const next = { id: '003_add_orders', statements: ['ALTER TABLE products ADD COLUMN status text'], checksum: migrationChecksum('next') }

test('computes stable SHA-256 digests and plans migrations in order', () => {
  assert.match(migrationChecksum('a'), /^[a-f0-9]{64}$/)
  assert.deepEqual(planMigrations([next, baseline], []), [baseline, next])
  assert.deepEqual(planMigrations([next, baseline], [{ version: baseline.id, checksum: baseline.checksum }]), [next])
  assert.deepEqual(planMigrations([next, baseline], [baseline, next].map(({id,checksum}) => ({version:id,checksum}))), [])
})

test('rejects mutated history, missing files, ledger gaps and duplicate migration IDs', () => {
  assert.throws(() => planMigrations([baseline], [{ version: baseline.id, checksum: 'tampered' }]), /checksum/)
  assert.throws(() => planMigrations([baseline], [{ version: '002_removed', checksum: 'x' }]), /missing/)
  assert.throws(() => planMigrations([baseline, next], [{version:next.id, checksum:next.checksum}]), /gap/)
  assert.throws(() => planMigrations([baseline, baseline], []), /duplicate/)
  assert.throws(() => planMigrations([{id:'../../oops', statements:['SELECT 1'], checksum:'x'}], []), /Invalid/)
})
