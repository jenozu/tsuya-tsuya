import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ContactForm } from '@/components/contact-form'

export const metadata: Metadata = {
  title: 'Contact | TsuyaNoUchi',
  description: 'Send a message to TsuyaNoUchi customer support.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F4]">
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-[#786B59] mb-3">Customer Care</p>
          <h1 className="text-4xl font-serif text-[#2D2A26] mb-4">Contact us</h1>
          <p className="text-[#4A4036] leading-relaxed mb-8">Questions about an order or a print? Send us a message.</p>
          <ContactForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}
