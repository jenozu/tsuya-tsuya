import React from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ShopClient } from './shop-client';
import { getProducts } from '@/lib/supabase-helpers';

export const revalidate = 300;

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
