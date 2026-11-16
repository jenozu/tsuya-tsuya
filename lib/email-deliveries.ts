// Task 10.2: once-only order emails, tracked per (order, recipient) in order_email_deliveries (staged migration 003).
// Without the table, sendOrderEmailsOnce answers null and the caller falls back to the old send-once-on-create path.
import { getDb } from './db.ts'

export type EmailKind = 'customer' | 'owner'

export interface EmailDeliveryStore {
  /** Atomic: claims a missing, pending, failed or lease-expired row. False when sent or being sent. */
  claim(orderId: string, kind: EmailKind): Promise<boolean>
  finish(orderId: string, kind: EmailKind, ok: boolean): Promise<void>
}

type Row = Record<string, unknown>
const LEASE = '2 minutes'

export const emailDeliveryStore: EmailDeliveryStore = {
  async claim(orderId, kind) {
    const rows = (await getDb()`
      INSERT INTO order_email_deliveries (order_id, recipient_kind, status, attempts, claim_expires_at)
      VALUES (${orderId}, ${kind}, 'sending', 1, NOW() + ${LEASE}::interval)
      ON CONFLICT (order_id, recipient_kind) DO UPDATE SET status = 'sending',
        attempts = order_email_deliveries.attempts + 1, claim_expires_at = NOW() + ${LEASE}::interval, updated_at = NOW()
      WHERE order_email_deliveries.status IN ('pending', 'failed')
        OR (order_email_deliveries.status = 'sending' AND order_email_deliveries.claim_expires_at < NOW())
      RETURNING attempts`) as unknown as Row[]
    return rows.length > 0
  },
  async finish(orderId, kind, ok) {
    await getDb()`
      UPDATE order_email_deliveries SET status = ${ok ? 'sent' : 'failed'}, claim_expires_at = NULL,
        sent_at = CASE WHEN ${ok} THEN NOW() ELSE NULL END, updated_at = NOW()
      WHERE order_id = ${orderId} AND recipient_kind = ${kind} AND status = 'sending'`
  },
}

const isMissingTable = (e: unknown) => (e as { code?: string })?.code === '42P01'

/**
 * Sends each email at most once successfully. Returns true when every email is sent (or was already),
 * false when one failed (caller should let Stripe retry), null when tracking is unavailable (no table).
 */
export async function sendOrderEmailsOnce(
  orderId: string,
  senders: Record<EmailKind, () => Promise<boolean>>,
  store: EmailDeliveryStore = emailDeliveryStore,
): Promise<boolean | null> {
  let allSent = true
  for (const kind of ['customer', 'owner'] as const) {
    let claimed: boolean
    try {
      claimed = await store.claim(orderId, kind)
    } catch (e) {
      if (isMissingTable(e)) return null
      throw e
    }
    if (!claimed) continue
    let ok = false
    try {
      ok = await senders[kind]()
    } finally {
      await store.finish(orderId, kind, ok).catch(() => {})
    }
    if (!ok) allSent = false
  }
  return allSent
}
