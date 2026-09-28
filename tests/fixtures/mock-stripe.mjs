// Stripe SDK test double: no network calls, never reads real payment secrets.
// Models Stripe's key reuse and repeated-session semantics.
export const calls = []
const sessions = new Map()
export function resetStripe() { calls.length = 0; sessions.clear() }
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
