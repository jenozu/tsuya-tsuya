// Edge-compatible signed preview session. Do not accept a forgeable "granted" cookie.
export const PREVIEW_SESSION_MAX_AGE = 60 * 60 * 4
const COOKIE_NAME = 'preview_access'
const VERSION = 'preview-v1'

function getSecret(): string | null {
  // Admin's independent session secret is required; never derive from the
  // public preview password or an unconfigured environment fallback.
  return process.env.ADMIN_SESSION_SECRET || null
}

function getCookie(request: Request): string | null {
  const cookies = request.headers.get('cookie') || ''
  for (const part of cookies.split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === COOKIE_NAME) {
      try {
        return decodeURIComponent(value.join('='))
      } catch {
        return null
      }
    }
  }
  return null
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let difference = 0
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return difference === 0
}

async function signature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode('tsuya-preview:' + payload))
  return Array.from(new Uint8Array(signed), value => value.toString(16).padStart(2, '0')).join('')
}

export async function createPreviewSessionToken(): Promise<string> {
  const secret = getSecret()
  if (!secret) throw new Error('Preview session signing is not configured')
  const expiresAt = Math.floor(Date.now() / 1000) + PREVIEW_SESSION_MAX_AGE
  const payload = `${VERSION}.${expiresAt}`
  return `${payload}.${await signature(payload, secret)}`
}

export async function hasPreviewSession(request: Request): Promise<boolean> {
  const token = getCookie(request)
  const secret = getSecret()
  if (!token || !secret) return false
  const [version, expiresRaw, signed, ...extra] = token.split('.')
  if (version !== VERSION || !expiresRaw || !/^[a-f0-9]{64}$/.test(signed ?? '') || extra.length !== 0) return false

  const expiresAt = Number(expiresRaw)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + PREVIEW_SESSION_MAX_AGE + 300) {
    return false
  }
  const payload = `${version}.${expiresAt}`
  return constantTimeEqual(signed, await signature(payload, secret))
}
