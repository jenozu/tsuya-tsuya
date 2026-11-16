// Printify status/tracking webhook handling (task 20, docs/PRINTIFY_FULFILLMENT.md section 6).
// Verify the HMAC over the raw body first, dedupe by event id, apply forward-only state changes, email shipped once.
// Never logs payload contents (customer data lives in them).
import { createHmac, timingSafeEqual } from 'node:crypto'
import { reportServerError } from './safe-server-log.ts'

export type Tracking = { carrier?: string; number?: string; url?: string }
export type OrderState = 'submitted' | 'in_production' | 'shipped' | 'delivered'

export type PrintifyWebhookStore = {
  /** True when the event id is new; false for a replay. */
  recordEvent(eventId: string): Promise<boolean>
  forgetEvent(eventId: string): Promise<void>
  /** Moves the row to `to` only from a state in `from`; tracking is saved whenever given. */
  advance(printifyOrderId: string, to: OrderState, from: string[], tracking?: Tracking): Promise<void>
  /** Atomically marks the shipped email as sent-in-progress; null when already claimed or the order is unknown. */
  claimShippedEmail(printifyOrderId: string): Promise<{ orderId: string; email: string; tracking: Tracking } | null>
  releaseShippedEmail(printifyOrderId: string): Promise<void>
}

export type WebhookOutcome = 'invalid_signature' | 'bad_payload' | 'duplicate' | 'ignored' | 'processed' | 'error'

export function verifyPrintifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false
  const given = header.trim().replace(/^sha256=/i, '')
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(given), b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 500) : undefined)

// Forward only: a late or replayed earlier event never moves an order back.
const FROM: Record<OrderState, string[]> = {
  submitted: [],
  in_production: ['submitted'],
  shipped: ['submitted', 'in_production'],
  delivered: ['submitted', 'in_production', 'shipped'],
}

function trackingOf(data: Record<string, unknown>): Tracking {
  const c = data.carrier
  return {
    carrier: str(isObj(c) ? c.code ?? c.name : c),
    number: str(data.tracking_number),
    url: str(data.tracking_url),
  }
}

export async function handlePrintifyWebhook(
  rawBody: string,
  signature: string | null,
  secret: string,
  store: PrintifyWebhookStore,
  sendShipped: (email: string, orderId: string, tracking: Tracking) => Promise<boolean>,
): Promise<WebhookOutcome> {
  if (!verifyPrintifySignature(rawBody, signature, secret)) return 'invalid_signature'
  let evt: unknown
  try { evt = JSON.parse(rawBody) } catch { return 'bad_payload' }
  if (!isObj(evt)) return 'bad_payload'
  const id = str(evt.id), type = str(evt.type)
  const res = isObj(evt.resource) ? evt.resource : null
  const printifyOrderId = res ? str(res.id) : undefined
  if (!id || !type || !printifyOrderId) return 'bad_payload'
  const data = isObj(res?.data) ? res.data : {}

  const to: OrderState | null =
    type === 'order:sent-to-production' ? 'in_production'
    : type === 'order:shipment:created' ? 'shipped'
    : type === 'order:shipment:delivered' ? 'delivered' : null
  if (!to) return 'ignored'

  try {
    if (!(await store.recordEvent(id))) return 'duplicate'
    try {
      const tracking = type === 'order:shipment:created' ? trackingOf(data) : undefined
      await store.advance(printifyOrderId, to, FROM[to], tracking)
      if (to === 'shipped') {
        const claim = await store.claimShippedEmail(printifyOrderId)
        if (claim) {
          let ok = false
          try { ok = await sendShipped(claim.email, claim.orderId, claim.tracking) } finally {
            if (!ok) await store.releaseShippedEmail(printifyOrderId).catch(() => {})
          }
          if (!ok) throw new Error('shipped email failed')
        }
      }
    } catch (e) {
      await store.forgetEvent(id).catch(() => {}) // let Printify's retry reprocess it
      throw e
    }
    return 'processed'
  } catch {
    reportServerError('printify.webhook.processing_failed')
    return 'error'
  }
}
