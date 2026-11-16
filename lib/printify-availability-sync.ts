// Admin-triggered, read-only (GET only) Printify availability sync. Flips private per-size availability off when the
// mapped variant is gone/disabled/out of stock and flags mismatches for the admin warning list. Never re-enables a size
// (the owner may have turned it off on purpose). Results go to admin only; no counts reach customers.
import { getPrintifyConfig } from './printify-config.ts'
import type { Product } from './types.ts'

export type AvailabilityFlag = {
  productId: string
  label: string
  reason:
    | 'variant_unavailable' | 'variant_missing' | 'variant_state_unknown' | 'unmapped'
    | 'local_off_remote_on' | 'fetch_failed' | 'update_failed'
}
// available: null when Printify omitted the stock field; flagged for the admin, never assumed either way.
export type VariantState = { id: number; available: boolean | null }

// Verified against developers.printify.com (2026-11-16): GET /v1/shops/{shop_id}/products/{product_id}.json returns
// variants[{ id, is_enabled (optional, publish selection), is_available (read-only stock status) }].
export async function fetchVariantStates(
  printifyProductId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<VariantState[] | null> {
  const { apiToken, shopId } = getPrintifyConfig()
  try {
    const res = await fetchImpl(
      `https://api.printify.com/v1/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(printifyProductId)}.json`,
      { method: 'GET', headers: { Authorization: `Bearer ${apiToken}`, 'User-Agent': 'TsuyaNoUchi' },
        signal: AbortSignal.timeout(15_000) },
    )
    if (!res.ok) return null
    const body = await res.json()
    if (!Array.isArray(body?.variants)) return null
    return body.variants.map((v: { id?: unknown; is_enabled?: unknown; is_available?: unknown }) => ({
      id: Number(v.id),
      available: v.is_enabled === false ? false : typeof v.is_available === 'boolean' ? v.is_available : null,
    }))
  } catch { return null }
}

type MappedSize = { label: string; available?: boolean; printifyProductId?: unknown; printifyVariantId?: unknown }

/** Pure: given remote states per Printify product (null = fetch failed), the labels to turn off and admin flags. */
export function planAvailabilitySync(
  products: Pick<Product, 'id' | 'sizes'>[],
  remote: Record<string, VariantState[] | null>,
) {
  const flags: AvailabilityFlag[] = []
  const updates: { productId: string; labels: string[] }[] = []
  for (const p of products) {
    const labels: string[] = []
    for (const size of (p.sizes ?? []) as MappedSize[]) {
      const flag = (reason: AvailabilityFlag['reason']) => flags.push({ productId: p.id, label: size.label, reason })
      const pid = size.printifyProductId, vid = size.printifyVariantId
      if (typeof pid !== 'string' || !pid || typeof vid !== 'number') { flag('unmapped'); continue }
      const states = remote[pid]
      if (!states) { flag('fetch_failed'); continue }
      const v = states.find(s => s.id === vid)
      if (v && v.available === null) { flag('variant_state_unknown'); continue }
      if (!v || !v.available) {
        flag(v ? 'variant_unavailable' : 'variant_missing')
        if (size.available !== false) labels.push(size.label)
      } else if (size.available === false) {
        flag('local_off_remote_on')
      }
    }
    if (labels.length) updates.push({ productId: p.id, labels })
  }
  return { updates, flags }
}

type Store = {
  getProduct: (id: string) => Promise<Product | null>
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Product | null>
}

export async function runAvailabilitySync(products: Product[], store: Store, fetchImpl: typeof fetch = fetch) {
  const ids = new Set<string>()
  for (const p of products) for (const s of (p.sizes ?? []) as MappedSize[]) {
    if (typeof s.printifyProductId === 'string' && s.printifyProductId) ids.add(s.printifyProductId)
  }
  const remote: Record<string, VariantState[] | null> = Object.fromEntries(
    await Promise.all([...ids].map(async id => [id, await fetchVariantStates(id, fetchImpl)] as const)))
  const plan = planAvailabilitySync(products, remote)
  const updatedIds: string[] = []
  const fail = (u: { productId: string; labels: string[] }) =>
    u.labels.forEach(label => plan.flags.push({ productId: u.productId, label, reason: 'update_failed' }))
  for (const u of plan.updates) {
    // Re-read so a concurrent admin edit is kept; only the planned labels flip off.
    // ponytail: updateProduct still does its own read-merge-write; a row lock would close the last tiny window.
    const fresh = await store.getProduct(u.productId)
    if (!fresh) { fail(u); continue }
    let changed = false
    const sizes = (fresh.sizes ?? []).map(s => {
      if (!u.labels.includes(s.label) || s.available === false) return s
      changed = true
      return { ...s, available: false }
    })
    if (!changed) continue
    if (await store.updateProduct(u.productId, { sizes })) updatedIds.push(u.productId)
    else fail(u)
  }
  return { flags: plan.flags, updatedIds, disabled: updatedIds.length }
}
