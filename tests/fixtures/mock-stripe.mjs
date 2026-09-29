// Stripe SDK test double: no network calls, never reads real payment secrets.
// Models Stripe's key reuse and repeated-session semantics.
export const calls = []
const sessions = new Map()
const webhookSessions = new Map()
const paymentSessions = new Map()
export function resetStripe() {
  calls.length = 0
  sessions.clear()
  webhookSessions.clear()
  paymentSessions.clear()
}
export function setWebhookSession(session) { webhookSessions.set(session.id, session) }
export function setPaymentSessions(paymentIntentId, sessionIds) {
  paymentSessions.set(paymentIntentId, sessionIds.map(id => ({ id })))
}
// The offline stub checks a synthetic sentinel, NOT a cryptographic signature.
// Actual webhook signature verification still requires Stripe test-mode checks.
export function verifyWebhookSignature(body, signature) {
  if (signature !== 'synthetic-signed-webhook-event') throw new Error('Bad synthetic signature')
  return JSON.parse(body)
}
export function markSession(idempotencyKey, status) {
  const current = sessions.get(idempotencyKey)
  if (!current) throw new Error('Unknown test session')
  current.session.status = status
}
export function expireSession(idempotencyKey) {
  const current = sessions.get(idempotencyKey)
  if (!current) throw new Error('Unknown test session')
  current.session.expires_at = Math.floor(Date.now()/1000) - 5
}
export const stripe = {
  checkout: {
    sessions: {
      async retrieve(id) {
        const result = webhookSessions.get(id)
        if (!result) throw new Error('Unregistered synthetic Stripe checkout session')
        return result
      },
      async list({ payment_intent }) {
        return { data: paymentSessions.get(payment_intent) ?? [] }
      },
      async create(params, options) {
        if (!options?.idempotencyKey) throw new Error('Test requires Stripe idempotency')
        calls.push({params,options})
        const existing = sessions.get(options.idempotencyKey)
        const serialized = JSON.stringify(params)
        if (existing) {
          if (existing.serialized !== serialized) throw new Error('Stripe idempotency parameter mismatch')
          return existing.session
        }
        const session = {
          id:'cs_test_' + String(sessions.size+1),
          url:'https://checkout.stripe.example.invalid/session/'+String(sessions.size+1),
          status:'open',
          expires_at:Math.floor(Date.now()/1000)+3600,
        }
        sessions.set(options.idempotencyKey,{serialized,session})
        return session
      },
    },
  },
}
