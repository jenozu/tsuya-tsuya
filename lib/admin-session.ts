const SESSION_COOKIE = 'admin_session'
const SESSION_VERSION = 'v1'
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7
// Ledger sessions end after this long without an authenticated request (seconds).
export const ADMIN_SESSION_IDLE_TIMEOUT = 60 * 30

function getSessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || null
}

function parseCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('cookie') || ''
  for (const part of cookieHeader.split(';')) {
    const [cookieName, ...rest] = part.trim().split('=')
    if (cookieName !== name) continue
    try {
      return decodeURIComponent(rest.join('='))
    } catch {
      return null
    }
  }
  return null
}

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return diff === 0
}

async function sign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return bytesToHex(signature)
}

export type AdminSessionStore = {
  create(id: string, now: number, expiresAt: number): Promise<void>
  find(id: string): Promise<{ expiresAt: number; lastSeenAt: number; revokedAt: number | null } | null>
  touch(id: string, now: number): Promise<void>
  revoke(id: string, now: number): Promise<void>
}

// Off until migration 005 is applied in production (ADMIN_AUTH_STORE_ENABLED=true); then sessions use the ledger.
export async function defaultAdminSessionStore(): Promise<AdminSessionStore | undefined> {
  if (process.env.ADMIN_AUTH_STORE_ENABLED !== 'true') return undefined
  return (await import('./admin-auth-store.ts')).dbSessionStore
}

export async function signWithAdminSecret(payload: string): Promise<string> {
  const secret = getSessionSecret()
  if (!secret) throw new Error('Admin session secret is not configured')
  return sign(payload, secret)
}

export async function createAdminSessionToken(store?: AdminSessionStore): Promise<string> {
  const secret = getSessionSecret()
  if (!secret) throw new Error('Admin session secret is not configured')
  store ??= await defaultAdminSessionStore()

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + ADMIN_SESSION_MAX_AGE
  if (!store) {
    const payload = `v1.${expiresAt}`
    return `${payload}.${await sign(payload, secret)}`
  }
  const id = bytesToHex(crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer)
  await store.create(id, now, expiresAt)
  const payload = `v2.${id}.${expiresAt}`
  return `${payload}.${await sign(payload, secret)}`
}

// Verifies signature and expiry; returns the ledger id for v2 tokens ('' for v1) or null.
async function verifyToken(request: Request, ledger: boolean): Promise<string | null> {
  const token = parseCookie(request, SESSION_COOKIE)
  const secret = getSessionSecret()
  if (!token || !secret) return null

  const parts = token.split('.')
  if (parts[0] !== (ledger ? 'v2' : SESSION_VERSION) || parts.length !== (ledger ? 4 : 3)) return null
  const id = ledger ? parts[1] : ''
  const [expiresRaw, signature] = parts.slice(ledger ? 2 : 1)
  if (!expiresRaw || !signature || (ledger && !/^[0-9a-f]{32}$/.test(id))) return null

  const expiresAt = Number(expiresRaw)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(expiresAt) || expiresAt <= now || expiresAt > now + ADMIN_SESSION_MAX_AGE + 300) {
    return null
  }

  const payload = ledger ? `v2.${id}.${expiresAt}` : `v1.${expiresAt}`
  return constantTimeEqual(signature, await sign(payload, secret)) ? id : null
}

export async function hasAdminSession(request: Request, store?: AdminSessionStore): Promise<boolean> {
  try {
    store ??= await defaultAdminSessionStore()
    const id = await verifyToken(request, Boolean(store))
    if (id === null) return false
    if (!store) return true
    const row = await store.find(id)
    const now = Math.floor(Date.now() / 1000)
    if (!row || row.revokedAt !== null || row.expiresAt <= now || now - row.lastSeenAt > ADMIN_SESSION_IDLE_TIMEOUT) {
      return false
    }
    await store.touch(id, now)
    return true
  } catch {
    return false
  }
}

export async function revokeAdminSession(request: Request, store?: AdminSessionStore): Promise<void> {
  store ??= await defaultAdminSessionStore()
  if (!store) return
  const id = await verifyToken(request, true)
  if (id) await store.revoke(id, Math.floor(Date.now() / 1000))
}
