import { NextResponse } from 'next/server'
import { createPreviewSessionToken, PREVIEW_SESSION_MAX_AGE } from '@/lib/preview-session'

const PREVIEW_PASSWORD = process.env.PREVIEW_PASSWORD

export async function POST(request: Request) {
  if (!PREVIEW_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json(
      { error: 'Preview access is not configured.' },
      { status: 500 },
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
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
