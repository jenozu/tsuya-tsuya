// Task 26.1: guarded refund mechanics. Policy windows and wording stay owner decisions (TBD: refund policy).
// No route or UI calls issueRefund yet (26.2). Stripe and the database are injected so tests never touch live Stripe.
import type { Order } from './types'
import type { LifecycleKind, LifecycleResult } from './email-deliveries'

export interface RefundStripe {
  paymentIntents: {
    retrieve(id: string, params: { expand: string[] }): Promise<{
      latest_charge?: { amount: number; amount_refunded: number } | string | null
    }>
  }
  refunds: {
    create(params: { payment_intent: string; amount: number; metadata: Record<string, string> },
      options: { idempotencyKey: string }): Promise<{ id: string; amount: number; status?: string | null }>
  }
}

export type RefundResult =
  | { ok: true; refundId: string; amountCents: number; remainingCents: number }
  | { ok: false; reason: 'not_confirmed' | 'missing_idempotency_token' | 'not_refundable' | 'invalid_amount' | 'exceeds_remaining' | 'stripe_error' }

/**
 * Refunds a paid order. `confirmed` must be literally true. Omit amountCents for a full refund of what remains.
 * The amount is checked against the charge as Stripe reports it, never against browser input.
 * `idempotencyToken` is required and must be generated once per refund intent by the caller (e.g. when the admin
 * opens the refund dialog) and reused on every retry: a retry after a lost response then replays the same Stripe
 * refund instead of creating a second one. Reusing a token with a different amount fails at Stripe (stripe_error).
 * ponytail: on a replay remainingCents is computed from the post-refund charge, so it under-reports; re-read the
 * charge if 26.2 needs an exact figure.
 */
export async function issueRefund(
  order: Pick<Order, 'order_id' | 'payment_intent_id' | 'payment_status'>,
  opts: { confirmed: boolean; idempotencyToken: string; amountCents?: number },
  stripe: RefundStripe,
): Promise<RefundResult> {
  if (opts.confirmed !== true) return { ok: false, reason: 'not_confirmed' }
  const token = typeof opts.idempotencyToken === 'string' ? opts.idempotencyToken.trim() : ''
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(token)) return { ok: false, reason: 'missing_idempotency_token' }
  if (!order.payment_intent_id || !['paid', 'partially_refunded'].includes(order.payment_status)) {
    return { ok: false, reason: 'not_refundable' }
  }
  try {
    const pi = await stripe.paymentIntents.retrieve(order.payment_intent_id, { expand: ['latest_charge'] })
    const charge = pi.latest_charge
    if (!charge || typeof charge === 'string') return { ok: false, reason: 'not_refundable' }
    const remaining = charge.amount - charge.amount_refunded
    if (remaining <= 0) return { ok: false, reason: 'not_refundable' }
    const amount = opts.amountCents ?? remaining
    if (!Number.isInteger(amount) || amount <= 0) return { ok: false, reason: 'invalid_amount' }
    if (amount > remaining) return { ok: false, reason: 'exceeds_remaining' }
    // Key = order + caller token only (not the charge's refunded total, which changes after a success).
    const refund = await stripe.refunds.create(
      { payment_intent: order.payment_intent_id, amount, metadata: { orderId: order.order_id } },
      { idempotencyKey: `refund-${order.order_id}-${token}` },
    )
    return { ok: true, refundId: refund.id, amountCents: amount, remainingCents: remaining - amount }
  } catch {
    return { ok: false, reason: 'stripe_error' }
  }
}

export interface RefundSyncDeps {
  /** Sets payment_status from the charge totals; returns the order or null if no order has this intent. */
  applyRefund(paymentIntentId: string, state: 'refunded' | 'partially_refunded'): Promise<Pick<Order, 'order_id' | 'email'> | null>
  sendOnce(orderId: string, kind: LifecycleKind, send: () => Promise<boolean>): Promise<LifecycleResult>
  sendRefundEmail(to: string, orderId: string, amountLabel?: string): Promise<boolean>
}

/**
 * charge.refunded handler. Idempotent: state is derived from the charge's absolute totals, so redelivery writes the
 * same value. One refund email per order (partial refunds included; later refunds on the same order send none).
 * Fulfilment status is untouched. A failed email throws so Stripe redelivers; the once-claim keeps it single.
 */
export async function syncChargeRefunded(
  charge: { payment_intent?: string | { id: string } | null; amount: number; amount_refunded: number },
  deps: RefundSyncDeps,
): Promise<'synced' | 'no_order' | 'ignored'> {
  const intent = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  if (!intent || !(charge.amount_refunded > 0)) return 'ignored'
  const state = charge.amount_refunded >= charge.amount ? 'refunded' : 'partially_refunded'
  const order = await deps.applyRefund(intent, state)
  // Acked, not retried: a refund on a charge with no order here (e.g. a dashboard payment) would otherwise make
  // Stripe redeliver for days. Rare race: the refund lands before checkout.session.completed created the order;
  // the owner then sees it in Stripe/reconciliation, not in the order row.
  if (!order) return 'no_order'
  if (order.email) {
    // Amount wording stays generic: the exact label is a policy/copy decision.
    const result = await deps.sendOnce(order.order_id, 'refunded', () => deps.sendRefundEmail(order.email, order.order_id))
    if (result === 'failed') throw new Error('Refund email will be retried')
  }
  return 'synced'
}
