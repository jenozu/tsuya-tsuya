import { NextResponse } from 'next/server'
import { handlePrintifyWebhook } from '@/lib/printify-webhook'
import { getPrintifyWebhookSecret } from '@/lib/printify-config'
import { printifyWebhookStore } from '@/lib/printify-store'
import { sendOrderShipped } from '@/lib/email'

export const runtime = 'nodejs'

// Printify retries non-2xx, so unknown topics and duplicates answer 200; only bad signature/payload and our own failures do not.
export async function POST(request: Request) {
  let secret: string
  try { secret = getPrintifyWebhookSecret() } catch { return NextResponse.json({ error: 'unavailable' }, { status: 503 }) }
  const raw = await request.text()
  if (raw.length > 1_000_000) return NextResponse.json({ error: 'too large' }, { status: 413 })
  const outcome = await handlePrintifyWebhook(
    raw, request.headers.get('x-pfy-signature'), secret, printifyWebhookStore, sendOrderShipped,
  )
  if (outcome === 'invalid_signature') return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  if (outcome === 'bad_payload') return NextResponse.json({ error: 'bad request' }, { status: 400 })
  if (outcome === 'error') return NextResponse.json({ error: 'retry' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
