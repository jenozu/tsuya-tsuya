import type { Product } from './types'
import { purchasableSizes } from './product-availability.ts'

export interface CheckoutBasketItem {
  id: string
  quantity: number
  sizeLabel?: string
}

export interface TrustedCheckoutLine {
  productId: string
  name: string
  quantity: number
  sizeLabel?: string
  unitCents: number
}

export class CheckoutBasketError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CheckoutBasketError'
  }
}

/**
 * Only current database products and variant prices may enter Stripe.
 * The caller's names, prices, images and inventory claims are ignored.
 * Stock check here is a preflight guard, not a transactional reservation.
 */
export async function priceCheckoutBasket(
  items: CheckoutBasketItem[],
  lookup: (id: string) => Promise<Product | null>,
): Promise<{ lines: TrustedCheckoutLine[]; subtotalCents: number; quantity: number }> {
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    throw new CheckoutBasketError('Your cart is empty or too large.')
  }

  const productCache = new Map<string, Product>()
  const totalByProduct = new Map<string, number>()
  const groupedLines = new Map<string, TrustedCheckoutLine>()
  let quantity = 0
  let subtotalCents = 0

  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id.trim() || item.id.length > 100 ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20 ||
      (item.sizeLabel !== undefined && (typeof item.sizeLabel !== 'string' || item.sizeLabel.length > 100))) {
      throw new CheckoutBasketError('Your cart contains invalid item details.')
    }

    let product = productCache.get(item.id)
    if (!product) {
      const current = await lookup(item.id)
      if (!current) throw new CheckoutBasketError('A cart item is no longer available. Please refresh your cart.')
      product = current
      productCache.set(item.id, product)
    }

    const allPricedSizes = (product.sizes ?? []).filter(
      size => typeof size.label === 'string' && Number.isFinite(size.price) && size.price > 0,
    )
    const availableSizes = purchasableSizes(product)
    const selectedSize = item.sizeLabel === undefined
      ? undefined
      : availableSizes.find(size => size.label === item.sizeLabel)

    if ((allPricedSizes.length > 0 && !selectedSize) ||
      (item.sizeLabel !== undefined && !selectedSize)) {
      throw new CheckoutBasketError('A selected print size has changed. Please refresh your cart.')
    }

    const price = selectedSize?.price ?? product.price
    const unitCents = Math.round(price * 100)
    if (!Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(unitCents) || unitCents < 1) {
      throw new CheckoutBasketError('A cart item has an invalid price.')
    }

    // Made-to-order sized products use per-size availability rather than a
    // customer-facing physical stock count. Keep the legacy stock guard only
    // for products that genuinely have no priced variants.
    if (allPricedSizes.length === 0) {
      const productQty = (totalByProduct.get(product.id) ?? 0) + item.quantity
      if (!Number.isSafeInteger(product.stock) || product.stock < productQty) {
        throw new CheckoutBasketError('This item is currently unavailable. Please update your cart.')
      }
      totalByProduct.set(product.id, productQty)
    }

    quantity += item.quantity
    subtotalCents += unitCents * item.quantity
    if (quantity > 100 || subtotalCents > 100_000_000 || !Number.isSafeInteger(subtotalCents)) {
      throw new CheckoutBasketError('Your cart exceeds the allowed checkout limit.')
    }

    const groupKey = JSON.stringify([product.id, item.sizeLabel ?? null])
    const existing = groupedLines.get(groupKey)
    if (existing) existing.quantity += item.quantity
    else groupedLines.set(groupKey, {
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      ...(selectedSize ? { sizeLabel: selectedSize.label } : {}),
      unitCents,
    })
  }

  return { lines: [...groupedLines.values()], subtotalCents, quantity }
}
