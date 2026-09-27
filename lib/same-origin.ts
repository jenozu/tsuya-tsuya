/**
 * Browser mutation protection for same-origin application routes.
 *
 * An attacker-controlled page cannot send a forged Origin/Sec-Fetch-Site
 * header from a browser. Never rely on SameSite cookies alone for CSRF.
 * Stripe's webhook is deliberately excluded and verifies its own signature.
 */
export function isSameOriginMutation(request: Request): boolean {
  let url: URL
  try {
    url = new URL(request.url)
  } catch {
    return false
  }

  // Only HTTPS deployments and explicitly local HTTP development are valid.
  if (url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    return false
  }

  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return false
  }

  const rawOrigin = request.headers.get('origin')
  if (!rawOrigin) {
    // Some legitimate same-origin browser requests omit Origin; browser
    // Sec-Fetch-Site is then required. Neither header => fail closed.
    return fetchSite === 'same-origin'
  }
  try {
    const origin = new URL(rawOrigin)
    return !origin.username && !origin.password &&
      origin.pathname === '/' && !origin.search && !origin.hash &&
      origin.origin === url.origin
  } catch {
    return false
  }
}
