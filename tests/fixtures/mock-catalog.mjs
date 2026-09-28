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
