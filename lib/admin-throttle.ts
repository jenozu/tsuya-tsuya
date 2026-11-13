import { signWithAdminSecret } from './admin-session.ts'

export const ADMIN_LOGIN_MAX_ATTEMPTS = 5
export const ADMIN_LOGIN_WINDOW_SECONDS = 900

export type AdminThrottleStore = {
  hit(bucket: string, now: number, windowSeconds: number): Promise<{ count: number; windowStartedAt: number }>
  reset(bucket: string): Promise<void>
}

// Counts the attempt first (one atomic upsert), so parallel guesses cannot exceed the limit. Store errors propagate.
export async function consumeAdminLoginAttempt(bucket: string, store: AdminThrottleStore, now: number) {
  const { count, windowStartedAt } = await store.hit(bucket, now, ADMIN_LOGIN_WINDOW_SECONDS)
  if (count <= ADMIN_LOGIN_MAX_ATTEMPTS) return { allowed: true, retryAfterSeconds: 0 }
  const retry = windowStartedAt + ADMIN_LOGIN_WINDOW_SECONDS - now
  return { allowed: false, retryAfterSeconds: Math.min(ADMIN_LOGIN_WINDOW_SECONDS, Math.max(1, retry)) }
}

export function clearAdminLoginAttempts(bucket: string, store: AdminThrottleStore): Promise<void> {
  return store.reset(bucket)
}

export async function defaultAdminThrottleStore(): Promise<AdminThrottleStore | undefined> {
  if (process.env.ADMIN_AUTH_STORE_ENABLED !== 'true') return undefined
  return (await import('./admin-auth-store.ts')).dbThrottleStore
}

export function adminLoginBucket(request: Request): Promise<string> {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  return signWithAdminSecret('login-bucket:' + ip)
}

export const ADMIN_UPLOAD_MAX_PER_WINDOW = 30
export const ADMIN_UPLOAD_WINDOW_SECONDS = 600

// Same table and atomic upsert as login throttling; the "upload:" HMAC prefix keeps the buckets distinct.
export function adminUploadBucket(request: Request): Promise<string> {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  return signWithAdminSecret('upload:' + ip)
}

export async function consumeAdminUploadAttempt(bucket: string, store: AdminThrottleStore, now: number) {
  const { count, windowStartedAt } = await store.hit(bucket, now, ADMIN_UPLOAD_WINDOW_SECONDS)
  if (count <= ADMIN_UPLOAD_MAX_PER_WINDOW) return { allowed: true, retryAfterSeconds: 0 }
  const retry = windowStartedAt + ADMIN_UPLOAD_WINDOW_SECONDS - now
  return { allowed: false, retryAfterSeconds: Math.min(ADMIN_UPLOAD_WINDOW_SECONDS, Math.max(1, retry)) }
}
