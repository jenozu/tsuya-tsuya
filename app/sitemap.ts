import type { MetadataRoute } from 'next'
import { getProducts } from '@/lib/data'
import {
  CANONICAL_ORIGIN,
  productCanonicalUrl,
  publicIndexingEnabled,
} from '@/lib/seo'
import { underConstructionEnabled } from '@/lib/under-construction'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!publicIndexingEnabled({
    deploymentEnvironment: process.env.VERCEL_ENV,
    underConstruction: underConstructionEnabled(),
  })) return []

  const products = await getProducts()
  return [
    { url: CANONICAL_ORIGIN, changeFrequency: 'weekly', priority: 1 },
    { url: `${CANONICAL_ORIGIN}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${CANONICAL_ORIGIN}/shipping`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${CANONICAL_ORIGIN}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    ...products.map(product => ({
      url: productCanonicalUrl(product.id),
      ...(product.updated_at ? { lastModified: new Date(product.updated_at) } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]
}
