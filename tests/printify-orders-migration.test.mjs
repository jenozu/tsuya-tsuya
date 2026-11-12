import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { migrationChecksum, planMigrations, BASELINE_ID } from '../lib/migration-plan.mjs'

const forward = new URL('../migrations/forward/', import.meta.url)
const read = name => readFile(new URL(name, forward), 'utf8')

test('004 printify_orders is additive and plans after the baseline and 003', async () => {
  const file = await read('004_printify_orders.json')
  const migration = JSON.parse(file)
  assert.equal(migration.id, '004_printify_orders')
  assert.equal(migration.statements.length, 2)
  for (const statement of migration.statements) {
    assert.doesNotMatch(statement, /;|\b(?:DROP|TRUNCATE|UPDATE|ALTER)\b|\bDELETE\b(?! RESTRICT)/i)
    assert.match(statement, /^CREATE (?:TABLE IF NOT EXISTS public\.|INDEX IF NOT EXISTS idx_[a-z_]+ ON public\.)/)
  }
  const file003 = await read('003_payment_delivery_foundation.json')
  const baseline = { id: BASELINE_ID, statements: ['SELECT 1'], checksum: migrationChecksum('frozen legacy baseline') }
  const m003 = { ...JSON.parse(file003), checksum: migrationChecksum(file003) }
  const m004 = { ...migration, checksum: migrationChecksum(file) }
  const applied = [{ version: baseline.id, checksum: baseline.checksum }]
  assert.deepEqual(planMigrations([m004, m003, baseline], applied), [m003, m004])
  assert.deepEqual(planMigrations([m004, m003, baseline], [...applied, { version: m003.id, checksum: m003.checksum }]), [m004])
})

test('printify_orders keys, idempotency column, states and due index', async () => {
  const { statements } = JSON.parse(await read('004_printify_orders.json'))
  const table = statements.find(s => s.startsWith('CREATE TABLE IF NOT EXISTS public.printify_orders'))
  assert.ok(table)
  assert.match(table, /order_id TEXT PRIMARY KEY REFERENCES public\.orders \(order_id\) ON DELETE RESTRICT/)
  assert.match(table, /stripe_checkout_session_id TEXT NOT NULL UNIQUE CHECK \(char_length\(stripe_checkout_session_id\) BETWEEN 1 AND 255\)/)
  assert.match(table, /printify_order_id TEXT UNIQUE,/)
  const states = table.match(/state IN \(([^)]*)\)/)[1].split(',').map(s => s.replace(/'/g, ''))
  assert.deepEqual(states, ['pending', 'submitting', 'submitted', 'in_production', 'shipped', 'delivered', 'canceled', 'needs_attention'])
  assert.match(table, /state TEXT NOT NULL DEFAULT 'pending'/)
  assert.match(table, /attempts INTEGER NOT NULL DEFAULT 0 CHECK \(attempts >= 0\)/)
  for (const col of ['claim_expires_at TIMESTAMPTZ', 'last_error_code TEXT', 'submitted_at TIMESTAMPTZ',
    'created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()', 'updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()']) {
    assert.ok(table.includes(col), col)
  }
  assert.ok(statements.includes("CREATE INDEX IF NOT EXISTS idx_printify_orders_due ON public.printify_orders (state, claim_expires_at) WHERE state IN ('pending','submitting','submitted')"))
})
