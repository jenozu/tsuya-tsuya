import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Terms of Service | TsuyaNoUchi',
  description: 'Terms of Service for TsuyaNoUchi. Pending owner review.',
  robots: { index: false, follow: false },
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F4]">
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-[#786B59] mb-3">Customer Care</p>
          <h1 className="text-4xl font-serif text-[#2D2A26] mb-4">Terms of Service</h1>
          <p className="text-[#4A4036] leading-relaxed">[OWNER TO SUPPLY] Text pending owner approval.</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
