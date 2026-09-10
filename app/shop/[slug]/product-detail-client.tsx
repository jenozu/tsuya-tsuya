'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product, ProductSize, getImageUrls } from '@/lib/supabase-helpers';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ShoppingBag, Truck, ShieldCheck, Heart, ChevronDown, RotateCcw } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useFavorites } from '@/lib/favorites-context';

interface ProductDetailClientProps {
  product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  
  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(
    product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const imageUrls = getImageUrls(product);
  const primaryImage = imageUrls[0] || product.image_url;

  const isProductFavorite = isFavorite(product.id);

  // Reset selected size when product changes
  useEffect(() => {
    if (product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0]);
    } else {
      setSelectedSize(undefined);
    }
  }, [product]);

  const currentPrice = selectedSize ? selectedSize.price : product.price;

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: primaryImage,
      selectedSize: selectedSize
    });
  };

  return (
    <div className="min-h-screen bg-[#F9F8F4] animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link 
          href="/shop"
          className="flex items-center text-sm text-[#786B59] hover:text-[#2D2A26] transition-colors mb-8 group inline-flex"
        >
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Shop
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
          {/* Image Section */}
          <div className="space-y-3">
            <div className="relative aspect-[3/4] bg-[#F2EFE9] overflow-hidden shadow-sm border border-[#E5E0D8]">
              <Image
                src={imageUrls[selectedImageIndex] || primaryImage}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
                className="object-cover mix-blend-multiply opacity-95"
              />
            </div>
            {imageUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {imageUrls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImageIndex(i)}
                    className={`flex-shrink-0 w-16 h-16 border-2 overflow-hidden transition-colors ${
                      selectedImageIndex === i ? 'border-[#2D2A26]' : 'border-[#E5E0D8] hover:border-[#786B59]'
                    }`}
                  >
                    <Image
                      src={url}
                      alt={`${product.name} ${i + 1}`}
                      fill
                      sizes="64px"
                      loading="lazy"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="flex flex-col space-y-8">
            <div className="space-y-4 border-b border-[#E5E0D8] pb-6">
              <span className="text-sm font-medium text-[#786B59] uppercase tracking-wider">{product.category}</span>
              <h1 className="text-4xl md:text-5xl font-serif text-[#2D2A26] leading-tight">{product.name}</h1>
              <p className="text-2xl font-medium text-[#4A4036]">${currentPrice.toLocaleString()}</p>
            </div>

            <div className="prose prose-stone max-w-none text-[#4A4036] leading-relaxed text-lg font-light [&_strong]:font-semibold [&_em]:italic">
              <ReactMarkdown>{product.description || ''}</ReactMarkdown>
            </div>

            {/* Size Selector (positioned directly above Add to Cart) */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-[#2D2A26] uppercase tracking-wide">Select Size</label>
                <div className="relative">
                  <select 
                    value={selectedSize?.label}
                    onChange={(e) => {
                      const size = product.sizes?.find(s => s.label === e.target.value);
                      setSelectedSize(size);
                    }}
                    className="w-full appearance-none bg-white border border-[#E5E0D8] px-4 py-3 pr-8 rounded-none text-[#2D2A26] focus:outline-none focus:border-[#2D2A26] cursor-pointer"
                  >
                    {product.sizes.map((size) => (
                      <option key={size.label} value={size.label}>
                        {size.label} - ${size.price.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 text-[#786B59] pointer-events-none" size={16} />
                </div>
              </div>
            )}

            <div className="pt-6 flex gap-4">
              <Button 
                onClick={handleAddToCart} 
                className="flex-1 md:flex-none md:min-w-[200px] flex items-center justify-center gap-2"
              >
                <ShoppingBag size={20} />
                Add to Cart
              </Button>
              
              <button 
                onClick={() => toggleFavorite(product.id)}
                className={`p-4 border transition-colors ${
                  isProductFavorite 
                    ? 'border-red-200 bg-red-50 text-[#8C3F3F]' 
                    : 'border-[#E5E0D8] hover:border-[#2D2A26] text-[#2D2A26]'
                }`}
              >
                <Heart size={20} className={isProductFavorite ? "fill-current" : ""} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <div className="flex items-start gap-3">
                <Truck className="text-[#786B59] mt-1" size={20} />
                <div>
                  <h4 className="text-sm font-medium text-[#2D2A26]">Free Shipping</h4>
                  <p className="text-xs text-[#786B59] mt-1">On all orders over $500</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RotateCcw className="text-[#786B59] mt-1" size={20} />
                <div>
                  <h4 className="text-sm font-medium text-[#2D2A26]">Easy Returns</h4>
                  <p className="text-xs text-[#786B59] mt-1">Hassle-free returns within 30 days</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="text-[#786B59] mt-1" size={20} />
                <div>
                  <h4 className="text-sm font-medium text-[#2D2A26]">Secure Checkout</h4>
                  <p className="text-xs text-[#786B59] mt-1">Encrypted payments & protected data</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#F2EFE9] p-6 border border-[#E5E0D8] mt-8">
              <p className="text-xs text-[#786B59] uppercase tracking-wide mb-2 font-semibold">Stock Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-[#5C7C66]' : 'bg-[#8C3F3F]'}`}></div>
                <span className="text-sm text-[#2D2A26]">
                  {product.stock > 10 ? 'In Stock & Ready to Ship' : product.stock > 0 ? `Only ${product.stock} left` : 'Out of Stock'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
