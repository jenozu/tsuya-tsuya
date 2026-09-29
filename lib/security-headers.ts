type Header = { key: string; value: string }

/** Headers that do not assume third-party script/CDN choices. */
export function siteSecurityHeaders(isProduction: boolean): Header[] {
  const headers: Header[] = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
  ]
  // Do not force HTTP Strict Transport Security on local or preview hosts;
  // do not includeSubDomains or preload without a separate domain audit.
  if (isProduction) {
    headers.push({ key: 'Strict-Transport-Security', value: 'max-age=15552000' })
  }
  return headers
}
