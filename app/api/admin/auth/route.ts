import { PUBLIC_API_FAILURE } from '@/lib/public-api-failure'
import { reportServerError } from '@/lib/safe-server-log'
import { isSameOriginMutation } from '@/lib/same-origin'
import { NextResponse } from 'next/server'
import { ADMIN_SESSION_MAX_AGE, createAdminSessionToken } from '@/lib/admin-session'

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  try {
    const { password } = await request.json()
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      reportServerError('api.admin_auth.failure')
      return NextResponse.json({ error: PUBLIC_API_FAILURE.authentication }, {
        status: 500, headers: { 'Cache-Control': 'no-store' },
      })
    }

    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', await createAdminSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ADMIN_SESSION_MAX_AGE,
      path: '/',
    })
    return response
  } catch {
    reportServerError('api.admin_auth.failure')
    return NextResponse.json({ error: PUBLIC_API_FAILURE.authentication }, {
      status: 500, headers: { 'Cache-Control': 'no-store' },
    })
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
