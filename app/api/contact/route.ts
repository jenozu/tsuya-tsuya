import { Resend } from 'resend'
import { handleContact } from '@/lib/contact-form'
import { defaultAdminThrottleStore } from '@/lib/admin-throttle'
import type { AdminThrottleStore } from '@/lib/admin-throttle'
import { signWithAdminSecret } from '@/lib/admin-session'

// ponytail: per-instance fallback when the persistent store is disabled (dev); production sets ADMIN_AUTH_STORE_ENABLED.
const memory = new Map<string, { count: number; windowStartedAt: number }>()
const memoryStore: AdminThrottleStore = {
  async hit(bucket, now, windowSeconds) {
    const e = memory.get(bucket)
    const cur = e && now - e.windowStartedAt < windowSeconds
      ? { count: e.count + 1, windowStartedAt: e.windowStartedAt }
      : { count: 1, windowStartedAt: now }
    memory.set(bucket, cur)
    return cur
  },
  async reset(bucket) { memory.delete(bucket) },
}

export async function POST(request: Request) {
  const store = (await defaultAdminThrottleStore()) ?? memoryStore
  return handleContact(request, {
    store,
    bucket: (r) => {
      const ip = (r.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
      return process.env.ADMIN_SESSION_SECRET ? signWithAdminSecret('contact:' + ip) : Promise.resolve('contact:' + ip)
    },
    async send(m) {
      if (!process.env.RESEND_API_KEY) throw new Error('email not configured')
      const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send(m)
      if (error) throw new Error('send failed')
    },
  })
}
