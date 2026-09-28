import { isSameOriginMutation } from '@/lib/same-origin'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { addWaitlistEmail } from '@/lib/data'
import { escapeHtml } from '@/lib/html-escape'
import { reportServerError } from '@/lib/safe-server-log'

const bodySchema = z.object({ email: z.string().email('Please enter a valid email address') })
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL
const ADMIN_EMAIL = process.env.ORDER_NOTIFICATION_EMAIL

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid email' }, { status: 400 })
    }

    const email = parsed.data.email.toLowerCase().trim()
    const result = await addWaitlistEmail(email)
    if (result === 'duplicate') return NextResponse.json({ error: 'This email is already on the list.' }, { status: 409 })

    if (resend && FROM_EMAIL && ADMIN_EMAIL) {
      resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: 'New Waitlist Signup — TsuyaNoUchi',
        html: `<p style="font-family: Georgia, serif; color: #2D2A26;">A new visitor has joined the waitlist:</p><p style="font-family: Georgia, serif; font-size: 18px; color: #2D2A26;"><strong>${escapeHtml(email)}</strong></p>`,
      }).catch(() => reportServerError('api.waitlist.notification_failure'))
    }

    return NextResponse.json({ ok: true })
  } catch {
    reportServerError('api.waitlist.request_failure')
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
