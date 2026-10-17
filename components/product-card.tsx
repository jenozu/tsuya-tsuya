'use client';
import Link from 'next/link';
import { Heart, ArrowUpRight } from 'lucide-react';
import { Product, getImageUrls } from '@/lib/types';
import { SafeProductImage } from '@/components/safe-product-image';
import { purchasableSizes, productIsPurchasable } from '@/lib/product-availability';
import { useFavorites } from '@/lib/favorites-context';

export function ProductCard({ product }: { product:Product }) {
 const { toggleFavorite, isFavorite } = useFavorites();
 const favourite = isFavorite(product.id);
 const image = getImageUrls(product)[0] || product.image_url;
 const priced = purchasableSizes(product);
 const prices = priced.length ? priced.map(size => size.price) : [product.price];
 const min = Math.min(...prices), max=Math.max(...prices);
 const money=(n:number)=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
 return (
  <article className="editorial-product group">
   <div className="editorial-photo bg-[#DFD8CE]">
    <Link href={'/shop/'+product.id} aria-label={'View '+product.name} className="block absolute inset-0 z-[1]">
      <SafeProductImage src={image} alt={product.name} fill sizes="(min-width:1024px) 40vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
    </Link>
    <div className="absolute top-4 left-4 z-[2] pointer-events-none text-[9px] uppercase tracking-[.19em] bg-[#F9F8F4]/90 px-3 py-2">{product.product_type==='2-piece'?'Diptych':product.product_type==='3-piece'?'Triptych':'Art print'}</div>
    <button type="button" onClick={() => toggleFavorite(product.id)} aria-label={favourite ? 'Remove '+product.name+' from favourites' : 'Save '+product.name+' to favourites'} aria-pressed={favourite} className="absolute z-[2] right-4 top-4 bg-[#F9F8F4]/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-all">
      <Heart size={17} strokeWidth={1.4} fill={favourite?'currentColor':'none'}/>
    </button>
    {!productIsPurchasable(product)&&<span className="absolute bottom-4 left-4 z-[2] pointer-events-none bg-[#2D2A26] text-[#F9F8F4] px-3 py-2 text-[10px] uppercase tracking-widest">Unavailable</span>}
    <div className="absolute z-[2] right-4 bottom-4 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none bg-[#F9F8F4] p-3 rounded-full"><ArrowUpRight size={19}/></div>
   </div>
   <div className="flex justify-between items-start gap-3 pt-5">
    <div className="min-w-0"><p className="editorial-eyebrow mb-2">{product.category}</p>
      <Link href={'/shop/'+product.id} className="block"><h3 className="font-serif text-[clamp(1.4rem,2vw,2.1rem)] font-normal leading-[1.05] group-hover:italic transition-all">{product.name}</h3></Link>
    </div>
    <p className="text-xs whitespace-nowrap text-[#786B59] pt-1">USD {money(min)}{max!==min?' +':''}</p>
   </div>
  </article>
 );
}
