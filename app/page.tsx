import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDownRight, ArrowRight, MoveDown } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ProductCard } from '@/components/product-card';
import { SafeProductImage } from '@/components/safe-product-image';
import { NewsletterForm } from '@/components/newsletter-form';
import { getProducts } from '@/lib/data';
import { getImageUrls } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const products = await getProducts();
  const hero = products[0];
  const second = products[1] || hero;
  const heroImage = hero ? getImageUrls(hero)[0] || hero.image_url : undefined;
  const secondImage = second ? getImageUrls(second)[0] || second.image_url : undefined;
  return (
    <div className="min-h-screen bg-[#F9F8F4]">
      <Navbar />
      <main id="main-content" className="pt-24">
        <section className="relative min-h-[690px] lg:min-h-[calc(100svh-6rem)] bg-[#F2EFE9] overflow-hidden">
          <div className="absolute inset-0 tsuya-noise" aria-hidden="true" />
          <div className="editorial-container relative min-h-[690px] lg:min-h-[calc(100svh-6rem)] grid lg:grid-cols-[1fr_0.92fr] gap-12 lg:gap-8 items-center py-16 lg:py-12">
            <div className="relative z-10 max-w-[740px] editorial-enter">
              <div className="flex items-center gap-4 mb-9">
                <span className="h-px w-12 bg-[#786B59]" /><p className="editorial-eyebrow">TsuyaNoUchi / House of Lustre</p>
              </div>
              <h1 className="editorial-serif text-[clamp(5rem,9.2vw,11rem)] text-[#2D2A26]">
                The art <span className="italic text-[#786B59]">of</span><br />
                living <span className="italic">well.</span>
              </h1>
              <p className="text-[#665C51] mt-10 max-w-[390px] text-base leading-[1.8]">Art for the spaces we inhabit. A considered collection of prints to make everyday life feel a little more beautiful.</p>
              <Link href="/shop" className="editorial-link mt-12">Discover the collection <ArrowRight size={16} aria-hidden="true" /></Link>
              <div className="hidden lg:flex items-center gap-3 mt-20 text-[10px] uppercase tracking-[.21em] text-[#786B59]"><MoveDown size={15} /> Scroll to explore</div>
            </div>
            <div className="relative w-full h-[430px] sm:h-[620px] lg:h-[min(75vh,840px)] hero-art">
              <div className="absolute top-0 right-0 w-[82%] h-[85%] bg-[#D9D2C8] editorial-photo">
                {heroImage ? <SafeProductImage src={heroImage} alt={hero?.name || 'Art print'} fill priority sizes="(min-width: 1024px) 42vw, 80vw" className="object-cover" /> :
                <div className="w-full h-full bg-[linear-gradient(130deg,#b9b0a4,#e7ded0_45%,#a99a88)]" />}
              </div>
              <div className="absolute bottom-[2%] left-0 w-[43%] h-[43%] border-[9px] border-[#F2EFE9] bg-[#C6B9A8] shadow-xl editorial-photo">
                {secondImage ? <SafeProductImage src={secondImage} alt={second?.name || 'Art print'} fill sizes="(min-width: 1024px) 20vw, 45vw" className="object-cover" /> : null}
              </div>
              <div className="absolute top-[6%] left-0 text-[10px] tracking-[.26em] uppercase text-[#786B59] [writing-mode:vertical-rl] rotate-180">Objects &amp; spaces / 2026</div>
              <div className="absolute bottom-[4%] right-0 bg-[#F9F8F4] px-6 py-4 flex items-center gap-8 shadow-sm">
                <span className="text-[10px] tracking-[.2em] uppercase text-[#786B59]">Collection / 01</span><ArrowDownRight size={18} strokeWidth={1} />
              </div>
            </div>
          </div>
        </section>

        <section className="editorial-container py-10 flex items-center justify-between gap-6 border-b border-[#D4CEC5]">
          <span className="editorial-eyebrow">The house philosophy</span>
          <span className="text-[#786B59] text-[11px] tracking-[.16em] uppercase hidden sm:inline">Beauty in the everyday</span>
          <span className="text-[#786B59] font-serif italic text-2xl">01 — 04</span>
        </section>

        <section id="philosophy" className="editorial-container py-28 md:py-44 grid lg:grid-cols-12 gap-14 lg:gap-10 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-40">
            <p className="editorial-eyebrow mb-8">01 / An invitation to slow down</p>
            <p className="text-[#786B59] max-w-sm leading-[1.9]">We believe the things we choose to live with can change how a room feels, and how we feel within it.</p>
            <Link href="/shop" className="editorial-link mt-10">Explore our artwork <ArrowRight size={15}/></Link>
          </div>
          <div className="lg:col-span-8">
            <h2 className="editorial-serif text-[clamp(4.5rem,8vw,9.5rem)]">A little more <span className="italic text-[#786B59]">space</span> for beautiful things.</h2>
            <div className="mt-16 ml-auto max-w-xl grid grid-cols-[1fr_2fr] gap-8 items-start border-t border-[#D4CEC5] pt-7">
              <span className="editorial-eyebrow">Our point of view</span>
              <p className="leading-[1.9] text-[#665C51]">Quiet forms. Thoughtful details. An evolving selection of art prints chosen to bring intention, warmth and a sense of presence to the spaces we call our own.</p>
            </div>
          </div>
        </section>

        <section className="bg-[#EAE5DE] py-24 md:py-36">
          <div className="editorial-container">
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-10 mb-16">
              <div><p className="editorial-eyebrow mb-6">02 / Considered artworks</p><h2 className="editorial-serif text-[clamp(4.5rem,8vw,9rem)]">The <span className="italic">selection.</span></h2></div>
              <Link href="/shop" className="editorial-link self-start sm:mb-3">Shop all works <ArrowRight size={16}/></Link>
            </div>
            {products.length ? (
              <div className="editorial-grid">
                {products.slice(0,4).map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            ) : (
              <div className="border-y border-[#C9C0B6] py-28 text-center">
                <p className="editorial-eyebrow mb-5">Collection in progress</p>
                <p className="font-serif text-5xl">An evolving edit of art.</p>
              </div>
            )}
            <div className="flex justify-between items-center mt-14 pt-6 border-t border-[#C9C0B6]">
              <span className="editorial-eyebrow">Art to live with</span>
              <Link href="/shop" className="editorial-link">View the full collection <ArrowRight size={16}/></Link>
            </div>
          </div>
        </section>

        <section className="py-32 md:py-48 editorial-container">
          <p className="editorial-eyebrow mb-12">03 / The house perspective</p>
          <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-16 items-end">
            <h2 className="editorial-serif text-[clamp(4.5rem,9vw,11rem)]">Make room<br/>for <em>meaning.</em></h2>
            <div className="max-w-xs lg:pb-3"><div className="w-20 h-px bg-[#786B59] mb-8"></div>
              <p className="leading-[1.95] text-[#665C51]">Not more for the sake of more. Just a few things that make the everyday feel exceptional.</p>
              <Link href="/shop" className="editorial-link mt-9">Find your next piece <ArrowRight size={16}/></Link></div>
          </div>
        </section>

        <section className="tsuya-dark relative overflow-hidden py-28 md:py-40">
          <div className="absolute inset-0 tsuya-noise" aria-hidden="true"></div>
          <div className="editorial-container relative grid lg:grid-cols-2 gap-16 items-end">
            <div><p className="editorial-eyebrow mb-10">04 / Notes from the house</p>
              <h2 className="editorial-serif text-[clamp(4.5rem,8vw,9rem)]">A quieter<br/><span className="italic text-[#D4CEC5]">kind of</span> beautiful.</h2></div>
            <div className="lg:pl-14 pb-2">
              <p className="leading-[1.9] text-[#D4CEC5] max-w-md mb-10">Join our mailing list for new collections and thoughtful notes from TsuyaNoUchi.</p>
              <NewsletterForm />
              <p className="mt-6 text-[10px] text-[#D4CEC5] tracking-[.15em] uppercase">Occasional updates, thoughtfully sent.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
