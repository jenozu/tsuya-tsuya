import { createHmac } from 'node:crypto'

// The UUID names one shopper-initiated checkout attempt, not an order paid.
// Stripe's idempotency store is time-limited: an eventual durable checkout ledger
// is still required for indefinite cross-session and cross-device guarantees.
export const CHECKOUT_ATTEMPT_PATTERN =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i

export function checkoutAttemptIdentity(attemptId: string, signingSecret: string) {
  if (!CHECKOUT_ATTEMPT_PATTERN.test(attemptId) || !signingSecret) {
    throw new Error('Invalid checkout attempt configuration')
  }
  // HMAC prevents user-controlled or easily guessed order numbers and avoids
  // including customer details in Stripe's idempotency key.
  const hash = createHmac('sha256', signingSecret)
    .update('tsuya-checkout-v1:' + attemptId.toLowerCase()).digest('hex')
  return {
    orderId: 'ORD-' + hash.slice(0, 20).toUpperCase(),
    idempotencyKey: 'tsuya-session-v1-' + hash,
  }
}

export type CheckoutSessionState = { status?: string | null; expires_at?: number | null; url?: string | null }

export function checkoutSessionAvailability(
  session: CheckoutSessionState, nowSeconds = Math.floor(Date.now() / 1000),
): 'open' | 'expired' | 'completed' | 'unavailable' {
  if (session.status === 'complete') return 'completed'
  if (session.status === 'expired' ||
      (typeof session.expires_at === 'number' && session.expires_at <= nowSeconds)) return 'expired'
  if (session.status && session.status !== 'open') return 'unavailable'
  return session.url ? 'open' : 'unavailable'
}
