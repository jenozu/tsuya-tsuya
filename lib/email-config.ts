const PLACEHOLDER_HOSTS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'localhost',
])

function extractEmail(value: string): string | null {
  const trimmed = value.trim()
  const angle = trimmed.match(/<([^<>]+)>$/)
  return (angle?.[1] ?? trimmed).trim() || null
}

export function isOperationalEmailAddress(value: string | undefined): boolean {
  if (!value) return false
  const address = extractEmail(value)
  if (!address || address.length > 254) return false
  const at = address.lastIndexOf('@')
  if (at <= 0 || at === address.length - 1) return false

  const local = address.slice(0, at)
  const host = address.slice(at + 1).toLowerCase()
  if (!/^[^\s@]+$/.test(local) || !/^[a-z0-9.-]+$/.test(host)) return false
  if (!host.includes('.') || host.startsWith('.') || host.endsWith('.') || host.includes('..')) return false
  if (PLACEHOLDER_HOSTS.has(host) || host.endsWith('.example') || host.endsWith('.invalid') || host.endsWith('.test')) {
    return false
  }
  if (/^(your-|admin@|orders@)?example/i.test(address)) return false
  return true
}

export function getConfiguredEmailDelivery(): {
  from: string
  owner: string | null
} | null {
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  const owner = process.env.ORDER_NOTIFICATION_EMAIL?.trim()
  if (!from || !isOperationalEmailAddress(from)) return null
  return {
    from,
    owner: owner && isOperationalEmailAddress(owner) ? owner : null,
  }
}

/** Support links in customer HTML must use a real-looking plain mailbox only. */
export function safeSupportEmail(raw: string | undefined): string | null {
  const value = raw?.trim()
  if (!value || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) {
    return null
  }
  return isOperationalEmailAddress(value) ? value : null
}
