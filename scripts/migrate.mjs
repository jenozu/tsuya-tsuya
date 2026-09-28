#!/usr/bin/env node
/**
 * Explicit, operator-run migrations. Never runs during Next.js builds.
 * Legacy 001 predates 002's canonical clean schema and MUST NOT be replayed.
 */
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { neon } from '@neondatabase/serverless'
import { BASELINE_ID, migrationChecksum, planMigrations } from '../lib/migration-plan.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = path.join(root, 'migrations', '002_neon_r2_schema.sql')
const forwardPath = path.join(root, 'migrations', 'forward')
const ledgerSql = `CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  checksum CHAR(64) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`
const requiredColumns = {
  products: ['id','name','price','category','stock','sizes','product_type'],
  orders: ['id','order_id','email','items','total','shipping_address'],
  shipping_rates: ['id','name','country_code','price'],
  favorites: ['id','user_id','product_id'],
  waitlist: ['id','email'],
}

function splitLegacyBaseline(text) {
  if (text.includes('$$')) throw new Error('Legacy baseline requires a reviewed SQL parser')
  return text.split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
    .split(/;\s*(?:\n|$)/).map(s => s.trim()).filter(Boolean)
}

async function files() {
  const baselineSql = await readFile(baselinePath, 'utf8')
  const migrations = [{
    id: BASELINE_ID,
    checksum: migrationChecksum(baselineSql),
    statements: splitLegacyBaseline(baselineSql),
  }]
  let entries = []
  try { entries = await readdir(forwardPath) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  for (const entry of entries) {
    if (!/^\d{3}_[a-z0-9_]+\.json$/.test(entry)) {
      throw new Error('Unexpected migration filename: ' + entry)
    }
    const id = entry.slice(0, -5)
    const raw = await readFile(path.join(forwardPath, entry), 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed.id !== id || !Array.isArray(parsed.statements)) {
      throw new Error('Migration file ID or SQL format mismatch: ' + id)
    }
    migrations.push({ id, checksum: migrationChecksum(raw), statements: parsed.statements })
  }
  return migrations.sort((a,b) => a.id.localeCompare(b.id))
}

async function coreColumns(sql) {
  const rows = await sql.query(`SELECT table_name, column_name
    FROM information_schema.columns WHERE table_schema = 'public'
    AND table_name IN ('products', 'orders', 'shipping_rates', 'favorites', 'waitlist')`)
  const actual = new Map()
  for (const row of rows) {
    if (!actual.has(row.table_name)) actual.set(row.table_name, new Set())
    actual.get(row.table_name).add(row.column_name)
  }
  return actual
}

function baselineMatches(actual) {
  return Object.entries(requiredColumns).every(([table, cols]) =>
    cols.every(col => actual.get(table)?.has(col)))
}

async function ledgerRows(sql) {
  const present = await sql.query("SELECT to_regclass('public.schema_migrations') AS ledger")
  if (!present[0]?.ledger) return null
  return sql.query('SELECT version, checksum FROM public.schema_migrations ORDER BY version')
}

function requireOperationalConfirmation(command) {
  if (!process.argv.includes('--confirm-reviewed-backup')) {
    throw new Error(command + ' requires --confirm-reviewed-backup and a previously verified, isolated rollback plan')
  }
  if (process.env.VERCEL_ENV === 'production' && !process.argv.includes('--confirm-production-change')) {
    throw new Error('Production requires explicit --confirm-production-change')
  }
}

async function run() {
  const command = process.argv[2] ?? '--plan'
  const migrations = await files()
  // Static schema and filename check requires no external services or secrets.
  planMigrations(migrations, [])
  if (command === '--plan') {
    for (const migration of migrations) console.log(migration.id + ' ' + migration.checksum)
    return
  }
  if (!['--status', '--apply', '--adopt-baseline', '--init-empty'].includes(command)) {
    throw new Error('Supported: --plan, --status, --apply, --adopt-baseline, --init-empty')
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be provided privately for non-plan operations')
  const sql = neon(process.env.DATABASE_URL)
  const rows = await ledgerRows(sql)
  if (command === '--status') {
    if (!rows) {
      console.log('Ledger uninitialized; verify existing schema before --adopt-baseline or initialize isolated empty DB.')
      return
    }
    const pending = planMigrations(migrations, rows)
    console.log('Applied:', rows.map(row => row.version).join(', ') || '(none)')
    console.log('Pending:', pending.map(row => row.id).join(', ') || '(none)')
    return
  }

  requireOperationalConfirmation(command)
  if (command === '--init-empty') {
    if (rows) throw new Error('Migration ledger already exists: refusing baseline replay')
    const current = await coreColumns(sql)
    if (current.size !== 0) throw new Error('Refusing to bootstrap an existing or partially initialized database')
    await sql.transaction([
      ...migrations[0].statements.map(statement => sql.query(statement)),
      sql.query(ledgerSql),
      sql.query('INSERT INTO public.schema_migrations (version, checksum) VALUES ($1, $2)',
        [migrations[0].id, migrations[0].checksum]),
    ])
    console.log('Initialized canonical baseline atomically: ' + BASELINE_ID)
    return
  }

  if (command === '--adopt-baseline') {
    if (rows) throw new Error('Ledger already exists: cannot re-adopt baseline')
    if (!baselineMatches(await coreColumns(sql))) {
      throw new Error('Existing schema does not match expected baseline columns; manual schema review required')
    }
    // Adoption does not replay the historical (and potentially destructive) seed.
    await sql.transaction([
      sql.query(ledgerSql),
      sql.query('INSERT INTO public.schema_migrations (version, checksum) VALUES ($1, $2)',
        [migrations[0].id, migrations[0].checksum]),
    ])
    console.log('Adopted verified baseline without re-running historical SQL')
    return
  }

  if (!rows || !rows.some(row => row.version === BASELINE_ID)) {
    throw new Error('Baseline not recorded: use --init-empty or --adopt-baseline after review')
  }
  const pending = planMigrations(migrations, rows)
  for (const migration of pending) {
    await sql.transaction([
      // Unique ledger record is acquired FIRST. A second concurrent runner
      // conflicts and rolls back before its schema statements run.
      sql.query('INSERT INTO public.schema_migrations (version, checksum) VALUES ($1, $2)',
        [migration.id, migration.checksum]),
      ...migration.statements.map(statement => sql.query(statement)),
    ])
    console.log('Applied transactionally: ' + migration.id)
  }
  if (!pending.length) console.log('All migration checksums verified; nothing to apply')
}

run().catch(error => {
  // Do not log database URLs, SQL/parameter values, provider error objects or credentials.
  console.error(error.message?.startsWith('Production requires') ||
    /migration|Migration|Ledger|Baseline|baseline|requires|refusing/i.test(error.message || '')
    ? error.message : 'Migration operation failed: inspect your private database logs')
  process.exitCode = 1
})
