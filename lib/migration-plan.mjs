import { createHash } from 'node:crypto'

export const BASELINE_ID = '002_neon_r2_schema'

export function migrationChecksum(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

/** Reject missing, renamed or edited applied migrations rather than silently replaying. */
export function planMigrations(files, applied) {
  const sorted = [...files].sort((a, b) => a.id.localeCompare(b.id))
  const ids = new Set()
  const appliedMap = new Map(applied.map(row => [row.version, row.checksum]))
  for (const [index, item] of sorted.entries()) {
    if (!/^\d{3}_[a-z0-9_]+$/.test(item.id) || ids.has(item.id)) {
      throw new Error('Invalid or duplicate migration identifier')
    }
    if (index && item.id <= sorted[index - 1].id) {
      throw new Error('Migrations must have increasing IDs')
    }
    if (!Array.isArray(item.statements) || item.statements.length === 0 ||
      item.statements.some(s => typeof s !== 'string' || !s.trim())) {
      throw new Error('Migration contains invalid SQL statements')
    }
    ids.add(item.id)
  }
  for (const row of applied) {
    if (!ids.has(row.version)) throw new Error('Recorded migration file is missing: ' + row.version)
  }
  for (const migration of sorted) {
    const recorded = appliedMap.get(migration.id)
    if (recorded && recorded !== migration.checksum) {
      throw new Error('Applied migration checksum changed: ' + migration.id)
    }
  }
  let pendingEncountered = false
  for (const migration of sorted) {
    if (!appliedMap.has(migration.id)) pendingEncountered = true
    else if (pendingEncountered) throw new Error('Migration ledger contains a gap before ' + migration.id)
  }
  return sorted.filter(migration => !appliedMap.has(migration.id))
}
