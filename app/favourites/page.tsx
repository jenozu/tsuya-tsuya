import React from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { FavouritesClient } from './favourites-client';
import { getProducts } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

export default async function FavouritesPage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F4]">
      <Navbar />
      <main className="flex-grow pt-24">
        <FavouritesClient products={products} />
      </main>
      <Footer />
    </div>
  );
}
