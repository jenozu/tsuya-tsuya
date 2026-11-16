type Header = { key: string; value: string }

function origin(url?: string) {
  try { return url ? new URL(url).origin : '' } catch { return '' }
}

/** Report-only CSP. Stripe Checkout is a redirect, so no Stripe script origin is needed. */
export function reportOnlyCsp(isProduction: boolean, r2PublicUrl?: string): string {
  // ponytail: 'unsafe-inline' scripts (Next inline bootstrap) until a nonce middleware task; unsafe-eval only in dev.
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${["'self'", 'data:', 'blob:', 'https://images.unsplash.com', origin(r2PublicUrl)].filter(Boolean).join(' ')}`,
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "object-src 'none'",
  ].join('; ')
}

/** Headers that do not assume third-party script/CDN choices. */
export function siteSecurityHeaders(isProduction: boolean, r2PublicUrl?: string): Header[] {
  const headers: Header[] = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Content-Security-Policy-Report-Only', value: reportOnlyCsp(isProduction, r2PublicUrl) },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
  ]
  // Do not force HTTP Strict Transport Security on local or preview hosts;
  // do not includeSubDomains or preload without a separate domain audit.
  if (isProduction) {
    headers.push({ key: 'Strict-Transport-Security', value: 'max-age=15552000' })
  }
  return headers
}
