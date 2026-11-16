// Postgres side of Printify submission (table printify_orders, migrations/forward/004; not applied to production).
// Only touched when PRINTIFY_ORDERS_ENABLED is on. Bound parameters only.
import { getDb } from './db.ts'
import type { PrintifyStore } from './printify-fulfillment.ts'
import type { PrintifyWebhookStore } from './printify-webhook.ts'

type Row = Record<string, unknown>
// Longer than the client's 15 s timeout, so a live claim is never stolen; a crashed one frees up after this.
const LEASE = '2 minutes'

export const printifyStore: PrintifyStore = {
  async ensure(orderId, sessionId) {
    await getDb()`
      INSERT INTO printify_orders (order_id, stripe_checkout_session_id) VALUES (${orderId}, ${sessionId})
      ON CONFLICT DO NOTHING`
  },
  async claim(orderId, sessionId) {
    // Row-level atomic: a concurrent claimer re-checks the WHERE after the first commits and matches nothing.
    const rows = (await getDb()`
      UPDATE printify_orders SET state = 'submitting', attempts = attempts + 1,
        claim_expires_at = NOW() + ${LEASE}::interval, updated_at = NOW()
      WHERE order_id = ${orderId} AND stripe_checkout_session_id = ${sessionId}
        AND (state = 'pending' OR (state = 'submitting' AND claim_expires_at < NOW()))
      RETURNING attempts`) as unknown as Row[]
    return rows[0] ? Number(rows[0].attempts) : null
  },
  async markSubmitted(orderId, printifyOrderId) {
    await getDb()`
      UPDATE printify_orders SET state = 'submitted', printify_order_id = ${printifyOrderId},
        submitted_at = NOW(), claim_expires_at = NULL, last_error_code = NULL, updated_at = NOW()
      WHERE order_id = ${orderId} AND state = 'submitting'`
  },
  async markFailed(orderId, state, code) {
    await getDb()`
      UPDATE printify_orders SET state = ${state}, last_error_code = ${code}, claim_expires_at = NULL, updated_at = NOW()
      WHERE order_id = ${orderId} AND state = 'submitting'`
  },
  async productSizes(productId) {
    const rows = (await getDb()`SELECT sizes FROM products WHERE id = ${productId} LIMIT 1`) as unknown as Row[]
    const sizes = rows[0]?.sizes
    if (typeof sizes !== 'string') return sizes
    try { return JSON.parse(sizes) } catch { return null }
  },
}

export type PrintifyAdminFlag = { state: string; attempts: number; lastErrorCode: string | null }

/** Rows the owner must look at: needs_attention, a recorded error, or not submitted after 10 minutes. */
export async function getPrintifyAdminFlags(): Promise<Record<string, PrintifyAdminFlag>> {
  const rows = (await getDb()`
    SELECT order_id, state, attempts, last_error_code FROM printify_orders
    WHERE state IN ('pending', 'submitting', 'needs_attention')
      AND (state = 'needs_attention' OR last_error_code IS NOT NULL OR updated_at < NOW() - INTERVAL '10 minutes')
    ORDER BY updated_at DESC LIMIT 200`) as unknown as Row[]
  return Object.fromEntries(rows.map(r => [String(r.order_id), {
    state: String(r.state),
    attempts: Number(r.attempts),
    lastErrorCode: r.last_error_code == null ? null : String(r.last_error_code),
  }]))
}

// Task 20 (migration 007, not applied to production): webhook event dedupe, forward-only state, tracking, shipped-email claim.
export const printifyWebhookStore: PrintifyWebhookStore = {
  async recordEvent(eventId) {
    const rows = (await getDb()`
      INSERT INTO printify_webhook_events (event_id) VALUES (${eventId}) ON CONFLICT DO NOTHING RETURNING event_id`) as unknown as Row[]
    return rows.length > 0
  },
  async forgetEvent(eventId) {
    await getDb()`DELETE FROM printify_webhook_events WHERE event_id = ${eventId}`
  },
  async advance(printifyOrderId, to, from, tracking) {
    await getDb()`
      UPDATE printify_orders SET
        state = CASE WHEN state = ANY(${from}::text[]) THEN ${to} ELSE state END,
        tracking_carrier = COALESCE(${tracking?.carrier ?? null}, tracking_carrier),
        tracking_number = COALESCE(${tracking?.number ?? null}, tracking_number),
        tracking_url = COALESCE(${tracking?.url ?? null}, tracking_url),
        shipped_at = CASE WHEN ${to} = 'shipped' THEN COALESCE(shipped_at, NOW()) ELSE shipped_at END,
        updated_at = NOW()
      WHERE printify_order_id = ${printifyOrderId}`
  },
  async claimShippedEmail(printifyOrderId) {
    const rows = (await getDb()`
      UPDATE printify_orders p SET shipped_email_sent_at = NOW()
      FROM orders o
      WHERE p.printify_order_id = ${printifyOrderId} AND o.order_id = p.order_id AND p.shipped_email_sent_at IS NULL
      RETURNING p.order_id, o.email, p.tracking_carrier, p.tracking_number, p.tracking_url`) as unknown as Row[]
    const r = rows[0]
    if (!r) return null
    const opt = (v: unknown) => (typeof v === 'string' ? v : undefined)
    return {
      orderId: String(r.order_id), email: String(r.email),
      tracking: { carrier: opt(r.tracking_carrier), number: opt(r.tracking_number), url: opt(r.tracking_url) },
    }
  },
  async releaseShippedEmail(printifyOrderId) {
    await getDb()`UPDATE printify_orders SET shipped_email_sent_at = NULL WHERE printify_order_id = ${printifyOrderId}`
  },
}

export type PrintifyAdminTracking = { state: string; carrier: string | null; number: string | null; url: string | null }

const optStr = (v: unknown) => (typeof v === 'string' && v ? v : null)

/** Row -> admin view. The URL is kept only when http(s), so it is safe as a link href. */
export function toAdminTracking(r: Row): PrintifyAdminTracking {
  const url = optStr(r.tracking_url)
  return {
    state: String(r.state),
    carrier: optStr(r.tracking_carrier),
    number: optStr(r.tracking_number),
    url: url && /^https?:\/\//i.test(url) ? url : null,
  }
}

/** Printify state and tracking for orders past submission (TSU-M14-003 admin display; needs migration 007). */
export async function getPrintifyAdminTracking(): Promise<Record<string, PrintifyAdminTracking>> {
  const rows = (await getDb()`
    SELECT order_id, state, tracking_carrier, tracking_number, tracking_url FROM printify_orders
    WHERE state IN ('submitted', 'in_production', 'shipped', 'delivered')
    ORDER BY updated_at DESC LIMIT 200`) as unknown as Row[]
  return Object.fromEntries(rows.map(r => [String(r.order_id), toAdminTracking(r)]))
}
