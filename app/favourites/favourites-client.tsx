'use client';

import React from 'react';
import Link from 'next/link';
import { Product } from '@/lib/supabase-helpers';
import { useFavorites } from '@/lib/favorites-context';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

interface FavouritesClientProps {
  products: Product[];
}

export function FavouritesClient({ products }: FavouritesClientProps) {
  const { favorites } = useFavorites();
  
  const favoriteProducts = products.filter(p => favorites.includes(p.id));

  return (
    <div className="min-h-screen bg-[#F9F8F4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-serif text-[#2D2A26] mb-8">Your Favourites</h1>

        {favoriteProducts.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={64} className="mx-auto text-[#E5E0D8] mb-4" />
            <p className="text-[#786B59] mb-6">You haven't added any favourites yet</p>
            <Link href="/shop">
              <Button>Explore Collection</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {favoriteProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
