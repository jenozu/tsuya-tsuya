const SESSION_COOKIE = 'admin_session'
const SESSION_VERSION = 'v1'
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7

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

export async function createAdminSessionToken(): Promise<string> {
  const secret = getSessionSecret()
  if (!secret) throw new Error('Admin session secret is not configured')

  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE
  const payload = `${SESSION_VERSION}.${expiresAt}`
  const signature = await sign(payload, secret)
  return `${payload}.${signature}`
}

export async function hasAdminSession(request: Request): Promise<boolean> {
  const token = parseCookie(request, SESSION_COOKIE)
  const secret = getSessionSecret()
  if (!token || !secret) return false

  const [version, expiresRaw, signature, ...extra] = token.split('.')
  if (extra.length > 0 || version !== SESSION_VERSION || !expiresRaw || !signature) return false

  const expiresAt = Number(expiresRaw)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(expiresAt) || expiresAt <= now || expiresAt > now + ADMIN_SESSION_MAX_AGE + 300) {
    return false
  }

  const payload = `${version}.${expiresAt}`
  const expected = await sign(payload, secret)
  return constantTimeEqual(signature, expected)
}
