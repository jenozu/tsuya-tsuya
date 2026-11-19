// Explicit admin fulfilment transitions. Payment-driven states (pending -> processing) are set only by the
// verified Stripe webhook, never by an admin request.
// Admin cancel is deliberately absent: a pending order can still be paid (the webhook would then reopen it),
// and cancelling a paid order needs a refund + Printify cancellation step. Refund policy is an owner decision
// (PRD section 9, TBD); add cancel transitions only together with that workflow.
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'fulfilled' | 'cancelled'

const ALLOWED: Record<string, readonly OrderStatus[]> = {
  processing: ['shipped'],
  shipped: ['delivered'],
  // No code path sets 'fulfilled' today; the paid webhook preserves it, so treat any legacy row like shipped.
  fulfilled: ['delivered'],
}

export function allowedNextStatuses(current: string): readonly OrderStatus[] {
  return Object.hasOwn(ALLOWED, current) ? ALLOWED[current] : []
}

export function canTransition(from: string, to: unknown): to is OrderStatus {
  return typeof to === 'string' && allowedNextStatuses(from).includes(to as OrderStatus)
}
