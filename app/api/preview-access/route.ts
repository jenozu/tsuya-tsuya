import { NextResponse } from 'next/server'

const PREVIEW_PASSWORD = process.env.PREVIEW_PASSWORD

export async function POST(request: Request) {
  if (!PREVIEW_PASSWORD) {
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
    response.cookies.set('preview_access', 'granted', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 4,
    })

    return response
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
