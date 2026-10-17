import { NextRequest, NextResponse } from 'next/server';

/** Disable all API requests on Vercel Preview: no database, admin, orders,
 * payment intents, waitlist emails or R2 writes. Public pages use synthetic art. */
export function proxy(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview') return NextResponse.next();
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Isolated editorial preview: integrations and transactions are disabled.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/shop', request.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/api/:path*', '/admin/:path*'] };
