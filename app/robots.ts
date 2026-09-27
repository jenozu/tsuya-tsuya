import type { MetadataRoute } from 'next'
import { CANONICAL_ORIGIN, publicIndexingEnabled } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  const shouldIndex = publicIndexingEnabled({
    deploymentEnvironment: process.env.VERCEL_ENV,
    underConstruction: process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION === 'true',
  })
  if (!shouldIndex) return { rules: [{ userAgent: '*', disallow: '/' }] }

  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/cart', '/checkout', '/favourites',
        '/thank-you', '/under-construction', '/preview/'],
    }],
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
    host: CANONICAL_ORIGIN,
  }
}
