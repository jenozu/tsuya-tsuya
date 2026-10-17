import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { privatePageMetadata } from '@/lib/private-page-metadata';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
export const metadata = privatePageMetadata;
export default function PrivateRouteLayout({children}:{children:ReactNode}) {
 if(process.env.VERCEL_ENV !== 'preview')return children;
 return <div className="min-h-screen bg-[#F9F8F4] flex flex-col"><Navbar/>
   <main id="main-content" className="flex-grow pt-24">
    <div className="editorial-container py-28 md:py-40">
     <p className="editorial-eyebrow mb-8">Isolated design preview</p>
     <h1 className="editorial-serif text-[clamp(4.5rem,9vw,10rem)] max-w-4xl">A beautiful beginning.<br/><em>Not an order.</em></h1>
     <p className="text-[#786B59] leading-[1.8] mt-10 max-w-xl">This visual prototype cannot accept payments or create orders. An authentic confirmation page will only appear after verified payment in the live storefront.</p>
     <Link href="/shop" className="editorial-link mt-10">Continue exploring <ArrowRight size={17}/></Link>
    </div>
   </main><Footer/></div>;
}