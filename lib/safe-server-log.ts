/**
 * Structured, deliberately non-identifying server diagnostics.
 * Never pass provider exception objects, emails, addresses, order IDs, SQL,
 * Stripe metadata or arbitrary user strings into application log output.
 */
type SafeLevel = 'info' | 'warn' | 'error'

function emit(level: SafeLevel, event: string): void {
  const safeEvent = /^[a-z][a-z0-9._-]{0,70}$/.test(event) ? event : 'unknown'
  const line = JSON.stringify({
    level,
    event: safeEvent,
    timestamp: new Date().toISOString(),
  })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)
}

export function reportServerInfo(event: string): void {
  emit('info', event)
}

export function reportServerWarn(event: string): void {
  emit('warn', event)
}

export function reportServerError(event: string): void {
  emit('error', event)
}
