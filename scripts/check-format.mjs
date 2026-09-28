import fs from 'node:fs'
import path from 'node:path'

const ROOTS = ['app','components','lib','scripts','tests','migrations','docs']
const ROOT_FILES = ['package.json','tsconfig.json','next.config.ts','README.md','master_plan.md','ENV_TEMPLATE.md']
const TEXT = /\.(?:ts|tsx|js|mjs|json|md|sql|yml|yaml|css)$/
const failures = []

function check(file) {
  const text = fs.readFileSync(file, 'utf8')
  if (text.includes('\r\n')) failures.push(`${file}: CRLF line endings`)
  if (!text.endsWith('\n')) failures.push(`${file}: missing final newline`)
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i += 1) {
    if (/[ \t]+$/.test(lines[i])) failures.push(`${file}:${i + 1}: trailing whitespace`)
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (TEXT.test(entry.name)) check(full)
  }
}

for (const root of ROOTS) walk(root)
for (const file of ROOT_FILES) if (fs.existsSync(file)) check(file)

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('Formatting hygiene check passed')
