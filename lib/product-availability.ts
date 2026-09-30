import type { Product, ProductSize } from './types'

export function sizeIsAvailable(size: ProductSize): boolean {
  return size.available !== false
}

export function purchasableSizes(product: Pick<Product, 'sizes'>): ProductSize[] {
  return (product.sizes ?? []).filter(size =>
    Number.isFinite(size.price) && size.price > 0 && sizeIsAvailable(size))
}

/**
 * Sized made-to-order products are purchasable when at least one priced size
 * is marked available. The legacy product-level stock field remains a fallback
 * only for old/no-size products during the transition.
 */
export function productIsPurchasable(
  product: Pick<Product, 'sizes' | 'price' | 'stock'>,
): boolean {
  const pricedSizes = (product.sizes ?? []).filter(size =>
    Number.isFinite(size.price) && size.price > 0)
  if (pricedSizes.length > 0) return pricedSizes.some(sizeIsAvailable)
  return Number.isFinite(product.price) && product.price > 0 &&
    Number.isSafeInteger(product.stock) && product.stock > 0
}

export function internalAvailabilityCount(product: Pick<Product, 'sizes' | 'stock'>): number {
  const pricedSizes = (product.sizes ?? []).filter(size =>
    Number.isFinite(size.price) && size.price > 0)
  if (pricedSizes.length > 0) return pricedSizes.filter(sizeIsAvailable).length
  return Number.isSafeInteger(product.stock) && product.stock > 0 ? 1 : 0
}
