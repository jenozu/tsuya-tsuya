/**
 * Next Image's allowlist must never include wildcards or non-TLS hosts.
 * R2_PUBLIC_URL is a public CDN base, not a credential. Empty/unconfigured
 * development environments use only the documented Unsplash sample host.
 */
export interface TrustedImagePattern {
  protocol: 'https'
  hostname: string
  pathname: string
}

export function trustedImagePatterns(publicR2Url?: string): TrustedImagePattern[] {
  // Example import data still refers to this exact host; remove once the
  // production catalogue and historical examples use exclusively owned R2.
  const patterns: TrustedImagePattern[] = [{
    protocol: 'https',
    hostname: 'images.unsplash.com',
    pathname: '/**',
  }]
  if (!publicR2Url) return patterns

  try {
    const parsed = new URL(publicR2Url)
    // Reject non-TLS origins, malformed custom origins and embedded credentials.
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password ||
        parsed.port || parsed.search || parsed.hash ||
        parsed.hostname.includes('*')) {
      return patterns
    }
    const pathname = parsed.pathname.replace(/\/+$/, '')
    const rule: TrustedImagePattern = {
      protocol: 'https',
      hostname: parsed.hostname,
      pathname: `${pathname}/**`,
    }
    if (!patterns.some(pattern => pattern.hostname === rule.hostname && pattern.pathname === rule.pathname)) {
      patterns.push(rule)
    }
  } catch {
    // The build does not authorize invalid origins.
  }
  return patterns
}
