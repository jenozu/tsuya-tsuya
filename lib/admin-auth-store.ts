import { getDb } from './db.ts'
import type { AdminSessionStore } from './admin-session.ts'
import type { AdminThrottleStore } from './admin-throttle.ts'

const ts = (v: unknown) => Math.floor(new Date(v as string).getTime() / 1000)

export const dbSessionStore: AdminSessionStore = {
  async create(id, now, expiresAt) {
    const sql = getDb()
    await sql`INSERT INTO public.admin_sessions (session_id, created_at, last_seen_at, expires_at)
      VALUES (${id}, to_timestamp(${now}::double precision), to_timestamp(${now}::double precision),
        to_timestamp(${expiresAt}::double precision))`
  },
  async find(id) {
    const sql = getDb()
    const rows = (await sql`SELECT expires_at, last_seen_at, revoked_at FROM public.admin_sessions
      WHERE session_id = ${id}`) as Array<Record<string, unknown>>
    const r = rows[0]
    if (!r) return null
    return { expiresAt: ts(r.expires_at), lastSeenAt: ts(r.last_seen_at), revokedAt: r.revoked_at ? ts(r.revoked_at) : null }
  },
  async touch(id, now) {
    const sql = getDb()
    await sql`UPDATE public.admin_sessions SET last_seen_at = to_timestamp(${now}::double precision)
      WHERE session_id = ${id}`
  },
  async revoke(id, now) {
    const sql = getDb()
    await sql`UPDATE public.admin_sessions SET revoked_at = to_timestamp(${now}::double precision)
      WHERE session_id = ${id} AND revoked_at IS NULL`
  },
}

export const dbThrottleStore: AdminThrottleStore = {
  async hit(bucket, now, windowSeconds) {
    const sql = getDb()
    const rows = (await sql`
      INSERT INTO public.admin_login_attempts AS a (bucket, attempts, window_started_at, updated_at)
      VALUES (${bucket}, 1, to_timestamp(${now}::double precision), to_timestamp(${now}::double precision))
      ON CONFLICT (bucket) DO UPDATE SET
        attempts = CASE WHEN a.window_started_at + make_interval(secs => ${windowSeconds}::double precision)
          <= to_timestamp(${now}::double precision) THEN 1 ELSE a.attempts + 1 END,
        window_started_at = CASE WHEN a.window_started_at + make_interval(secs => ${windowSeconds}::double precision)
          <= to_timestamp(${now}::double precision) THEN to_timestamp(${now}::double precision)
          ELSE a.window_started_at END,
        updated_at = to_timestamp(${now}::double precision)
      RETURNING attempts, window_started_at`) as Array<Record<string, unknown>>
    return { count: Number(rows[0].attempts), windowStartedAt: ts(rows[0].window_started_at) }
  },
  async reset(bucket) {
    const sql = getDb()
    await sql`DELETE FROM public.admin_login_attempts WHERE bucket = ${bucket}`
  },
}
