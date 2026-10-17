'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { publicBusinessLocation, verifiedSocialUrl, verifiedSupportAddress } from '@/lib/public-business-details';

const support = verifiedSupportAddress(process.env.NEXT_PUBLIC_SUPPORT_EMAIL);
const location = publicBusinessLocation(process.env.NEXT_PUBLIC_BUSINESS_LOCATION);
const socials = [
 { label:'X',href:verifiedSocialUrl('x',process.env.NEXT_PUBLIC_SOCIAL_X_URL) },
 { label:'Pinterest',href:verifiedSocialUrl('pinterest',process.env.NEXT_PUBLIC_SOCIAL_PINTEREST_URL) },
 { label:'Tumblr',href:verifiedSocialUrl('tumblr',process.env.NEXT_PUBLIC_SOCIAL_TUMBLR_URL) },
].filter((item):item is {label:string;href:string}=>Boolean(item.href));

export function Footer() {
 return (
  <footer className="bg-[#F2EFE9] border-t border-[#D4CEC5]">
   <div className="editorial-container pt-20 md:pt-28 pb-9">
    <div className="grid lg:grid-cols-[1.3fr_1fr] gap-16 lg:gap-28 pb-24">
      <div><p className="editorial-eyebrow mb-7">TsuyaNoUchi / House of Lustre</p>
        <p className="editorial-serif text-[clamp(4rem,7vw,8rem)] max-w-3xl">The poetry of <em>everyday.</em></p>
      </div>
      <div className="grid sm:grid-cols-2 gap-10 lg:pt-12">
       <div><p className="editorial-eyebrow mb-7">Explore</p><div className="flex flex-col gap-4 text-sm text-[#4A4036]">
         <Link className="hover:underline" href="/">The House</Link><Link className="hover:underline" href="/shop">The Collection</Link>
         <Link className="hover:underline" href="/favourites">Saved Pieces</Link><Link className="hover:underline" href="/cart">Shopping Bag</Link>
       </div></div>
       <div><p className="editorial-eyebrow mb-7">Assistance</p><div className="flex flex-col gap-4 text-sm text-[#4A4036]">
         <Link className="hover:underline" href="/shipping">Shipping &amp; Delivery</Link><Link className="hover:underline" href="/faq">Questions &amp; Answers</Link>
         {support && <a className="hover:underline break-all" href={'mailto:'+support}>{support}</a>}
         {location && <span>{location}</span>}
       </div></div>
      </div>
    </div>
    {socials.length > 0 && <div className="flex gap-6 py-6 border-t border-[#D4CEC5]">{socials.map(item=><a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="editorial-link">{item.label}<ArrowUpRight size={13}/></a>)}</div>}
    <div className="border-t border-[#D4CEC5] pt-7 flex flex-col sm:flex-row justify-between gap-3 text-[10px] uppercase tracking-[.15em] text-[#786B59]">
      <span>© {new Date().getFullYear()} TsuyaNoUchi. All rights reserved.</span><span>Curated with intention</span>
    </div>
   </div>
  </footer>
 );
}
