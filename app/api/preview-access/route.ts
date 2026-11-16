import { readBoundedJson, RequestBodyError } from '@/lib/bounded-json'
import { PUBLIC_API_FAILURE } from '@/lib/public-api-failure'
import { reportServerError } from '@/lib/safe-server-log'
import { isSameOriginMutation } from '@/lib/same-origin'
import { NextResponse } from 'next/server'
import { clearAdminLoginAttempts, consumeAdminLoginAttempt, defaultAdminThrottleStore } from '@/lib/admin-throttle'
import { signWithAdminSecret } from '@/lib/admin-session'
import { clearMemoryPreviewAttempts, consumeMemoryPreviewAttempt, previewPasswordMatches } from '@/lib/preview-access'
import { createPreviewSessionToken, PREVIEW_SESSION_MAX_AGE } from '@/lib/preview-session'

const PREVIEW_PASSWORD = process.env.PREVIEW_PASSWORD

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  if (!PREVIEW_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    reportServerError('api.preview_access.failure')
    return NextResponse.json(
      { error: PUBLIC_API_FAILURE.preview },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const body = await readBoundedJson(request, 2048)
    const password = body !== null && typeof body === 'object' && !Array.isArray(body)
      ? (body as { password?: unknown }).password : undefined

    if (typeof password !== 'string' || !password) {
      return NextResponse.json(
        { error: 'Password is required.' },
        { status: 400 },
      )
    }

    const now = Math.floor(Date.now() / 1000)
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
    const store = await defaultAdminThrottleStore()
    const bucket = store ? await signWithAdminSecret('preview:' + ip) : ''
    const attempts = [consumeMemoryPreviewAttempt(ip, now)]
    if (store) attempts.push(await consumeAdminLoginAttempt(bucket, store, now))
    const blocked = attempts.find((a) => !a.allowed)
    if (blocked) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(blocked.retryAfterSeconds) } },
      )
    }

    if (!previewPasswordMatches(password, PREVIEW_PASSWORD)) {
      return NextResponse.json(
        { error: 'Invalid password.' },
        { status: 401 },
      )
    }

    clearMemoryPreviewAttempts(ip)
    if (store) await clearAdminLoginAttempts(bucket, store)
    const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set('preview_access', await createPreviewSessionToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: PREVIEW_SESSION_MAX_AGE,
    })

    return response
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.publicMessage }, { status: error.status, headers: { 'Cache-Control': 'no-store' } })
    }
    reportServerError('api.preview_access.failure')
    return NextResponse.json(
      { error: PUBLIC_API_FAILURE.preview },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
