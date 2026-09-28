#!/usr/bin/env node
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const base = process.argv[2]
if (!/^[0-9a-f]{40}$/.test(base ?? '')) {
  console.error('Expected a verified 40-character merge-base commit SHA')
  process.exit(2)
}

const changed = spawnSync('git', [
  'diff', '--diff-filter=ACMR', '--name-only', '-z', base + '...HEAD', '--',
], { encoding: 'buffer' })
if (changed.status !== 0) {
  console.error('Could not inspect the PR diff')
  process.exit(2)
}
const paths = changed.stdout.toString('utf8').split('\0').filter(Boolean)
const supported = /\.(?:ts|tsx|js|mjs|cjs|css|json|md|sql|yml|yaml)$/i
const errors = []
let checked = 0
for (const path of paths) {
  if (!supported.test(path) || !fs.existsSync(path) || !fs.statSync(path).isFile()) continue
  const body = fs.readFileSync(path, 'utf8')
  checked += 1
  if (body.includes('\r')) errors.push(path + ': CRLF/bare CR line endings are not supported')
  if (body && !body.endsWith('\n')) errors.push(path + ': missing final newline')
  if (path.endsWith('.json')) {
    try { JSON.parse(body) } catch { errors.push(path + ': malformed JSON') }
  }
}
if (errors.length) {
  for (const error of errors) console.error(error)
  process.exitCode = 1
} else {
  console.log('Changed-file format verified (' + checked + ' source/config files)')
}
