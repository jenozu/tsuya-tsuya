// Only a random attempt ID, payload digest and expiry are stored. Checkout
// email, shipping address and payment data never enter browser storage here.
const STORAGE_KEY = 'tsuya_checkout_attempt_v1'
const MAX_ATTEMPT_AGE_MS = 20 * 60 * 60 * 1000

interface StoredAttempt {
  id: string
  digest: string
  until: number
}

export async function payloadDigest(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')
}

export function clearCheckoutAttempt(storage: Pick<Storage, 'removeItem'>): void {
  try { storage.removeItem(STORAGE_KEY) } catch { /* private-mode storage may be disabled */ }
}

export function checkoutAttemptForPayload(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  digest: string,
  now = Date.now(),
  newId: () => string = () => crypto.randomUUID(),
): string {
  try {
    const existing = JSON.parse(storage.getItem(STORAGE_KEY) || 'null') as StoredAttempt | null
    if (existing && existing.digest === digest && typeof existing.id === 'string' &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(existing.id) &&
        existing.until > now && existing.until <= now + MAX_ATTEMPT_AGE_MS) {
      return existing.id
    }
  } catch { /* malformed cached state: rotate */ }
  const id = newId()
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ id, digest, until: now + MAX_ATTEMPT_AGE_MS }))
  } catch { /* browser storage may be blocked; the in-flight UI guard still applies */ }
  return id
}
