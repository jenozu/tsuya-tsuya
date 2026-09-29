import { readBoundedJson, RequestBodyError } from '@/lib/bounded-json'
import { isSameOriginMutation } from '@/lib/same-origin'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { addWaitlistEmail } from '@/lib/data'
import { escapeHtml } from '@/lib/html-escape'
import { reportServerError, reportServerWarn } from '@/lib/safe-server-log'
import { getConfiguredEmailDelivery } from '@/lib/email-config'

const bodySchema = z.object({ email: z.string().trim().email('Please enter a valid email address').max(254) })
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  try {
    const parsed = bodySchema.safeParse(await readBoundedJson(request, 2048))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid email' }, { status: 400 })
    }

    const email = parsed.data.email.toLowerCase().trim()
    const result = await addWaitlistEmail(email)
    if (result === 'duplicate') return NextResponse.json({ error: 'This email is already on the list.' }, { status: 409 })

    const delivery = getConfiguredEmailDelivery()
    if (resend && delivery?.owner) {
      resend.emails.send({
        from: delivery.from,
        to: delivery.owner,
        subject: 'New Waitlist Signup — TsuyaNoUchi',
        html: `<p style="font-family: Georgia, serif; color: #2D2A26;">A new visitor has joined the waitlist:</p><p style="font-family: Georgia, serif; font-size: 18px; color: #2D2A26;"><strong>${escapeHtml(email)}</strong></p>`,
      }).catch(() => reportServerError('api.waitlist.notification_failure'))
    } else {
      reportServerWarn('api.waitlist.notification_configuration_incomplete')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.publicMessage }, { status: error.status })
    }
    reportServerError('api.waitlist.request_failure')
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
