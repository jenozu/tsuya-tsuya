#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const legacyProvider = ['supa', 'base'].join('')
const legacyPackage = `@${legacyProvider}`
const textExtensions = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.sql',
  '.md', '.txt', '.csv', '.yml', '.yaml', '.env',
])
const ignoredDirectories = new Set(['.git', '.next', 'node_modules'])
const ignoredFiles = new Set(['scripts/assert-current-infra.mjs'])

const violations = []

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue

    const absolute = path.join(directory, entry.name)
    const relative = path.relative(root, absolute).replaceAll('\\', '/')

    if (entry.isDirectory()) {
      walk(absolute)
      continue
    }

    if (!entry.isFile() || ignoredFiles.has(relative)) continue

    const lowerPath = relative.toLowerCase()
    if (lowerPath.includes(legacyProvider)) {
      violations.push(`${relative}: legacy provider name appears in path`)
    }

    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue

    let content
    try {
      content = fs.readFileSync(absolute, 'utf8')
    } catch {
      continue
    }

    const lower = content.toLowerCase()
    if (lower.includes(legacyProvider) || lower.includes(legacyPackage)) {
      violations.push(`${relative}: legacy provider reference appears in file contents`)
    }
  }
}

walk(root)

const requiredMarkers = [
  ['package.json', '@neondatabase/serverless'],
  ['package.json', '@aws-sdk/client-s3'],
  ['lib/db.ts', 'DATABASE_URL'],
  ['lib/r2.ts', 'R2_BUCKET_NAME'],
]

for (const [file, marker] of requiredMarkers) {
  const absolute = path.join(root, file)
  if (!fs.existsSync(absolute) || !fs.readFileSync(absolute, 'utf8').includes(marker)) {
    violations.push(`${file}: missing required current-infrastructure marker ${marker}`)
  }
}

if (violations.length) {
  console.error('Infrastructure guard failed:')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log('Infrastructure guard passed: current tree uses Neon PostgreSQL + Cloudflare R2 only.')
