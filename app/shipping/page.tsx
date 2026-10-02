import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Shipping Policy | TsuyaNoUchi',
  description: 'Processing times, shipping rates, delivery estimates, tracking and delivery support for TsuyaNoUchi art prints.',
  alternates: { canonical: '/shipping' },
}

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F4]">
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-[#786B59] mb-3">Customer Care</p>
          <h1 className="text-4xl font-serif text-[#2D2A26] mb-4">Shipping Policy</h1>
          <p className="text-[#4A4036] leading-relaxed mb-12">
            Our art prints are made to order. This page explains how production, shipping charges,
            delivery estimates and delivery issues are handled.
          </p>

          <div className="space-y-10 text-[#4A4036]">
            <section>
              <h2 className="text-xl font-serif text-[#2D2A26] mb-3">Processing time</h2>
              <p className="leading-relaxed">
                Please allow 2–5 business days for your print to be produced before shipment.
                This production time is separate from the delivery estimate shown for your destination.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif text-[#2D2A26] mb-3">Shipping charges</h2>
              <p className="leading-relaxed">
                Shipping is free for orders delivered within the United States. For other supported
                destinations, shipping is calculated from the destination and quantity in your order.
                The first-item rate varies by destination, and each additional item adds $2.99 USD.
                Your exact shipping charge is shown during checkout before payment.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif text-[#2D2A26] mb-3">Where we ship</h2>
              <p className="leading-relaxed">
                We ship only to the destinations available in the country selector at checkout.
                If a country is not listed, we are not currently accepting orders for that destination.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif text-[#2D2A26] mb-3">Delivery estimates</h2>
              <p className="leading-relaxed">
                Estimated transit times vary by destination and are displayed at checkout. They are
                estimates rather than guaranteed carrier delivery dates and begin after the order has
                finished the 2–5 business-day production period.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif text-[#2D2A26] mb-3">Tracking</h2>
              <p className="leading-relaxed">
                When tracking is provided by our print partner or carrier, it will be shared with you
                once the order ships.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif text-[#2D2A26] mb-3">PO boxes</h2>
              <p className="leading-relaxed">
                PO box addresses are accepted when the selected fulfillment route supports them.
                If our print partner or carrier cannot deliver to the address provided, we may contact
                you for an alternative address before fulfillment.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif text-[#2D2A26] mb-3">Lost parcels</h2>
              <p className="leading-relaxed">
                If tracking indicates a parcel may be lost, contact us so we can investigate with the
                print partner or carrier. When a parcel is confirmed lost, we will arrange a replacement
                or refund as appropriate.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif text-[#2D2A26] mb-3">Damaged or misprinted orders</h2>
              <p className="leading-relaxed">
                If your print arrives damaged or has a production defect, contact us with clear photos
                of the item and packaging. Once the issue is verified, we will arrange a replacement at
                no additional charge.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif text-[#2D2A26] mb-3">Shipping-rate changes</h2>
              <p className="leading-relaxed">
                Carrier and fulfillment costs can change over time. The shipping amount displayed at
                checkout is the current rate that applies to your order.
              </p>
            </section>
          </div>

          <div className="mt-12 border-t border-[#E5E0D8] pt-8 text-sm text-[#786B59]">
            Have another shipping question? <Link href="/faq" className="underline hover:text-[#2D2A26]">Visit our FAQ</Link>.
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
