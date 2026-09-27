import type { MetadataRoute } from 'next'
import { getProducts } from '@/lib/data'
import {
  CANONICAL_ORIGIN,
  productCanonicalUrl,
  publicIndexingEnabled,
} from '@/lib/seo'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!publicIndexingEnabled({
    deploymentEnvironment: process.env.VERCEL_ENV,
    underConstruction: process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION === 'true',
  })) return []

  const products = await getProducts()
  return [
    { url: CANONICAL_ORIGIN, changeFrequency: 'weekly', priority: 1 },
    { url: `${CANONICAL_ORIGIN}/shop`, changeFrequency: 'daily', priority: 0.9 },
    ...products.map(product => ({
      url: productCanonicalUrl(product.id),
      ...(product.updated_at ? { lastModified: new Date(product.updated_at) } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]
}
