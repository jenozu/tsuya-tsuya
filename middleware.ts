import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const UNDER_CONSTRUCTION = process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION === 'true'

export function middleware(request: NextRequest) {
  if (UNDER_CONSTRUCTION) {
    const pathname = request.nextUrl.pathname
    const isUnderConstructionPage = pathname === '/under-construction'
    const isApi = pathname.startsWith('/api')
    const isStatic = pathname.startsWith('/_next/static') || pathname.startsWith('/_next/image')
    const isFavicon = pathname === '/favicon.ico'
    const isAdmin = pathname.startsWith('/admin')

    const adminSession = request.cookies.get('admin_session')
    const hasAdminAccess = adminSession?.value === 'authenticated'

    const previewCookie = request.cookies.get('preview_access')
    const hasPreviewAccess = previewCookie?.value === 'granted'

    if (!isUnderConstructionPage && !isApi && !isStatic && !isFavicon && !isAdmin && !hasAdminAccess && !hasPreviewAccess) {
      return NextResponse.redirect(new URL('/under-construction', request.url))
    }
  }

  // Check if the request is for admin routes (except login)
  if (request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/admin/login')) {
    const adminSession = request.cookies.get('admin_session')

    if (!adminSession || adminSession.value !== 'authenticated') {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Run on all paths except API, static assets, and favicon
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
