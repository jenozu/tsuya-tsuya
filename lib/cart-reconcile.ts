import type { Product } from './types'
import type { CartItem } from './cart-context'
import { getImageUrls } from './types.ts'
import { purchasableSizes } from './product-availability.ts'

/** Reconcile a persisted cart against a freshly retrieved public catalog.
 * Server-side basket repricing remains the final authority at Stripe checkout.
 */
export function reconcileCartWithCatalog(
  items: readonly CartItem[], products: readonly Product[],
): { items: CartItem[]; changed: boolean } {
  const byId = new Map(products.map(product => [product.id, product]))
  const claimed = new Map<string, number>()
  const result: CartItem[] = []

  for (const item of items) {
    const product = byId.get(item.id)
    if (!product) continue
    const allPricedSizes = (product.sizes ?? []).filter(size => Number.isFinite(size.price) && size.price > 0)
    const offered = purchasableSizes(product)
    const selection = item.selectedSize
      ? offered.find(size => size.label === item.selectedSize?.label)
      : undefined
    // Do not silently change a previously selected/discontinued variation.
    if (item.selectedSize && !selection) continue
    if (!item.selectedSize && allPricedSizes.length > 0) continue
    if (!selection && (!Number.isFinite(product.price) || product.price <= 0)) continue

    let quantity = Math.min(item.quantity, 20)
    if (allPricedSizes.length === 0) {
      if (!Number.isSafeInteger(product.stock) || product.stock <= 0) continue
      const remaining = product.stock - (claimed.get(product.id) ?? 0)
      if (remaining <= 0) continue
      quantity = Math.min(quantity, remaining)
      claimed.set(product.id, (claimed.get(product.id) ?? 0) + quantity)
    }
    if (quantity <= 0 || !Number.isSafeInteger(quantity)) continue
    const imageUrl = getImageUrls(product)[0] ?? '/product-placeholder.svg'
    result.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl,
      ...(selection ? { selectedSize: { label: selection.label, price: selection.price } } : {}),
    })
  }

  return { items: result, changed: JSON.stringify(items) !== JSON.stringify(result) }
}
