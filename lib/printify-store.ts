// Postgres side of Printify submission (table printify_orders, migrations/forward/004; not applied to production).
// Only touched when PRINTIFY_ORDERS_ENABLED is on. Bound parameters only.
import { getDb } from './db.ts'
import type { PrintifyStore } from './printify-fulfillment.ts'

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
