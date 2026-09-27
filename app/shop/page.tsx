import React from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ShopClient } from './shop-client';
import { getProducts } from '@/lib/data'

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Shop Art Prints | TsuyaNoUchi',
  alternates: { canonical: '/shop' },
};

export default async function ShopPage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F4]">
      <Navbar />
      <main className="flex-grow pt-24">
        <ShopClient products={products} />
      </main>
      <Footer />
    </div>
  );
}
