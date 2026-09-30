import type { Product } from './types'
import { productIsPurchasable } from './product-availability'

export const CANONICAL_ORIGIN = 'https://tsuyanouchi.com'

export function publicIndexingEnabled(input: {
  deploymentEnvironment?: string
  underConstruction?: boolean
}): boolean {
  // Only the public Vercel production environment is eligible for indexing.
  return input.deploymentEnvironment === 'production' && input.underConstruction !== true
}

export function productPageTitle(product: Pick<Product, 'name' | 'category'>): string {
  const name = product.name.trim()
  const category = product.category.trim()
  if (category && category.toLowerCase() !== name.toLowerCase()) {
    return `${name} - ${category} - TsuyaNoUchi`
  }
  return `${name} - TsuyaNoUchi`
}

export function productCanonicalUrl(productId: string): string {
  return `${CANONICAL_ORIGIN}/shop/${encodeURIComponent(productId)}`
}

export function productStructuredData(product: Product): Record<string, unknown> {
  const prices = purchasableSizes(product)
    .map(size => size.price)
    .filter(price => Number.isFinite(price) && price > 0)
  const price = prices.length ? Math.min(...prices) : product.price
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.name,
    url: productCanonicalUrl(product.id),
    offers: {
      '@type': 'Offer',
      url: productCanonicalUrl(product.id),
      priceCurrency: 'USD',
      price: price.toFixed(2),
      availability: productIsPurchasable(product)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  }
}

export function breadcrumbStructuredData(product: Product): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: CANONICAL_ORIGIN },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${CANONICAL_ORIGIN}/shop` },
      { '@type': 'ListItem', position: 3, name: product.name, item: productCanonicalUrl(product.id) },
    ],
  }
}

// Structured data is inserted into a <script>; escape HTML special open tags.
export function serializeStructuredData(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
