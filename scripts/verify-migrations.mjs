import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dir = path.join(root, 'migrations')
const manifestPath = path.join(dir, 'manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.migrations) || manifest.migrations.length === 0) {
  throw new Error('migrations/manifest.json is invalid or empty')
}

const seenVersions = new Set()
const seenFiles = new Set()
let previous = -1

for (const migration of manifest.migrations) {
  if (!migration || !/^\d{4}$/.test(migration.version) ||
      !/^[a-z0-9_]+$/.test(migration.name) ||
      typeof migration.file !== 'string') {
    throw new Error('Each migration requires a four-digit version, snake_case name, and file')
  }
  const numeric = Number(migration.version)
  if (numeric <= previous) throw new Error('Migration versions must be strictly increasing')
  previous = numeric
  if (seenVersions.has(migration.version)) throw new Error(`Duplicate migration version ${migration.version}`)
  if (seenFiles.has(migration.file)) throw new Error(`Duplicate migration file ${migration.file}`)
  seenVersions.add(migration.version)
  seenFiles.add(migration.file)

  const fullPath = path.resolve(dir, migration.file)
  if (!fullPath.startsWith(dir + path.sep)) throw new Error('Migration path escaped migrations/')
  if (!fs.existsSync(fullPath)) throw new Error(`Missing migration file: ${migration.file}`)

  const sql = fs.readFileSync(fullPath, 'utf8')
  if (!/CREATE TABLE IF NOT EXISTS schema_migrations/i.test(sql)) {
    throw new Error(`${migration.file} does not bootstrap the schema_migrations ledger`)
  }

  const compact = sql.replace(/\s+/g, ' ')
  const marker = `INSERT INTO schema_migrations (version, name) VALUES ('${migration.version}', '${migration.name}') ON CONFLICT (version) DO NOTHING;`
  if (!compact.includes(marker)) {
    throw new Error(`${migration.file} does not record ledger marker ${migration.version}/${migration.name}`)
  }
}

console.log(`Migration manifest OK: ${manifest.migrations.length} ordered migrations`)
