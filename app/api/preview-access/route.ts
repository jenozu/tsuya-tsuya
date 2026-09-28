import { PUBLIC_API_FAILURE } from '@/lib/public-api-failure'
import { reportServerError } from '@/lib/safe-server-log'
import { isSameOriginMutation } from '@/lib/same-origin'
import { NextResponse } from 'next/server'
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
    const body = await request.json().catch(() => ({}))
    const { password } = body as { password?: string }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required.' },
        { status: 400 },
      )
    }

    if (password !== PREVIEW_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password.' },
        { status: 401 },
      )
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('preview_access', await createPreviewSessionToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: PREVIEW_SESSION_MAX_AGE,
    })

    return response
  } catch {
    reportServerError('api.preview_access.failure')
    return NextResponse.json(
      { error: PUBLIC_API_FAILURE.preview },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
