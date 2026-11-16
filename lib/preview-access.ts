import { createHash, timingSafeEqual } from 'node:crypto'

export const PREVIEW_MAX_ATTEMPTS = 5
export const PREVIEW_WINDOW_SECONDS = 900

// Hash both sides first: timingSafeEqual throws on unequal lengths and hashing hides the length.
export function previewPasswordMatches(input: string, expected: string): boolean {
  const a = createHash('sha256').update(input).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

// ponytail: per-instance in-memory limit (serverless instances do not share it, so the real ceiling is
// limit x instances); works with ADMIN_AUTH_STORE_ENABLED off. The persistent store adds the shared limit.
const hits = new Map<string, { count: number; start: number }>()

export function consumeMemoryPreviewAttempt(ip: string, now: number, map = hits) {
  for (const [k, v] of map) if (now - v.start >= PREVIEW_WINDOW_SECONDS) map.delete(k)
  const entry = map.get(ip) ?? { count: 0, start: now }
  entry.count += 1
  map.set(ip, entry)
  if (entry.count <= PREVIEW_MAX_ATTEMPTS) return { allowed: true, retryAfterSeconds: 0 }
  return { allowed: false, retryAfterSeconds: Math.max(1, entry.start + PREVIEW_WINDOW_SECONDS - now) }
}

export function clearMemoryPreviewAttempts(ip: string, map = hits) {
  map.delete(ip)
}
