/**
 * Structured, deliberately non-identifying server diagnostics.
 * Never pass provider exception objects, emails, addresses, order IDs, SQL,
 * Stripe metadata or arbitrary user strings into application log output.
 */
export function reportServerError(event: string): void {
  const safeEvent = /^[a-z][a-z0-9._-]{0,70}$/.test(event) ? event : 'unknown'
  console.error(JSON.stringify({
    level: 'error',
    event: safeEvent,
    timestamp: new Date().toISOString(),
  }))
}
