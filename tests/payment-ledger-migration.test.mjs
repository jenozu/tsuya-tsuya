import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { migrationChecksum, planMigrations, BASELINE_ID } from '../lib/migration-plan.mjs'

const migrationPath = new URL('../migrations/forward/003_payment_delivery_foundation.json', import.meta.url)

test('forward payment ledger is additive, checksum-addressed and retains the baseline', async () => {
  const file = await readFile(migrationPath, 'utf8')
  const migration = JSON.parse(file)
  assert.equal(migration.id,'003_payment_delivery_foundation')
  assert.ok(migration.statements.length >= 4)
  for (const statement of migration.statements) {
    assert.doesNotMatch(statement,/^\s*(?:DROP|TRUNCATE|DELETE|UPDATE|ALTER)\b/i)
    assert.match(statement,/^CREATE (?:TABLE IF NOT EXISTS public\.|INDEX IF NOT EXISTS idx_[a-z_]+ ON public\.)/)
  }
  const baseline={ id:BASELINE_ID, statements:['SELECT 1'], checksum:migrationChecksum('frozen legacy baseline') }
  const next={ ...migration, checksum:migrationChecksum(file) }
  assert.deepEqual(planMigrations([next,baseline],[{version:baseline.id,checksum:baseline.checksum}]),[next])
  assert.throws(()=>planMigrations([next,baseline],
    [{version:baseline.id,checksum:baseline.checksum},{version:next.id,checksum:'tampered'}]), /checksum/)
})
test('staged event and email tables declare durable keys, bounded statuses and retry claim fields', async () => {
  const {statements} = JSON.parse(await readFile(migrationPath, 'utf8'))
  const event=statements.find(s=>s.startsWith('CREATE TABLE IF NOT EXISTS public.stripe_payment_events'))
  const email=statements.find(s=>s.startsWith('CREATE TABLE IF NOT EXISTS public.order_email_deliveries'))
  assert.ok(event)
  assert.ok(email)
  assert.match(event,/event_id TEXT PRIMARY KEY/)
  assert.match(event,/attempts INTEGER NOT NULL DEFAULT 0/)
  assert.match(event,/claim_expires_at TIMESTAMPTZ/)
  assert.match(event,/status IN \('pending','processing','processed','failed'\)/)
  assert.match(email,/REFERENCES public.orders \(order_id\)/)
  assert.match(email,/PRIMARY KEY \(order_id, recipient_kind\)/)
  assert.match(email,/claim_expires_at TIMESTAMPTZ/)
  assert.match(email,/status IN \('pending','sending','sent','failed'\)/)
  assert.ok(statements.some(s=>/idx_stripe_payment_events_pending/.test(s)))
  assert.ok(statements.some(s=>/idx_order_email_deliveries_pending/.test(s)))
})
