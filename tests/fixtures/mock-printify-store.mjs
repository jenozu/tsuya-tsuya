// In-memory stand-in for lib/printify-store.ts (no test DB yet, task 4). Mirrors the SQL semantics:
// one row per order and per session, claim only from pending or an expired submitting lease.
// JS runs each claim synchronously, so this proves the logic, not PostgreSQL row locking.
export const rows = new Map()
export const storeCalls = []
const sizesByProduct = new Map()
let failNext = false

export function resetPrintifyStore() { rows.clear(); storeCalls.length = 0; sizesByProduct.clear(); failNext = false }
export function setProductSizes(productId, sizes) { sizesByProduct.set(productId, sizes) }
export function failNextStoreCall() { failNext = true }
export function expireClaim(orderId) { rows.get(orderId).claimExpired = true }

function track(name, ...args) {
  storeCalls.push(name)
  if (failNext) { failNext = false; throw new Error('synthetic store failure') }
  return args
}

export const printifyStore = {
  async ensure(orderId, sessionId) {
    track('ensure')
    if (rows.has(orderId) || [...rows.values()].some(r => r.sessionId === sessionId)) return
    rows.set(orderId, { orderId, sessionId, state: 'pending', attempts: 0, printifyOrderId: null, lastErrorCode: null })
  },
  async claim(orderId, sessionId) {
    track('claim')
    const r = rows.get(orderId)
    if (!r || r.sessionId !== sessionId) return null
    if (!(r.state === 'pending' || (r.state === 'submitting' && r.claimExpired))) return null
    Object.assign(r, { state: 'submitting', attempts: r.attempts + 1, claimExpired: false })
    return r.attempts
  },
  async markSubmitted(orderId, printifyOrderId) {
    track('markSubmitted')
    const r = rows.get(orderId)
    if (r?.state === 'submitting') Object.assign(r, { state: 'submitted', printifyOrderId, lastErrorCode: null })
  },
  async markFailed(orderId, state, code) {
    track('markFailed')
    const r = rows.get(orderId)
    if (r?.state === 'submitting') Object.assign(r, { state, lastErrorCode: code })
  },
  async productSizes(productId) {
    track('productSizes')
    return sizesByProduct.get(productId) ?? null
  },
}
