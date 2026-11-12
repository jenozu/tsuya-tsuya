// Submits a paid order to Printify exactly once (task 19, docs/PRINTIFY_FULFILLMENT.md sections 4-5).
// Called only from the signature-verified Stripe webhook after the paid order row and emails; the caller checks
// PRINTIFY_ORDERS_ENABLED. Never throws, never logs customer data or provider text (codes go to the DB only).
import { createOrder, type PrintifyOrderInput, type PrintifyOrderResult } from './printify.ts'
import { reportServerError, reportServerInfo, reportServerWarn } from './safe-server-log.ts'
import type { Order } from './types.ts'

// Retryable failures (5xx, 429, network) go back to 'pending' until this many attempts, then 'needs_attention'.
export const MAX_ATTEMPTS = 5
// TBD owner (design section 9 item 4): who is alerted on needs_attention. Until then the admin Orders tab is the signal.

export type PrintifyStore = {
  /** Insert the durable 'pending' intent; no-op when the order or session already has a row. */
  ensure(orderId: string, sessionId: string): Promise<void>
  /** Atomically move a claimable row (pending, or submitting with an expired lease) to submitting.
   *  Returns the attempt count after the claim, or null when not claimable (done, in flight, other session). */
  claim(orderId: string, sessionId: string): Promise<number | null>
  markSubmitted(orderId: string, printifyOrderId: string): Promise<void>
  markFailed(orderId: string, state: 'pending' | 'needs_attention', code: string): Promise<void>
  /** Raw JSONB sizes of a catalog product (unknown shape: narrowed here). */
  productSizes(productId: string): Promise<unknown>
}

export type SubmitOutcome = 'skipped' | 'submitted' | 'retry_pending' | 'needs_attention' | 'error'

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const opt = (v: string | undefined) => v?.trim() || undefined

// Mapping lives on each catalog size record: { label, printifyProductId: string, printifyVariantId: integer }.
async function mapLineItems(order: Order, store: PrintifyStore): Promise<PrintifyOrderInput['lineItems'] | null> {
  const out: PrintifyOrderInput['lineItems'] = []
  for (const [i, item] of order.items.entries()) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) return null
    const sizes = await store.productSizes(item.productId)
    const label = item.selectedSize?.trim()
    const size = Array.isArray(sizes)
      ? (sizes as unknown[]).filter(isObj).find(s => typeof s.label === 'string' && s.label.trim() === label)
      : undefined
    const productId = size?.printifyProductId
    const variantId = size?.printifyVariantId
    if (typeof productId !== 'string' || !productId || typeof variantId !== 'number' ||
        !Number.isInteger(variantId) || variantId < 1) return null
    out.push({ productId, variantId, quantity: item.quantity, externalId: `${order.order_id}:${i}` })
  }
  return out.length ? out : null
}

function toInput(order: Order, sessionId: string, lineItems: PrintifyOrderInput['lineItems']): PrintifyOrderInput {
  const a = order.shipping_address
  return {
    externalId: sessionId,
    label: order.order_id,
    lineItems,
    addressTo: {
      firstName: a.firstName, lastName: a.lastName, email: order.email, phone: opt(a.phone),
      country: a.country, region: opt(a.state), address1: a.address,
      address2: opt([a.addressLine2, a.unitNumber].filter(Boolean).join(' ')), city: a.city, zip: a.postalCode,
    },
  }
}

export async function submitPaidOrderToPrintify(
  order: Order,
  sessionId: string,
  store: PrintifyStore,
  fetchImpl?: typeof fetch,
): Promise<SubmitOutcome> {
  if (order.payment_status !== 'paid' || !sessionId.startsWith('cs_')) return 'skipped'
  try {
    await store.ensure(order.order_id, sessionId)
    const attempts = await store.claim(order.order_id, sessionId)
    if (attempts === null) {
      reportServerInfo('printify.order.not_claimable')
      return 'skipped'
    }

    const lineItems = await mapLineItems(order, store)
    let result: PrintifyOrderResult | { ok: false; code: string; retryable: boolean }
    if (!lineItems) {
      result = { ok: false, code: 'mapping_missing', retryable: false }
    } else {
      try {
        result = await createOrder(toInput(order, sessionId, lineItems), fetchImpl)
      } catch {
        result = { ok: false, code: 'config', retryable: false } // missing/blank Printify env
      }
    }

    if (result.ok) {
      await store.markSubmitted(order.order_id, result.printifyOrderId)
      reportServerInfo('printify.order.submitted')
      return 'submitted'
    }
    if (result.retryable && attempts < MAX_ATTEMPTS) {
      await store.markFailed(order.order_id, 'pending', result.code)
      reportServerWarn('printify.order.retry_pending')
      return 'retry_pending'
    }
    await store.markFailed(order.order_id, 'needs_attention', result.code)
    reportServerError('printify.order.needs_attention')
    return 'needs_attention'
  } catch {
    reportServerError('printify.order.store_failure')
    return 'error'
  }
}
