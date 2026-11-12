// Typed Printify client (createOrder, getOrder). Server-only; no SDK. Never logs or returns response text,
// addresses or emails. The caller checks PRINTIFY_ORDERS_ENABLED, not this module.
import { getPrintifyConfig } from './printify-config.ts'

const BASE_URL = 'https://api.printify.com/v1/'
const TIMEOUT_MS = 15_000

export type PrintifyAddress = {
  firstName: string
  lastName: string
  email: string
  phone?: string
  country: string
  region?: string
  address1: string
  address2?: string
  city: string
  zip: string
}

export type PrintifyOrderInput = {
  externalId: string
  label?: string
  lineItems: { productId: string; variantId: number; quantity: number; externalId?: string }[]
  addressTo: PrintifyAddress
}

export type PrintifyErrorCode =
  | 'validation' | 'not_found' | 'ineligible' | 'auth' | 'rate_limited' | 'server' | 'network' | 'timeout'

export type PrintifyFailure = {
  ok: false; code: PrintifyErrorCode; retryable: boolean; providerCode?: number; retryAfterSeconds?: number
}

export type PrintifyOrderResult = { ok: true; printifyOrderId: string; duplicate: boolean } | PrintifyFailure

// Picked fields only: no address, email or phone. status is the raw Printify string (mapping is task 20).
export type PrintifyOrderSnapshot = {
  id: string
  status?: string
  lineItems: { status?: string }[]
  shipments: { carrier?: string; number?: string; url?: string; deliveredAt?: string }[]
}

export type PrintifyGetOrderResult = { ok: true; order: PrintifyOrderSnapshot } | PrintifyFailure

type FetchLike = typeof fetch

const fail = (
  code: PrintifyErrorCode,
  retryable: boolean,
  extra: { providerCode?: number; retryAfterSeconds?: number } = {},
): PrintifyFailure => ({ ok: false, code, retryable, ...extra })

async function readJson(res: Response): Promise<any> {
  try { return await res.json() } catch { return null }
}

const asId = (v: unknown) => (typeof v === 'string' && v) || (typeof v === 'number' ? String(v) : undefined)

// Needs verification: where the 409 body carries the provider code and existing id.
function providerCodeOf(body: any): number | undefined {
  const c = body?.code ?? body?.errors?.code
  return typeof c === 'number' ? c : undefined
}
function existingIdOf(body: any): string | undefined {
  return asId(body?.id) ?? asId(body?.order?.id) ?? asId(body?.errors?.order?.id) ?? asId(body?.errors?.id)
}

export async function createOrder(
  input: PrintifyOrderInput,
  fetchImpl: FetchLike = fetch,
): Promise<PrintifyOrderResult> {
  const { apiToken, shopId } = getPrintifyConfig()
  const a = input.addressTo
  const payload = {
    external_id: input.externalId,
    label: input.label,
    line_items: input.lineItems.map(i => ({
      product_id: i.productId,
      variant_id: i.variantId,
      quantity: i.quantity,
      external_id: i.externalId,
    })),
    shipping_method: 1,
    send_shipping_notification: false,
    address_to: {
      first_name: a.firstName, last_name: a.lastName, email: a.email, phone: a.phone,
      country: a.country, region: a.region, address1: a.address1, address2: a.address2,
      city: a.city, zip: a.zip,
    },
  }

  let res: Response
  try {
    res = await fetchImpl(`${BASE_URL}shops/${encodeURIComponent(shopId)}/orders.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'User-Agent': 'TsuyaNoUchi',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    const name = (err as { name?: string })?.name
    return name === 'AbortError' || name === 'TimeoutError' ? fail('timeout', true) : fail('network', true)
  }

  const s = res.status
  if (s >= 200 && s < 300) {
    const id = asId((await readJson(res))?.id)
    return id ? { ok: true, printifyOrderId: id, duplicate: false } : fail('server', false)
  }
  const body = await readJson(res)
  const providerCode = providerCodeOf(body)
  const extra = providerCode === undefined ? {} : { providerCode }
  if (s === 409 && providerCode === 8503) {
    const id = existingIdOf(body)
    return id ? { ok: true, printifyOrderId: id, duplicate: true } : fail('server', false, extra)
  }
  return failFromStatus(res, s, extra)
}

function failFromStatus(res: Response, s: number, extra: { providerCode?: number }): PrintifyFailure {
  if (s === 400) return fail('validation', false, extra)
  if (s === 401 || s === 403) return fail('auth', false, extra)
  if (s === 404) return fail('not_found', false, extra)
  if (s === 422) return fail('ineligible', false, extra)
  if (s === 429) {
    const raw = res.headers.get('retry-after')
    const ra = raw ? Number(raw) : NaN
    return fail('rate_limited', true, { ...extra, ...(Number.isFinite(ra) && ra >= 0 ? { retryAfterSeconds: ra } : {}) })
  }
  return fail(s >= 500 ? 'server' : 'validation', s >= 500, extra)
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
const list = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter(isObj) : [])

function pickOrder(body: unknown): PrintifyOrderSnapshot | undefined {
  if (!isObj(body)) return undefined
  const id = asId(body.id)
  if (!id) return undefined
  return {
    id,
    status: str(body.status),
    lineItems: list(body.line_items).map(li => ({ status: str(li.status) })),
    shipments: list(body.shipments).map(sh => ({
      carrier: str(sh.carrier),
      number: str(sh.number),
      url: str(sh.url),
      deliveredAt: str(sh.delivered_at),
    })),
  }
}

export async function getOrder(
  printifyOrderId: string,
  fetchImpl: FetchLike = fetch,
): Promise<PrintifyGetOrderResult> {
  const { apiToken, shopId } = getPrintifyConfig()
  let res: Response
  try {
    res = await fetchImpl(
      `${BASE_URL}shops/${encodeURIComponent(shopId)}/orders/${encodeURIComponent(printifyOrderId)}.json`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiToken}`, 'User-Agent': 'TsuyaNoUchi' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    )
  } catch (err) {
    const name = (err as { name?: string })?.name
    return name === 'AbortError' || name === 'TimeoutError' ? fail('timeout', true) : fail('network', true)
  }

  const s = res.status
  if (s >= 200 && s < 300) {
    const order = pickOrder(await readJson(res))
    return order ? { ok: true, order } : fail('server', false)
  }
  const body = await readJson(res)
  const providerCode = providerCodeOf(body)
  return failFromStatus(res, s, providerCode === undefined ? {} : { providerCode })
}
