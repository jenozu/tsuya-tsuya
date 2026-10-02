import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'FAQ | TsuyaNoUchi',
  description: 'Frequently asked questions about TsuyaNoUchi art prints, production, shipping and delivery.',
  alternates: { canonical: '/faq' },
}

const faqs = [
  {
    question: 'How long does it take to prepare my order?',
    answer: 'Each print is made to order. Please allow 2–5 business days for production before your order ships.',
  },
  {
    question: 'How much is shipping?',
    answer: 'Shipping is free within the United States. For other supported destinations, the first-item rate depends on the destination and each additional item adds $2.99 USD. The exact amount is shown at checkout before payment.',
  },
  {
    question: 'Which countries do you ship to?',
    answer: 'The country selector at checkout is the current list of supported destinations. If a country is not listed, we are not currently accepting orders there.',
  },
  {
    question: 'How long will delivery take?',
    answer: 'Transit estimates depend on the destination and are shown at checkout. These estimates begin after the 2–5 business-day production period and are not guaranteed carrier delivery dates.',
  },
  {
    question: 'Will I receive tracking?',
    answer: 'When tracking is supplied by our print partner or carrier, we will share it with you once the order ships.',
  },
  {
    question: 'Can you ship to a PO box?',
    answer: 'Yes, when the selected fulfillment route supports PO box delivery. If the print partner or carrier cannot use the address provided, we may contact you for an alternative address.',
  },
  {
    question: 'What if my parcel is lost?',
    answer: 'Contact us so we can investigate with the print partner or carrier. If the parcel is confirmed lost, we will arrange a replacement or refund as appropriate.',
  },
  {
    question: 'What if my print arrives damaged or misprinted?',
    answer: 'Contact us with clear photos of the item and packaging. Once the issue is verified, we will arrange a replacement at no additional charge.',
  },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F4]">
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-[#786B59] mb-3">Customer Care</p>
          <h1 className="text-4xl font-serif text-[#2D2A26] mb-4">Frequently Asked Questions</h1>
          <p className="text-[#4A4036] leading-relaxed mb-12">
            Quick answers about production, shipping and delivery for TsuyaNoUchi prints.
          </p>

          <div className="divide-y divide-[#E5E0D8] border-y border-[#E5E0D8]">
            {faqs.map(item => (
              <section key={item.question} className="py-7">
                <h2 className="text-lg font-medium text-[#2D2A26] mb-3">{item.question}</h2>
                <p className="text-[#4A4036] leading-relaxed">{item.answer}</p>
              </section>
            ))}
          </div>

          <p className="mt-10 text-sm text-[#786B59]">
            For the complete delivery policy, see our{' '}
            <Link href="/shipping" className="underline hover:text-[#2D2A26]">Shipping Policy</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
