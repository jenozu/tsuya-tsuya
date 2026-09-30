import type { Product } from './types'
import { productIsPurchasable } from './product-availability.ts'

export function relatedProducts(
  current: Pick<Product, 'id' | 'category'>,
  catalog: readonly Product[],
  limit = 4,
): Product[] {
  if (!Number.isInteger(limit) || limit < 1) return []

  const others = catalog.filter(product => product.id !== current.id && productIsPurchasable(product))
  const normalizedCategory = current.category.trim().toLowerCase()

  const sameCategory = others.filter(product =>
    product.category.trim().toLowerCase() === normalizedCategory)
  const otherCategories = others.filter(product =>
    product.category.trim().toLowerCase() !== normalizedCategory)

  return [...sameCategory, ...otherCategories].slice(0, limit)
}
