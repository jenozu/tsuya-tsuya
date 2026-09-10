'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Menu, X, Heart } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useFavorites } from '@/lib/favorites-context';
import { CartDrawer } from './cart-drawer';

const APP_NAME = "Tsuyanouchi";

export function Navbar() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  
  const { getCartCount } = useCart();
  const { favorites } = useFavorites();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const cartCount = getCartCount();
  const favouriteCount = favorites.length;

  return (
    <>
      <nav className={`fixed w-full z-30 transition-all duration-500 ${isScrolled ? 'bg-[#F9F8F4]/90 backdrop-blur-md shadow-sm py-4 border-b border-[#E5E0D8]' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            
            {/* Mobile Menu Button */}
            <div className="flex items-center md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="text-[#2D2A26]"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            {/* Logo */}
            <div className="flex-1 flex justify-center md:justify-start">
              <Link href="/" className="text-2xl font-serif font-bold tracking-tight text-[#2D2A26]">
                {APP_NAME}
              </Link>
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex space-x-8 items-center">
              <Link 
                href="/" 
                className={`text-sm tracking-wide hover:text-[#786B59] transition-colors text-[#2D2A26] ${pathname === '/' ? 'font-semibold border-b border-[#2D2A26]' : ''}`}
              >
                HOME
              </Link>
              <Link 
                href="/shop" 
                className={`text-sm tracking-wide hover:text-[#786B59] transition-colors text-[#2D2A26] ${pathname?.startsWith('/shop') ? 'font-semibold border-b border-[#2D2A26]' : ''}`}
              >
                SHOP
              </Link>
            </div>

            {/* Icons */}
            <div className="flex items-center space-x-6 md:ml-8">
              <Link href="/favourites" className="relative text-[#2D2A26] hover:text-[#786B59] transition-colors">
                <Heart size={22} className={pathname === '/favourites' ? "fill-[#2D2A26]" : ""} />
                {favouriteCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#8C3F3F] text-[#F9F8F4] text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {favouriteCount}
                  </span>
                )}
              </Link>

              <button onClick={() => setIsCartOpen(true)} className="relative text-[#2D2A26] hover:text-[#786B59] transition-colors">
                <ShoppingBag size={22} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#2D2A26] text-[#F9F8F4] text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-[#F9F8F4] border-t border-[#E5E0D8] p-4 shadow-lg">
            <div className="flex flex-col space-y-4">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="text-left py-2 font-medium text-[#2D2A26]">Home</Link>
              <Link href="/shop" onClick={() => setIsMobileMenuOpen(false)} className="text-left py-2 font-medium text-[#2D2A26]">Shop</Link>
              <Link href="/favourites" onClick={() => setIsMobileMenuOpen(false)} className="text-left py-2 font-medium text-[#2D2A26]">Favourites</Link>
            </div>
          </div>
        )}
      </nav>

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />
    </>
  );
}
