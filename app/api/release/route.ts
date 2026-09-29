import { NextResponse } from 'next/server'

// Build-provenance only: proves which Vercel commit the public route serves.
// This must not read databases, payment providers, admin cookies or credentials.
// A healthy response is NOT an end-to-end commerce health check.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const configured = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  const release = /^[0-9a-f]{40}$/i.test(configured) ? configured.toLowerCase() : null
  return NextResponse.json(
    { service: 'tsuya', release },
    {
      status: release ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  )
}
