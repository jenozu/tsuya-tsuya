// TSU-M10-005: authoritative order line items. Checkout builds the Stripe lines from server-derived pricing
// (lib/checkout-pricing.ts); the verified webhook reads back exactly what Stripe charged and persists it per order.

export interface OrderLineItem {
  kind: 'product' | 'shipping' | 'tax'
  productId: string | null
  /** Print size label: the store's variant identifier (Printify variant ids are resolved from it at submission). */
  sizeLabel: string | null
  name: string
  quantity: number
  unitAmountCents: number
  currency: string
}

/** Subset of an expanded Stripe Checkout Session line item that the webhook reads. */
export interface StripeSessionLineItem {
  quantity: number | null
  amount_total?: number | null
  currency?: string | null
  description?: string | null
  price?: {
    unit_amount?: number | null
    currency?: string | null
    recurring?: unknown
    product?: { name?: string; metadata?: Record<string, string> }
  } | null
}

/**
 * What the paid session actually charged, one row per Stripe line. Shipping and tax rows are always present
 * (zero when Stripe had no such line) so every order carries an explicit breakdown. Never throws: a paid
 * order must persist even if Stripe data is unexpected.
 */
export function orderLineItemsFromStripe(data: StripeSessionLineItem[]): OrderLineItem[] {
  const rows: OrderLineItem[] = []
  for (const li of data) {
    if (!li.price || li.price.recurring) continue
    const name = li.price.product?.name ?? li.description ?? 'Item'
    const kind = name === 'Shipping' ? 'shipping' : name === 'Tax' ? 'tax' : 'product'
    const meta = li.price.product?.metadata ?? {}
    rows.push({
      kind,
      productId: kind === 'product' ? meta.productId || null : null,
      sizeLabel: kind === 'product' ? meta.sizeLabel || null : null,
      name,
      quantity: li.quantity ?? 1,
      unitAmountCents: li.price.unit_amount ?? 0,
      currency: (li.currency ?? li.price.currency ?? 'usd').toLowerCase(),
    })
  }
  const currency = rows[0]?.currency ?? 'usd'
  for (const kind of ['shipping', 'tax'] as const) {
    if (!rows.some(row => row.kind === kind)) {
      rows.push({ kind, productId: null, sizeLabel: null, name: kind === 'shipping' ? 'Shipping' : 'Tax',
        quantity: 1, unitAmountCents: 0, currency })
    }
  }
  return rows
}

/** Writes order + lines together; until migration 006 is applied (no order_line_items table) saves the order alone. */
export async function persistOrderWithLineItems<T>(
  lineItems: OrderLineItem[],
  withLines: () => Promise<T>,
  orderOnly: () => Promise<T>,
): Promise<T> {
  if (!lineItems.length) return orderOnly()
  try {
    return await withLines()
  } catch (e) {
    if ((e as { code?: string })?.code !== '42P01') throw e
    return orderOnly()
  }
}
