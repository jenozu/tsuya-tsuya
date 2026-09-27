import type { CartItem } from './cart-context'

const MAX_LINE_QUANTITY = 20
const MAX_LINES = 30
const MAX_TOTAL_QUANTITY = 100

function money(value: unknown, allowZero = false): value is number {
  return typeof value === 'number' && Number.isFinite(value) &&
    value >= (allowZero ? 0 : 0.01) && value <= 1_000_000 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-6
}

/** Validate untrusted cached cart data without preserving malformed variants. */
export function normalizeCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return []
  const result: CartItem[] = []
  const index = new Map<string, CartItem>()
  let totalQuantity = 0

  for (const entry of raw) {
    if (totalQuantity >= MAX_TOTAL_QUANTITY) break
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    if (typeof item.id !== 'string' || !item.id.trim() || item.id.length > 100 ||
      typeof item.name !== 'string' || !item.name.trim() || item.name.length > 200 ||
      !money(item.price, true) || typeof item.quantity !== 'number' ||
      !Number.isInteger(item.quantity) || item.quantity < 1) continue

    let selectedSize: CartItem['selectedSize']
    if (item.selectedSize != null) {
      if (typeof item.selectedSize !== 'object') continue
      const size = item.selectedSize as Record<string, unknown>
      if (typeof size.label !== 'string' || !size.label.trim() || size.label.length > 100 ||
        !money(size.price)) continue
      selectedSize = { label: size.label, price: size.price }
    }
    if (!selectedSize && !money(item.price)) continue

    const key = JSON.stringify([item.id, selectedSize?.label ?? null])
    const requested = Math.min(MAX_LINE_QUANTITY, item.quantity)
    const existing = index.get(key)
    if (existing) {
      const delta = Math.min(MAX_LINE_QUANTITY - existing.quantity,
        MAX_TOTAL_QUANTITY - totalQuantity, requested)
      existing.quantity += delta
      totalQuantity += delta
    } else if (result.length < MAX_LINES) {
      const count = Math.min(requested, MAX_TOTAL_QUANTITY - totalQuantity)
      const clean: CartItem = {
        id: item.id,
        name: item.name.trim(),
        price: item.price,
        quantity: count,
        imageUrl: typeof item.imageUrl === 'string' && item.imageUrl.length <= 2048
          ? item.imageUrl : '/product-placeholder.svg',
        ...(selectedSize ? { selectedSize } : {}),
      }
      index.set(key, clean)
      result.push(clean)
      totalQuantity += count
    }
  }
  return result
}

export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return []
  try {
    return normalizeCart(JSON.parse(raw))
  } catch {
    return []
  }
}

export function calculateCartTotal(items: readonly CartItem[]): number {
  const cents = items.reduce((sum, item) => {
    const price = item.selectedSize?.price ?? item.price
    return sum + Math.round(price * 100) * item.quantity
  }, 0)
  return cents / 100
}
