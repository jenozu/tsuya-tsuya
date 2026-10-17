'use client';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useFavorites } from '@/lib/favorites-context';
import { ProductCard } from '@/components/product-card';

export function FavouritesClient({products}:{products:Product[]}) {
 const {favorites}=useFavorites();
 const saved=products.filter(product=>favorites.includes(product.id));
 return (
  <div className="min-h-screen">
   <div className="bg-[#EAE5DE] py-24 md:py-32">
    <div className="editorial-container">
     <p className="editorial-eyebrow mb-10">The house / your edit</p>
     <h1 className="editorial-serif text-[clamp(5rem,10vw,11rem)]">Saved <em>pieces.</em></h1>
     <p className="text-[#786B59] max-w-md mt-7 leading-[1.8]">A personal collection of the works that caught your eye. Return whenever inspiration strikes.</p>
    </div>
   </div>
   <div className="editorial-container py-20 md:py-28">
    <p className="editorial-eyebrow mb-11">{saved.length} {saved.length===1?'saved work':'saved works'}</p>
    {saved.length?<div className="editorial-grid">{saved.map(product=><ProductCard key={product.id} product={product}/>)}</div>:
     <div className="border-y border-[#D4CEC5] py-28 text-center">
      <Heart size={25} strokeWidth={1} className="mx-auto text-[#786B59] mb-8"/>
      <h2 className="font-serif text-5xl md:text-6xl mb-5">Your collection begins here.</h2>
      <p className="text-sm text-[#786B59] mb-10">Tap the heart beside an artwork to keep it close.</p>
      <Link href="/shop" className="editorial-link">Discover artworks <ArrowRight size={17}/></Link>
     </div>}
   </div>
  </div>
 );
}
