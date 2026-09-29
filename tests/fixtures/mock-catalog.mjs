// Isolated in-memory stand-in for verifying ROUTE write boundaries only.
// Does not claim a real database transaction/integration has been tested.
export const writes = []
const existingByName = new Map()
export function resetWrites() { writes.length = 0; existingByName.clear() }
export function setExistingProductByName(name, product) { existingByName.set(name, product) }
export async function getProductByName(name) { return existingByName.get(name) ?? null }
let readFailure = null
export function failCatalogReadsWith(message) { readFailure = message }
export async function getProducts() {
  if (readFailure !== null) throw new Error(readFailure)
  return []
}
export async function getProduct(id) {
  return { id, name: 'Known product', price: 12.5, category: 'Art Prints',
    stock: 3, sizes: [{ label: '8" x 10"', price: 12.5 }], image_url: '/product-placeholder.svg' }
}
export async function createProduct(data) {
  writes.push({ method: 'create', data })
  return { ...data, id: 'mock-product' }
}
export async function updateProduct(id, data) {
  writes.push({ method: 'update', id, data })
  return { ...data, id }
}
export async function deleteProduct(id) {
  writes.push({ method: 'delete', id })
  return true
}

// Task 10 abuse tests must reject oversized waitlist requests before storage.
export async function addWaitlistEmail() { throw new Error('Test must not persist waitlist email') }

 
// Synthetic order state ONLY for webhook handler tests. This does not exercise
// PostgreSQL concurrency, migration deployment, or real payment processing.
const orders = new Map()
export const orderMutations = []
let failOrderWrite = false
export function resetMockOrders() { orders.clear(); orderMutations.length = 0; failOrderWrite = false }
export function setMockOrder(order) { orders.set(order.order_id, { ...order }) }
export function failMockOrderWrite(value) { failOrderWrite = value }
export async function getOrder(id) { return orders.get(id) ?? null }
export async function createOrder(data) {
  if (failOrderWrite) return null
  orderMutations.push({ kind: 'create', id: data.order_id })
  const order = { id: 'synthetic-order', ...data }
  orders.set(data.order_id, order)
  return order
}
export async function markUnpaidOrderPaymentState(id, intentId, nextStatus) {
  if (failOrderWrite) return 'error'
  const order = orders.get(id)
  if (!order) return 'missing'
  if (['paid', 'refunded', 'partially_refunded'].includes(order.payment_status) ||
      (order.payment_intent_id && order.payment_intent_id !== intentId)) return 'protected'
  orderMutations.push({ kind: 'unpaid', id, state: nextStatus })
  orders.set(id, { ...order, status: nextStatus, payment_status: nextStatus })
  return 'updated'
}
export async function markExistingOrderPaidForIntent(id, intentId) {
  if (failOrderWrite) return false
  const order = orders.get(id)
  if (!order || ['paid', 'refunded', 'partially_refunded'].includes(order.payment_status) ||
      (order.payment_intent_id && order.payment_intent_id !== intentId)) return false
  orderMutations.push({ kind: 'paid', id })
  orders.set(id, { ...order, payment_status: 'paid',
    status: ['shipped','delivered','fulfilled'].includes(order.status) ? order.status : 'processing',
    payment_intent_id: order.payment_intent_id || intentId })
  return true
}
