// Task 10.1: transactional claim per Stripe event id (table from staged migration 003).
// Works without the table: a missing table answers 'unavailable' and the caller processes as before.
import { getDb } from './db.ts'

export type ClaimResult = 'claimed' | 'duplicate' | 'in_flight' | 'unavailable'

export interface PaymentEventStore {
  /** One atomic upsert: claims a new, failed or lease-expired row. Returns false when not claimable. */
  claim(eventId: string, eventType: string): Promise<boolean>
  /** Status of an existing row, or null if none. */
  status(eventId: string): Promise<string | null>
  finish(eventId: string, ok: boolean): Promise<void>
}

type Row = Record<string, unknown>
// Longer than a normal webhook run, so a live claim is never stolen; a crashed one frees up after this.
const LEASE = '2 minutes'

export const paymentEventStore: PaymentEventStore = {
  async claim(eventId, eventType) {
    const rows = (await getDb()`
      INSERT INTO stripe_payment_events (event_id, event_type, status, attempts, claim_expires_at)
      VALUES (${eventId}, ${eventType}, 'processing', 1, NOW() + ${LEASE}::interval)
      ON CONFLICT (event_id) DO UPDATE SET status = 'processing', attempts = stripe_payment_events.attempts + 1,
        claim_expires_at = NOW() + ${LEASE}::interval, updated_at = NOW()
      WHERE stripe_payment_events.status IN ('pending', 'failed')
        OR (stripe_payment_events.status = 'processing' AND stripe_payment_events.claim_expires_at < NOW())
      RETURNING attempts`) as unknown as Row[]
    return rows.length > 0
  },
  async status(eventId) {
    const rows = (await getDb()`SELECT status FROM stripe_payment_events WHERE event_id = ${eventId}`) as unknown as Row[]
    return rows[0] ? String(rows[0].status) : null
  },
  async finish(eventId, ok) {
    await getDb()`
      UPDATE stripe_payment_events SET status = ${ok ? 'processed' : 'failed'}, claim_expires_at = NULL,
        processed_at = CASE WHEN ${ok} THEN NOW() ELSE NULL END, updated_at = NOW()
      WHERE event_id = ${eventId} AND status = 'processing'`
  },
}

const isMissingTable = (e: unknown) => (e as { code?: string })?.code === '42P01'

export async function claimPaymentEvent(
  eventId: string, eventType: string, store: PaymentEventStore = paymentEventStore,
): Promise<ClaimResult> {
  try {
    if (await store.claim(eventId, eventType)) return 'claimed'
    return (await store.status(eventId)) === 'processed' ? 'duplicate' : 'in_flight'
  } catch (e) {
    if (isMissingTable(e)) return 'unavailable'
    throw e
  }
}

export async function finishPaymentEvent(
  eventId: string, ok: boolean, store: PaymentEventStore = paymentEventStore,
): Promise<void> {
  try {
    await store.finish(eventId, ok)
  } catch (e) {
    if (!isMissingTable(e)) throw e
  }
}
