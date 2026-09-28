/**
 * Stripe return URLs must come from trusted server-side configuration only.
 * Never accept a caller-supplied Origin, Host, successUrl or cancelUrl.
 */
const CANONICAL_SITE = 'https://tsuyanouchi.com'

interface CheckoutUrlEnvironment {
  nodeEnv?: string
  vercelEnv?: string
  vercelUrl?: string
  siteUrl?: string
  requestOrigin?: string
}

function httpsOrigin(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null
    return url.origin
  } catch {
    return null
  }
}

export function trustedCheckoutOrigin(environment: CheckoutUrlEnvironment = {}): string {
  const {
    nodeEnv,
    vercelEnv,
    vercelUrl,
    siteUrl,
    requestOrigin,
  } = environment

  if (vercelEnv === 'preview' && vercelUrl) {
    // Vercel sets this env on preview builds. Do not use arbitrary request headers.
    const origin = httpsOrigin(`https://${vercelUrl}`)
    if (origin && new URL(origin).hostname.endsWith('.vercel.app')) return origin
  }

  const configured = httpsOrigin(siteUrl)
  if (configured) return configured

  if (nodeEnv !== 'production' && requestOrigin) {
    try {
      const local = new URL(requestOrigin)
      if (['localhost', '127.0.0.1'].includes(local.hostname) && ['http:', 'https:'].includes(local.protocol)
        && !local.username && !local.password && local.pathname === '/' && !local.search && !local.hash) {
        return local.origin
      }
    } catch {
      // Invalid request origins are never reflected.
    }
  }

  return CANONICAL_SITE
}

export function trustedCheckoutReturnUrls(
  orderId: string,
  environment: CheckoutUrlEnvironment = {},
): { success: string; cancel: string } {
  const origin = trustedCheckoutOrigin(environment)
  const success = new URL('/thank-you', origin)
  success.searchParams.set('orderId', orderId)
  return { success: success.toString(), cancel: new URL('/checkout?canceled=1', origin).toString() }
}
