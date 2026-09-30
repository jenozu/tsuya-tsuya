import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ProductDetailClient } from './product-detail-client';
import { ProductCard } from '@/components/product-card';
import { getProduct, getProducts, getImageUrls } from '@/lib/data'
import { relatedProducts } from '@/lib/product-recommendations'
import {
  breadcrumbStructuredData,
  productCanonicalUrl,
  productStructuredData,
  serializeStructuredData,
  productPageTitle,
} from '@/lib/seo'

export const revalidate = 300;

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}


export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return { title: 'Product unavailable', robots: { index: false, follow: false } }

  const image = getImageUrls(product).find(url => {
    try {
      return new URL(url).protocol === 'https:'
    } catch {
      return false
    }
  })
  return {
    title: productPageTitle(product),
    description: (product.description || product.name).slice(0, 160),
    alternates: { canonical: productCanonicalUrl(product.id) },
    openGraph: {
      type: 'website',
      title: productPageTitle(product),
      description: (product.description || product.name).slice(0, 160),
      url: productCanonicalUrl(product.id),
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const recommendations = relatedProducts(product, await getProducts(), 4);

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F4]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(productStructuredData(product)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(breadcrumbStructuredData(product)) }}
      />
      <Navbar />
      <main className="flex-grow pt-24">
        <ProductDetailClient product={product} />
        {recommendations.length > 0 && (
          <section className="border-t border-[#E5E0D8] bg-[#F9F8F4]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
              <div className="mb-8">
                <p className="text-xs uppercase tracking-[0.18em] text-[#786B59] mb-2">Discover more</p>
                <h2 className="text-3xl font-serif text-[#2D2A26]">You May Also Like</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {recommendations.map(recommendation => (
                  <ProductCard key={recommendation.id} product={recommendation} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
