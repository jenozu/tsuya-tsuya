import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hasAdminSession } from '@/lib/admin-session'

const UNDER_CONSTRUCTION = process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION === 'true'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAdmin = pathname.startsWith('/admin')
  const hasAdminAccess = (UNDER_CONSTRUCTION || isAdmin)
    ? await hasAdminSession(request)
    : false

  if (UNDER_CONSTRUCTION) {
    const isUnderConstructionPage = pathname === '/under-construction'
    const isApi = pathname.startsWith('/api')
    const isStatic = pathname.startsWith('/_next/static') || pathname.startsWith('/_next/image')
    const isFavicon = pathname === '/favicon.ico'
    const previewCookie = request.cookies.get('preview_access')
    const hasPreviewAccess = previewCookie?.value === 'granted'

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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
