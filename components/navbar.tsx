'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Menu, ShoppingBag, X, ArrowUpRight } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useFavorites } from '@/lib/favorites-context';
import { CartDrawer } from './cart-drawer';

export function Navbar() {
  const pathname = usePathname();
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { getCartCount } = useCart();
  const { favorites } = useFavorites();
  useEffect(() => {
    const listener = () => setScrolled(window.scrollY > 28);
    listener();
    window.addEventListener('scroll',listener,{ passive:true });
    return () => window.removeEventListener('scroll',listener);
  },[]);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event:KeyboardEvent) => { if(event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown',close);
    return () => window.removeEventListener('keydown',close);
  },[menuOpen]);
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only fixed top-2 left-2 z-[90] bg-white p-3">Skip to content</a>
      <header className={'fixed inset-x-0 top-0 z-30 h-24 transition-all duration-500 border-b '+(scrolled || menuOpen ? 'bg-[#F9F8F4]/95 backdrop-blur-xl border-[#D4CEC5]' : 'bg-[#F9F8F4] border-[#E5E0D8]')}>
        <div className="editorial-container h-full grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-9">
            <Link href="/" aria-current={pathname === '/' ? 'page' : undefined} className="editorial-eyebrow text-[#2D2A26] hover:opacity-60 transition-opacity">The House</Link>
            <Link href="/shop" aria-current={pathname?.startsWith('/shop') ? 'page' : undefined} className="editorial-eyebrow text-[#2D2A26] hover:opacity-60 transition-opacity">Collection</Link>
          </nav>
          <button type="button" className="md:hidden justify-self-start p-2 -ml-2" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="tsuya-mobile-navigation">{menuOpen ? <X size={23} strokeWidth={1.3}/> : <Menu size={23} strokeWidth={1.3}/>}</button>
          <Link href="/" aria-label="TsuyaNoUchi homepage" className="text-center leading-none whitespace-nowrap">
            <span className="block text-[clamp(1.55rem,2.5vw,2.4rem)] font-serif tracking-[-.045em] font-medium">TsuyaNoUchi</span>
            <span className="block mt-1.5 text-[8px] tracking-[.4em] uppercase text-[#786B59]">House of Lustre</span>
          </Link>
          <div className="flex items-center justify-end gap-3 sm:gap-6">
            <Link href="/favourites" className="hidden sm:flex relative p-2 hover:opacity-60 transition-opacity" aria-label={'Favourites, '+favorites.length+' saved'}>
              <Heart size={20} strokeWidth={1.3} fill={pathname === '/favourites' ? 'currentColor' : 'none'}/>
              {favorites.length > 0 && <span className="absolute -right-1 -top-1 text-[9px]">{favorites.length}</span>}
            </Link>
            <button type="button" onClick={() => setCartOpen(true)} className="relative p-2 flex items-center gap-2 hover:opacity-60 transition-opacity" aria-label={'Open shopping bag with '+getCartCount()+' items'}>
              <ShoppingBag size={20} strokeWidth={1.3}/><span className="hidden lg:inline editorial-eyebrow text-[#2D2A26]">Bag ({getCartCount()})</span>
              {getCartCount() > 0 && <span className="lg:hidden absolute -top-1 -right-1 rounded-full bg-[#2D2A26] text-white text-[9px] w-4 h-4 grid place-items-center">{getCartCount()}</span>}
            </button>
          </div>
        </div>
        <nav id="tsuya-mobile-navigation" aria-label="Mobile navigation" aria-hidden={!menuOpen} className={'md:hidden absolute left-0 right-0 top-full bg-[#F9F8F4] border-b border-[#D4CEC5] px-7 overflow-hidden transition-[max-height,opacity,padding] duration-500 '+(menuOpen?'max-h-[390px] opacity-100 py-9':'max-h-0 opacity-0 py-0 pointer-events-none')}>
          <Link onClick={()=>setMenuOpen(false)} href="/" tabIndex={menuOpen?0:-1} className="font-serif text-5xl block mb-5">The House</Link>
          <Link onClick={()=>setMenuOpen(false)} href="/shop" tabIndex={menuOpen?0:-1} className="font-serif text-5xl block mb-5">Collection</Link>
          <Link onClick={()=>setMenuOpen(false)} href="/favourites" tabIndex={menuOpen?0:-1} className="font-serif text-5xl block mb-9">Favourites</Link>
          <Link onClick={()=>setMenuOpen(false)} href="/shipping" tabIndex={menuOpen?0:-1} className="editorial-link">Shipping information <ArrowUpRight size={15}/></Link>
        </nav>
      </header>
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
