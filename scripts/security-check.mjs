import fs from 'node:fs'
import path from 'node:path'

const failures = []
const SOURCE_ROOTS = ['app','components','lib','scripts']
const TEXT = /\.(?:ts|tsx|js|mjs)$/
const secretPatterns = [
  /sk_live_[A-Za-z0-9]{16,}/,
  /whsec_[A-Za-z0-9]{16,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
]
const forbiddenPublicNames = [
  'NEXT_PUBLIC_DATABASE_URL',
  'NEXT_PUBLIC_STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_R2_SECRET_ACCESS_KEY',
  'NEXT_PUBLIC_R2_ACCESS_KEY_ID',
  'NEXT_PUBLIC_ADMIN_PASSWORD',
  'NEXT_PUBLIC_ADMIN_SESSION_SECRET',
  'NEXT_PUBLIC_RESEND_API_KEY',
]

function scan(file) {
  const text = fs.readFileSync(file, 'utf8')
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) failures.push(`${file}: possible hard-coded credential`)
  }
  for (const name of forbiddenPublicNames) {
    if (text.includes(name)) failures.push(`${file}: server secret exposed through ${name}`)
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (TEXT.test(entry.name)) scan(full)
  }
}

for (const root of SOURCE_ROOTS) walk(root)

const adminSession = fs.readFileSync('lib/admin-session.ts', 'utf8')
if (/ADMIN_SESSION_SECRET\s*\|\|\s*process\.env\.ADMIN_PASSWORD/.test(adminSession)) {
  failures.push('lib/admin-session.ts: ADMIN_PASSWORD must never be a session-signing fallback')
}
const nextConfig = fs.readFileSync('next.config.ts', 'utf8')
if (/ignoreBuildErrors\s*:\s*true/.test(nextConfig)) {
  failures.push('next.config.ts: TypeScript build suppression is forbidden')
}
if (/hostname\s*:\s*['"]\*\*['"]/.test(nextConfig) || /protocol\s*:\s*['"]http['"]/.test(nextConfig)) {
  failures.push('next.config.ts: wildcard or plain-HTTP image optimizer sources are forbidden')
}

for (const route of [
  'app/api/payments/create-intent/route.ts',
  'app/api/payments/update-intent/route.ts',
]) {
  const text = fs.readFileSync(route, 'utf8')
  if (!/status:\s*410/.test(text)) failures.push(`${route}: legacy client-amount payment route is not retired`)
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('Static security policy check passed')
