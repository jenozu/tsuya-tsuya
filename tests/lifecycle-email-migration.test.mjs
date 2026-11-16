import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { migrationChecksum, planMigrations, BASELINE_ID } from '../lib/migration-plan.mjs'

const forward = new URL('../migrations/forward/', import.meta.url)
const read = name => readFile(new URL(name, forward), 'utf8')

test('008 widens the recipient_kind CHECK to every lifecycle kind, guarded and nothing else', async () => {
  const file = await read('008_lifecycle_email_kinds.json')
  const migration = JSON.parse(file)
  assert.equal(migration.id, '008_lifecycle_email_kinds')
  assert.equal(migration.statements.length, 1)
  const [statement] = migration.statements
  assert.doesNotMatch(statement, /;|\b(?:TRUNCATE|UPDATE|DELETE|DROP (?:TABLE|COLUMN))\b/i)
  assert.match(statement, /^ALTER TABLE IF EXISTS public\.order_email_deliveries DROP CONSTRAINT IF EXISTS order_email_deliveries_recipient_kind_check, ADD CONSTRAINT order_email_deliveries_recipient_kind_check CHECK /)
  const kinds = statement.match(/recipient_kind IN \(([^)]*)\)/)[1].split(',').map(s => s.replace(/'/g, ''))
  assert.deepEqual(kinds, ['customer', 'owner', 'shipped', 'canceled', 'refunded', 'payment_failed'])
  // Same kinds as the code writes (lib/email-deliveries.ts EmailKind | LifecycleKind).
  const code = await readFile(new URL('../lib/email-deliveries.ts', import.meta.url), 'utf8')
  const codeKinds = [...code.matchAll(/export type (?:Email|Lifecycle)Kind = (.*)/g)]
    .flatMap(m => m[1].split('|').map(s => s.trim().replace(/'/g, '')))
  assert.deepEqual(codeKinds, kinds)
  // 003 created the constraint under the Postgres default name this migration drops.
  assert.match(await read('003_payment_delivery_foundation.json'), /recipient_kind TEXT NOT NULL CHECK \(recipient_kind IN \('customer','owner'\)\)/)
})

test('008 plans after 003', async () => {
  const file = await read('008_lifecycle_email_kinds.json')
  const file003 = await read('003_payment_delivery_foundation.json')
  const baseline = { id: BASELINE_ID, statements: ['SELECT 1'], checksum: migrationChecksum('frozen legacy baseline') }
  const m003 = { ...JSON.parse(file003), checksum: migrationChecksum(file003) }
  const m008 = { ...JSON.parse(file), checksum: migrationChecksum(file) }
  assert.deepEqual(planMigrations([m008, m003, baseline], [{ version: baseline.id, checksum: baseline.checksum }]), [m003, m008])
})
