import { z } from 'zod'
import { readBoundedJson, RequestBodyError } from './bounded-json.ts'
import { isSameOriginMutation } from './same-origin.ts'
import { escapeHtml } from './html-escape.ts'
import { safeSupportEmail, getConfiguredEmailDelivery } from './email-config.ts'
import { reportServerError } from './safe-server-log.ts'
import type { AdminThrottleStore } from './admin-throttle.ts'

export const CONTACT_MAX_PER_WINDOW = 5
export const CONTACT_WINDOW_SECONDS = 3600

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name.').max(100),
  email: z.string().trim().email('Please enter a valid email address.').max(254),
  message: z.string().trim().min(10, 'Please enter a message of at least 10 characters.').max(3000),
  website: z.string().max(200).optional(), // honeypot: real users never fill it
})

export type ContactDeps = {
  store: AdminThrottleStore
  bucket: (request: Request) => Promise<string>
  send: (m: { from: string; to: string; replyTo: string; subject: string; html: string }) => Promise<void>
  now?: () => number
}

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } })

export async function handleContact(request: Request, deps: ContactDeps): Promise<Response> {
  if (!isSameOriginMutation(request)) return json({ error: 'Forbidden request origin' }, 403)
  // Recipient is only ever the configured SUPPORT_EMAIL, never anything from the request.
  const to = safeSupportEmail(process.env.SUPPORT_EMAIL)
  const delivery = getConfiguredEmailDelivery()
  if (!to || !delivery) {
    reportServerError('api.contact.not_configured')
    return json({ error: 'The contact form is temporarily unavailable.' }, 503)
  }
  try {
    const parsed = contactSchema.safeParse(await readBoundedJson(request, 8192))
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, 400)
    // Spam: pretend success, send nothing, spend no rate-limit budget.
    if (parsed.data.website) return json({ ok: true }, 200)

    const now = (deps.now ?? (() => Math.floor(Date.now() / 1000)))()
    const { count, windowStartedAt } = await deps.store.hit(await deps.bucket(request), now, CONTACT_WINDOW_SECONDS)
    if (count > CONTACT_MAX_PER_WINDOW) {
      const retry = Math.min(CONTACT_WINDOW_SECONDS, Math.max(1, windowStartedAt + CONTACT_WINDOW_SECONDS - now))
      return json({ error: 'Too many messages. Please try again later.' }, 429, { 'retry-after': String(retry) })
    }

    const { name, email, message } = parsed.data
    await deps.send({
      from: delivery.from, to, replyTo: email,
      subject: 'New contact form message - TsuyaNoUchi',
      html: `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)})</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    })
    return json({ ok: true }, 200)
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.publicMessage }, error.status)
    reportServerError('api.contact.failure')
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
