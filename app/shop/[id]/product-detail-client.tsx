'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ArrowRight, Heart, Maximize2, ShoppingBag, X, ChevronLeft, ChevronRight, Truck, Clock3, LockKeyhole } from 'lucide-react';
import { SafeProductImage } from '@/components/safe-product-image';
import { Product, ProductSize, getImageUrls } from '@/lib/types';
import { purchasableSizes, productIsPurchasable } from '@/lib/product-availability';
import { useCart } from '@/lib/cart-context';
import { useFavorites } from '@/lib/favorites-context';

function dimensionsFromLabel(label:string):{width:number;height:number}|null {
 const match=label.match(/(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)/i);
 if(!match)return null;
 const width=Number(match[1]),height=Number(match[2]);
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
 return {width,height};
}
const money=(n:number)=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

function PrintSizeVisualizer({size,image,name}:{size:ProductSize|undefined;image:string;name:string}) {
 const dimensions=useMemo(()=>size?dimensionsFromLabel(size.label):null,[size]);
 const scale=dimensions?Math.min(65,100*dimensions.width/96):0;
 return (
  <div className="border-t border-[#D4CEC5] pt-9 mt-10">
   <div className="flex justify-between gap-4 items-baseline mb-5"><h3 className="font-serif text-3xl">See it in your space</h3><span className="editorial-eyebrow">Proportion study</span></div>
   {dimensions?(
    <>
     <div className="bg-[#E5DED3] relative overflow-hidden w-full aspect-[1.65] border border-[#D4CEC5]" role="img" aria-label={'Illustrative room showing '+name+' at '+size?.label+' relative to a 96 inch wall'}>
       <div className="absolute inset-0 bg-[linear-gradient(90deg,#E6DED1_0%,#F0E9DF_49%,#E3D9CB_100%)]"></div>
       <div className="absolute left-[10%] right-[10%] bottom-[18%] h-px bg-[#A89C8D]/50"></div>
       <div className="absolute left-[7%] right-[7%] bottom-[0%] h-[18%] bg-[#C7BBAE]/40"></div>
       <div className="absolute left-[20%] right-[20%] bottom-[7%] h-[19%] rounded-t-[48%] bg-[#B4A392] shadow-[0_10px_35px_#71625330]"></div>
       <div className="absolute left-[18%] bottom-[8%] w-[10%] h-[14%] rounded-t-[40%] bg-[#A49281]"></div>
       <div className="absolute right-[18%] bottom-[8%] w-[10%] h-[14%] rounded-t-[40%] bg-[#A49281]"></div>
       <div className="absolute left-1/2 top-[10%] -translate-x-1/2 border-[5px] border-[#66584A] bg-[#F9F8F4] shadow-[7px_13px_18px_#64534455] transition-[width,aspect-ratio] duration-700 ease-out" style={{width:scale+'%',aspectRatio:dimensions.width+' / '+dimensions.height}}>
         <SafeProductImage src={image} alt={'Art illustration: '+name} fill sizes="300px" className="object-contain" />
       </div>
     </div>
     <div className="mt-4 flex justify-between gap-5 text-[11px] text-[#786B59]"><span>Print: {size?.label}</span><span>Illustrative wall width: 96 in (244 cm)</span></div>
     <p className="text-xs leading-[1.8] text-[#786B59] mt-3">Approximate relative scale only; room and furniture are illustrative. Framing is not included unless stated in the product description.</p>
    </>
   ): <p className="text-sm leading-relaxed text-[#786B59]">Select a size with dimensions to see an illustrative wall preview. Exact measurements depend on the print format.</p>}
  </div>
 );
}
export function ProductDetailClient({product}:{product:Product}) {
 const {addToCart}=useCart();
 const {toggleFavorite,isFavorite}=useFavorites();
 const availableSizes=purchasableSizes(product);
 const [selectedSize,setSelectedSize]=useState<ProductSize|undefined>(availableSizes[0]);
 const [selectedImage,setSelectedImage]=useState(0);
 const [lightbox,setLightbox]=useState(false);
 const [justAdded,setJustAdded]=useState(false);
 const urls=getImageUrls(product);
 const images=urls.length?urls:[product.image_url];
 const primary=images[0];
 const current=images[Math.min(selectedImage,images.length-1)]||primary;
 const purchasable=productIsPurchasable(product) && (availableSizes.length===0||!!selectedSize);
 const favourite=isFavorite(product.id);
 const price=selectedSize?.price??product.price;
 useEffect(()=>{
  setSelectedSize(purchasableSizes(product)[0]);
  setSelectedImage(0);
 },[product]);
 useEffect(()=>{
  if(!lightbox)return;
  const handle=(event:KeyboardEvent)=>{
   if(event.key==='Escape')setLightbox(false);
   if(event.key==='ArrowRight')setSelectedImage(i=>(i+1)%images.length);
   if(event.key==='ArrowLeft')setSelectedImage(i=>(i+images.length-1)%images.length);
  };
  window.addEventListener('keydown',handle);
  return ()=>window.removeEventListener('keydown',handle);
 },[lightbox,images.length]);
 function add() {
  if(!purchasable)return;
  addToCart({id:product.id,name:product.name,price:product.price,imageUrl:primary,selectedSize});
  setJustAdded(true);
 }
 return (
  <div className="min-h-screen bg-[#F9F8F4]">
   <div className="editorial-container pt-8 pb-16 md:pb-32">
    <div className="flex items-center justify-between border-b border-[#D4CEC5] pb-7 mb-9">
      <Link href="/shop" className="editorial-link"><ArrowLeft size={16}/> Back to collection</Link>
      <span className="editorial-eyebrow hidden sm:block">The House / Artwork</span>
    </div>
    <div className="grid lg:grid-cols-[minmax(0,1.13fr)_minmax(0,.87fr)] gap-12 lg:gap-[7vw] items-start">
     <section aria-label="Artwork gallery" className="min-w-0">
       <button type="button" className="relative w-full block editorial-photo gallery-zoom aspect-[.83] group" onClick={()=>setLightbox(true)} aria-label={'Enlarge image of '+product.name}>
        <SafeProductImage key={current} src={current} alt={product.name} fill priority sizes="(min-width:1024px) 55vw, 100vw" className="object-contain p-5 md:p-10" />
        <span className="absolute bottom-6 right-6 z-[2] bg-[#F9F8F4] px-4 py-3 flex gap-3 items-center text-[10px] uppercase tracking-widest group-hover:bg-white transition-colors"><Maximize2 size={15}/> View larger</span>
       </button>
       <div className="flex items-center gap-3 mt-4">
         {images.length>1? images.map((src,i)=>(
          <button key={i} type="button" onClick={()=>setSelectedImage(i)} aria-label={'View image '+(i+1)+' of '+images.length} aria-pressed={i===selectedImage} className={'relative w-[74px] h-[90px] border-2 transition-colors bg-[#E5E0D8] '+(i===selectedImage?'border-[#2D2A26]':'border-transparent hover:border-[#786B59]')}>
           <SafeProductImage src={src} alt="" fill sizes="75px" className="object-contain" />
          </button>
         )):<span className="editorial-eyebrow mt-2">Artwork / 01</span>}
         {images.length>1&&<span className="editorial-eyebrow ml-auto">{String(selectedImage+1).padStart(2,'0')} / {String(images.length).padStart(2,'0')}</span>}
       </div>
       <PrintSizeVisualizer size={selectedSize} image={primary} name={product.name}/>
     </section>
     <div className="lg:sticky lg:top-32 pt-3">
       <p className="editorial-eyebrow mb-7">{product.category} / TsuyaNoUchi</p>
       <h1 className="editorial-serif text-[clamp(4.2rem,6vw,7.8rem)] mb-7">{product.name}</h1>
       <div className="flex justify-between items-center border-y border-[#D4CEC5] py-5 mb-8">
        <span className="text-sm text-[#786B59]">Selected artwork</span><span className="text-xl text-[#2D2A26] font-serif">{money(price)} <small className="text-[10px] font-sans tracking-widest uppercase">USD</small></span>
       </div>
       <div className="text-[#61584D] leading-[1.85] text-sm [&_p]:mb-4 [&_strong]:font-semibold max-w-lg mb-10">
        <ReactMarkdown>{product.description||''}</ReactMarkdown>
       </div>
       {availableSizes.length>0&&<fieldset className="mb-8">
        <legend className="editorial-eyebrow mb-4 text-[#2D2A26]">Choose print size</legend>
        <div className="flex flex-wrap gap-2">
          {availableSizes.map(s=><button type="button" key={s.label} aria-pressed={selectedSize?.label===s.label} onClick={()=>{setSelectedSize(s);setJustAdded(false);}} className="tsuya-pill px-5 py-4 min-w-[112px] text-left">
            <span className="block text-sm mb-2">{s.label}</span><span className="block text-xs opacity-70">{money(s.price)}</span>
          </button>)}
        </div>
        <label className="block mt-4 text-xs text-[#786B59]">Select from available options
          <select className="tsuya-styled-input w-full mt-1 text-sm" value={selectedSize?.label||''} onChange={e=>{setSelectedSize(availableSizes.find(s=>s.label===e.target.value));setJustAdded(false);}}>
            {availableSizes.map(s=><option key={s.label} value={s.label}>{s.label} — {money(s.price)}</option>)}
          </select>
        </label>
       </fieldset>}
       <div className="flex gap-3">
         <button type="button" disabled={!purchasable} onClick={add} className="tsuya-button flex-1"><ShoppingBag size={18} strokeWidth={1.5}/>{!purchasable?'Unavailable':justAdded?'Add another':'Add to bag'} <ArrowRight size={16}/></button>
         <button type="button" aria-label={favourite?'Remove from favourites':'Save to favourites'} aria-pressed={favourite} onClick={()=>toggleFavorite(product.id)} className="border border-[#D4CEC5] w-16 grid place-items-center hover:bg-[#E5E0D8] transition-colors"><Heart size={20} strokeWidth={1.3} fill={favourite?'currentColor':'none'}/></button>
       </div>
       {justAdded&&<p role="status" className="mt-3 text-sm text-[#5C7C66]">Added to your bag. <Link href="/cart" className="underline">View bag</Link></p>}
       <div className="border-t border-[#D4CEC5] mt-12 pt-8 space-y-6">
         <div className="flex gap-4 items-start"><Clock3 size={20} strokeWidth={1.3} className="text-[#786B59]"/><div><p className="font-serif text-xl">Made to order</p><p className="text-xs leading-relaxed text-[#786B59] mt-1">Allow 2–5 business days to produce your print before shipping.</p></div></div>
         <div className="flex gap-4 items-start"><Truck size={20} strokeWidth={1.3} className="text-[#786B59]"/><div><p className="font-serif text-xl">Shipping &amp; delivery</p><p className="text-xs leading-relaxed text-[#786B59] mt-1">Free on US orders. Other supported destinations calculated at checkout. <Link className="underline" href="/shipping">Details</Link></p></div></div>
         <div className="flex gap-4 items-start"><LockKeyhole size={20} strokeWidth={1.3} className="text-[#786B59]"/><div><p className="font-serif text-xl">Secure checkout</p><p className="text-xs leading-relaxed text-[#786B59] mt-1">Final availability, pricing, shipping and taxes are checked during checkout.</p></div></div>
       </div>
     </div>
    </div>
   </div>
   {lightbox&&<div className="fixed inset-0 z-[80] bg-[#211F1C]/95 flex flex-col" role="dialog" aria-modal="true" aria-label={'Enlarged artwork gallery: '+product.name}>
     <div className="flex items-center justify-between p-5 md:px-12 text-[#F9F8F4]"><span className="editorial-eyebrow text-[#F9F8F4]">{product.name} / {selectedImage+1} of {images.length}</span><button autoFocus onClick={()=>setLightbox(false)} aria-label="Close enlarged image" className="p-3 hover:bg-white/10"><X size={25}/></button></div>
     <div className="relative flex-1 mx-8 md:mx-24 mb-16 min-h-0">
       <SafeProductImage src={current} alt={product.name} fill sizes="100vw" className="object-contain"/>
     </div>
     {images.length>1&&<div className="absolute inset-x-5 md:inset-x-10 top-1/2 flex justify-between pointer-events-none">
       <button className="p-4 text-white bg-black/30 pointer-events-auto" onClick={()=>setSelectedImage(i=>(i+images.length-1)%images.length)} aria-label="Previous image"><ChevronLeft/></button>
       <button className="p-4 text-white bg-black/30 pointer-events-auto" onClick={()=>setSelectedImage(i=>(i+1)%images.length)} aria-label="Next image"><ChevronRight/></button>
     </div>}
   </div>}
  </div>
 );
}
