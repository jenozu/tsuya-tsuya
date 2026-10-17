import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hasAdminSession } from '@/lib/admin-session'
import { hasPreviewSession } from '@/lib/preview-session'

const UNDER_CONSTRUCTION = process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION === 'true'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  // Isolated Vercel preview is editorial-only: no API, admin, or backend access.
  // Keep the existing signed-preview and admin protections unchanged for other environments.
  if (process.env.VERCEL_ENV === 'preview') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Isolated editorial preview: integrations and transactions are disabled.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      )
    }
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/shop', request.url))
    }
  }
  const isAdmin = pathname.startsWith('/admin')
  const hasAdminAccess = (UNDER_CONSTRUCTION || isAdmin)
    ? await hasAdminSession(request)
    : false

  if (UNDER_CONSTRUCTION) {
    const isUnderConstructionPage = pathname === '/under-construction'
    const isApi = pathname.startsWith('/api')
    const isStatic = pathname.startsWith('/_next/static') || pathname.startsWith('/_next/image')
    const isFavicon = pathname === '/favicon.ico'
    const hasPreviewAccess = await hasPreviewSession(request)

    if (!isUnderConstructionPage && !isApi && !isStatic && !isFavicon && !isAdmin && !hasAdminAccess && !hasPreviewAccess) {
      return NextResponse.redirect(new URL('/under-construction', request.url))
    }
  }

  if (isAdmin && !pathname.startsWith('/admin/login') && !hasAdminAccess) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
