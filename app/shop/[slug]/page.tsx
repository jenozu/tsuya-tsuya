import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ProductDetailClient } from './product-detail-client';
import { getProduct, getImageUrls } from '@/lib/data'
import {
  breadcrumbStructuredData,
  productCanonicalUrl,
  productStructuredData,
  serializeStructuredData,
} from '@/lib/seo'

export const revalidate = 300;

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}


export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return { title: 'Product unavailable', robots: { index: false, follow: false } }

  const image = getImageUrls(product).find(url => {
    try {
      return new URL(url).protocol === 'https:'
    } catch {
      return false
    }
  })
  return {
    title: product.name,
    description: (product.description || product.name).slice(0, 160),
    alternates: { canonical: productCanonicalUrl(product.id) },
    openGraph: {
      type: 'website',
      title: product.name,
      description: (product.description || product.name).slice(0, 160),
      url: productCanonicalUrl(product.id),
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

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
      </main>
      <Footer />
    </div>
  );
}
