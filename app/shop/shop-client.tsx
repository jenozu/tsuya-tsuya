'use client';
import { useMemo, useState } from 'react';
import { Search, ArrowUpRight, X } from 'lucide-react';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product-card';

type SortOption = 'none' | 'best-seller' | 'price-low-high' | 'price-high-low' | 'newest' | 'alpha-a-z' | 'alpha-z-a';
type PieceFilter = 'all' | '1-piece' | '2-piece' | '3-piece';

export function ShopClient({products}:{products:Product[]}) {
 const [searchTerm,setSearchTerm]=useState('');
 const [sortBy,setSortBy]=useState<SortOption>('none');
 const [pieceFilter,setPieceFilter]=useState<PieceFilter>('all');
 const pieces:{value:PieceFilter;label:string}[]=[
  {value:'all',label:'All works'},{value:'1-piece',label:'Individual prints'},
  {value:'2-piece',label:'Two-piece sets'},{value:'3-piece',label:'Three-piece sets'}
 ];
 const sorts:{value:SortOption;label:string}[]=[
  {value:'none',label:'Featured'},{value:'newest',label:'New arrivals'},
  {value:'best-seller',label:'Best sellers'},{value:'price-low-high',label:'Price: low to high'},
  {value:'price-high-low',label:'Price: high to low'},{value:'alpha-a-z',label:'Title: A–Z'},
  {value:'alpha-z-a',label:'Title: Z–A'}
 ];
 const items=useMemo(()=>{
  return products.filter(product=>{
   const name=product.name.toLowerCase(),type=(product.product_type||'').toLowerCase();
   const match=pieceFilter==='all'||type===pieceFilter||
    (pieceFilter==='1-piece'&&(name.includes('1-piece')||name.includes('1 piece')))||
    (pieceFilter==='2-piece'&&(name.includes('2-piece')||name.includes('2 piece')))||
    (pieceFilter==='3-piece'&&(name.includes('3-piece')||name.includes('3 piece')));
   return match&&(name.includes(searchTerm.trim().toLowerCase())||product.category.toLowerCase().includes(searchTerm.trim().toLowerCase()));
  }).sort((a,b)=>{
   if(sortBy==='price-low-high')return a.price-b.price;
   if(sortBy==='price-high-low')return b.price-a.price;
   if(sortBy==='newest'||sortBy==='best-seller')return (b.created_at||'').localeCompare(a.created_at||'');
   if(sortBy==='alpha-a-z')return a.name.localeCompare(b.name);
   if(sortBy==='alpha-z-a')return b.name.localeCompare(a.name);
   return 0;
  });
 },[products,searchTerm,sortBy,pieceFilter]);
 return (
  <div className="min-h-screen bg-[#F9F8F4]">
   <header className="bg-[#EAE5DE] pt-24 pb-24 md:pt-32 md:pb-36 relative overflow-hidden">
     <div className="absolute inset-0 tsuya-noise pointer-events-none"/>
     <div className="editorial-container relative">
       <div className="flex justify-between items-start"><span className="editorial-eyebrow">The House / Gallery</span><span className="editorial-eyebrow hidden sm:block">An evolving collection / 2026</span></div>
       <h1 className="editorial-serif text-[clamp(5.5rem,12vw,14rem)] mt-14 editorial-enter">The <em>collection.</em></h1>
       <div className="flex flex-col md:flex-row md:items-end justify-between mt-12 gap-8">
         <p className="text-[#665C51] leading-[1.8] max-w-md">Artworks for rooms with a point of view. Explore individual prints and carefully considered sets.</p>
         <a href="#browse" className="editorial-link">Browse artworks <ArrowUpRight size={16}/></a>
       </div>
     </div>
   </header>
   <div className="editorial-container pt-12 md:pt-20 pb-28" id="browse">
     <div className="flex flex-col xl:flex-row xl:justify-between gap-8 xl:items-end border-b border-[#D4CEC5] pb-8">
       <div><p className="editorial-eyebrow mb-5">Filter by format</p>
         <div className="flex flex-wrap gap-2" role="group" aria-label="Product format">
          {pieces.map(p=><button key={p.value} type="button" onClick={()=>setPieceFilter(p.value)} aria-pressed={pieceFilter===p.value} className="tsuya-pill px-4 py-2.5 text-xs">{p.label}</button>)}
         </div>
       </div>
       <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
         <label className="relative block"><span className="sr-only">Search the collection</span><Search size={17} className="absolute left-0 top-3.5 text-[#786B59]"/>
           <input className="tsuya-styled-input pl-7 min-w-0 w-full sm:w-52 text-sm" placeholder="Search artworks" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
           {searchTerm&&<button type="button" onClick={()=>setSearchTerm('')} aria-label="Clear search" className="absolute right-0 top-3"><X size={16}/></button>}
         </label>
         <label className="block text-xs"><span className="sr-only">Sort products</span><select aria-label="Sort artworks" className="tsuya-styled-input w-full sm:min-w-44 text-sm" value={sortBy} onChange={e=>setSortBy(e.target.value as SortOption)}>{sorts.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
       </div>
     </div>
     <div className="flex justify-between items-center mt-6 mb-12"><span className="editorial-eyebrow">{items.length} {items.length===1?'work':'works'}</span><span className="text-xs text-[#786B59]">A considered selection</span></div>
     {items.length?
       <div className="editorial-grid">{items.map(p=><ProductCard key={p.id} product={p}/>)}</div>:
       <div className="text-center py-28 border-y border-[#D4CEC5]" role="status"><h2 className="font-serif text-5xl mb-4">Nothing in this edit.</h2><p className="text-[#786B59]">Try another title or format.</p><button className="editorial-link mt-8" onClick={()=>{setSearchTerm('');setPieceFilter('all');setSortBy('none');}}>Clear all filters <ArrowUpRight size={15}/></button></div>}
   </div>
  </div>
 );
}
