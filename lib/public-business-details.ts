/** Display only explicitly configured business contacts and official-host profiles. */
export function verifiedSupportAddress(raw?: string): string | null {
  const value = raw?.trim() ?? ''
  if (value.length > 254 || !/^[^\s<>@]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(value)) return null
  const hostname = value.split('@').at(-1)?.toLowerCase() ?? ''
  if (['example.com', 'example.net', 'example.org', 'localhost'].includes(hostname) ||
      hostname.endsWith('.example') || hostname.endsWith('.test') || hostname.endsWith('.invalid')) return null
  return value
}
export function publicBusinessLocation(raw?: string): string | null {
  const value = raw?.trim() ?? ''
  return value.length > 0 && value.length <= 120 && !/[<>\r\n]/.test(value) ? value : null
}
const official: Record<string,string> = {
  x: 'x.com', pinterest: 'www.pinterest.com', tumblr: 'tumblr.com',
}
export function verifiedSocialUrl(platform: 'x' | 'pinterest' | 'tumblr', raw?: string): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    const host = url.hostname.toLowerCase()
    const valid = platform === 'tumblr'
      ? host === 'tumblr.com' || (host.endsWith('.tumblr.com') && host.split('.').length === 3)
      : host === official[platform]
    if (!valid || url.protocol !== 'https:' || url.username || url.password || url.port ||
        url.search || url.hash || (url.pathname === '/' && !(platform === 'tumblr' && host !== 'tumblr.com')) || url.pathname.includes('..')) return null
    return url.toString()
  } catch { return null }
}
