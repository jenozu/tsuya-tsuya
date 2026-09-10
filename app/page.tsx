import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product-card';
import { getProducts } from '@/lib/supabase-helpers';
import { NewsletterForm } from '@/components/newsletter-form';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const products = await getProducts();
  const featuredProducts = products.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F4]">
      <Navbar />
      
      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="relative h-[80vh] w-full bg-[#2D2A26] flex items-center justify-center overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&q=80&w=2692" 
            alt="Japanese Texture" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30 pointer-events-none" />
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-8">
            <p className="text-[#E5E0D8]/90 uppercase tracking-[0.3em] text-xs font-medium">Essential • Timeless • Crafted</p>
            <h1 className="text-5xl md:text-7xl font-serif text-[#F9F8F4] font-medium leading-tight tracking-tight drop-shadow-sm">
              The Art of Living
            </h1>
            <p className="text-[#D4CEC5] text-lg max-w-xl mx-auto font-light leading-relaxed">
              Discover a curated collection of objects that bring tranquility, heritage, and beauty to your everyday rituals.
            </p>
            <div className="pt-8">
              <Link href="/shop">
                <Button className="bg-[#F9F8F4] text-[#2D2A26] hover:bg-[#E5E0D8] border-none shadow-lg">
                  Explore Collection
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Philosophy Section */}
        <section className="py-24 bg-[#F9F8F4]">
          <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl font-serif text-[#2D2A26]">Simplicity is the ultimate sophistication</h2>
            <div className="w-16 h-px bg-[#786B59] mx-auto opacity-50"></div>
            <p className="text-[#4A4036] leading-relaxed">
              At Tsuyanouchi, we believe in the power of fewer, better things. Each item in our collection is selected for its craftsmanship, material integrity, and ability to age gracefully.
            </p>
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-20 bg-[#F2EFE9] border-t border-[#E5E0D8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-2xl font-serif text-[#2D2A26]">Featured Arrivals</h2>
                <p className="text-[#786B59] mt-2 italic font-serif">New additions to our catalogue.</p>
              </div>
              <Link href="/shop">
                <Button variant="outline">View All</Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                />
              ))}
            </div>
          </div>
        </section>
        
        {/* Newsletter */}
        <section className="py-24 bg-[#2D2A26] text-[#F9F8F4] relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/washi.png')] opacity-10"></div>
          <div className="max-w-xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-2xl font-serif mb-4">Join Our Inner Circle</h2>
            <p className="text-[#D4CEC5] mb-8">Receive early access to new collections and exclusive archival releases.</p>
            <NewsletterForm />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
