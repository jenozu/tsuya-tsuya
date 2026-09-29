import { readBoundedJson, RequestBodyError } from '@/lib/bounded-json'
import { PUBLIC_API_FAILURE } from '@/lib/public-api-failure'
import { reportServerError } from '@/lib/safe-server-log'
import { isSameOriginMutation } from '@/lib/same-origin'
import { NextResponse } from 'next/server'
import { ADMIN_SESSION_MAX_AGE, createAdminSessionToken } from '@/lib/admin-session'

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  try {
    const body = await readBoundedJson(request, 2048)
    const password = body !== null && typeof body === 'object' && !Array.isArray(body)
      ? (body as { password?: unknown }).password : undefined
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      reportServerError('api.admin_auth.failure')
      return NextResponse.json({ error: PUBLIC_API_FAILURE.authentication }, {
        status: 500, headers: { 'Cache-Control': 'no-store' },
      })
    }

    if (typeof password !== 'string' || password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set('admin_session', await createAdminSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ADMIN_SESSION_MAX_AGE,
      path: '/',
    })
    return response
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.publicMessage }, { status: error.status, headers: { 'Cache-Control': 'no-store' } })
    }
    reportServerError('api.admin_auth.failure')
    return NextResponse.json({ error: PUBLIC_API_FAILURE.authentication }, {
      status: 500, headers: { 'Cache-Control': 'no-store' },
    })
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
