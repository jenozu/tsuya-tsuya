'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product, getImageUrls } from '@/lib/supabase-helpers';
import { ShoppingBag, Heart } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useFavorites } from '@/lib/favorites-context';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  
  const isProductFavorite = isFavorite(product.id);
  const imageUrls = getImageUrls(product);
  const primaryImage = imageUrls[0] || product.image_url;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: primaryImage,
    });
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  return (
    <Link 
      href={`/shop/${product.id}`}
      className="group relative bg-[#F9F8F4] border border-[#E5E0D8] hover:border-[#CDC6BC] transition-all duration-300 hover:shadow-lg cursor-pointer block"
    >
      <div className="aspect-[3/4] overflow-hidden bg-[#F2EFE9] relative">
        <Image
          src={primaryImage}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-95 group-hover:opacity-100 mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
        
        {/* Favourite Button */}
        <button
          onClick={handleToggleFavorite}
          className="absolute top-3 right-3 p-2 rounded-full bg-[#F9F8F4]/90 backdrop-blur-sm hover:bg-white text-[#2D2A26] transition-all duration-200 z-10 shadow-sm"
        >
          <Heart size={18} className={isProductFavorite ? "fill-[#8C3F3F] text-[#8C3F3F]" : "text-[#2D2A26]"} />
        </button>

        <button 
          onClick={handleAddToCart}
          className="absolute bottom-4 right-4 bg-[#F9F8F4] p-3 rounded-full shadow-md translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[#2D2A26] hover:text-[#F9F8F4] z-10"
          aria-label="Add to cart"
        >
          <ShoppingBag size={20} />
        </button>
      </div>
      <div className="p-5 space-y-1 bg-[#F9F8F4]">
        <p className="text-xs text-[#786B59] uppercase tracking-wider">{product.category}</p>
        <h3 className="text-lg font-serif text-[#2D2A26] group-hover:text-black">
          {product.name}
        </h3>
        <p className="text-[#4A4036] font-medium">
          {product.sizes && product.sizes.length > 0 
            ? `From $${Math.min(...product.sizes.map(s => s.price)).toLocaleString()}`
            : `$${product.price.toLocaleString()}`
          }
        </p>
      </div>
    </Link>
  );
}
