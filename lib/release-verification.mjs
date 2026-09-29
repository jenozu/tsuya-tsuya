/**
 * A read-only release fingerprint/smoke check, deliberately independent of
 * Stripe, Neon, R2, Resend and authorization credentials.
 */
const SHA = /^[0-9a-f]{40}$/i
const SAFE_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function releaseOrigin(value) {
  if (typeof value !== 'string') throw new Error('Release target must be a URL')
  let url
  try { url = new URL(value) } catch { throw new Error('Invalid release target URL') }
  if (url.username || url.password || url.search || url.hash ||
      url.pathname !== '/' || !['http:', 'https:'].includes(url.protocol) ||
      (url.protocol === 'http:' && !SAFE_LOCAL_HOSTS.has(url.hostname))) {
    throw new Error('Release target must be an HTTPS origin without credentials, path or query')
  }
  return url.origin
}

function confirmedRedirect(response, allowedOrigins) {
  if (!response.url) throw new Error('Release response did not include a final URL')
  let final
  try { final = new URL(response.url) } catch { throw new Error('Release response URL is malformed') }
  if (!allowedOrigins.has(final.origin)) {
    throw new Error('Release target redirected to an unapproved origin')
  }
}

function requireBrowserHeaders(headers, requireHsts) {
  if (!/\bno-store\b/i.test(headers.get('cache-control') || '')) {
    throw new Error('Release fingerprint must not be cached')
  }
  if ((headers.get('x-content-type-options') || '').toLowerCase() !== 'nosniff' ||
      (headers.get('x-frame-options') || '').toUpperCase() !== 'DENY' ||
      !headers.get('referrer-policy')) {
    throw new Error('Missing required production security headers')
  }
  if (requireHsts && !/^max-age=\d+/i.test(headers.get('strict-transport-security') || '')) {
    throw new Error('Production HTTPS response is missing HSTS')
  }
}

function requestTimeout() {
  return AbortSignal.timeout(10_000)
}

/**
 * Tests inject fetchImpl; the CLI calls this using built-in fetch.
 * Final hostnames may redirect to *another listed* origin but nowhere else.
 */
export async function verifyRelease({
  expectedSha,
  origins,
  checkHome = true,
  requireHsts = false,
  fetchImpl = globalThis.fetch,
}) {
  if (typeof expectedSha !== 'string' || !SHA.test(expectedSha)) {
    throw new Error('Expected a complete 40-character Git commit SHA')
  }
  if (!Array.isArray(origins) || origins.length < 1 || origins.length > 3) {
    throw new Error('Supply one to three explicit origins to verify')
  }
  const targets = [...new Set(origins.map(releaseOrigin))]
  const allowedOrigins = new Set(targets)
  const sha = expectedSha.toLowerCase()

  for (const origin of targets) {
    let response
    try {
      response = await fetchImpl(origin + '/api/release', {
        method: 'GET', cache: 'no-store', redirect: 'follow', signal: requestTimeout(),
      })
    } catch {
      throw new Error('Could not reach the release fingerprint for ' + new URL(origin).hostname)
    }
    confirmedRedirect(response, allowedOrigins)
    if (response.status !== 200) {
      throw new Error('Release fingerprint returned HTTP ' + response.status + ' on ' + new URL(origin).hostname)
    }
    if (!(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
      throw new Error('Release fingerprint did not return JSON')
    }
    requireBrowserHeaders(response.headers, requireHsts)
    let body
    try {
      const data = await response.text()
      if (data.length > 4096) throw new Error('oversized')
      body = JSON.parse(data)
    } catch {
      throw new Error('Release fingerprint returned invalid JSON')
    }
    if (body?.service !== 'tsuya' || typeof body.release !== 'string' ||
        body.release.toLowerCase() !== sha) {
      throw new Error('Deployment SHA mismatch or unavailable fingerprint on ' + new URL(origin).hostname)
    }

    if (checkHome) {
      let home
      try {
        home = await fetchImpl(origin + '/', {
          method: 'GET', cache: 'no-store', redirect: 'follow', signal: requestTimeout(),
        })
      } catch {
        throw new Error('Could not reach the homepage for ' + new URL(origin).hostname)
      }
      confirmedRedirect(home, allowedOrigins)
      if (home.status !== 200 || !(home.headers.get('content-type') || '').includes('text/html')) {
        throw new Error('Homepage is not serving HTML with HTTP 200 on ' + new URL(origin).hostname)
      }
      // Under-construction HTML still qualifies as reachability, not a
      // populated storefront, connected provider or checkout verification.
    }
  }

  return { sha, checked: targets.map(origin => new URL(origin).hostname), homepageChecked: checkHome }
}
