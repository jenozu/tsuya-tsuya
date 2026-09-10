'use client';

import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useCart } from '@/lib/cart-context';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { clearCart } = useCart();

  useEffect(() => {
    if (orderId) clearCart();
  }, [orderId, clearCart]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <CheckCircle size={64} className="mx-auto text-[#5C7C66] mb-6" />
      <h1 className="text-4xl font-serif text-[#2D2A26] mb-4">Thank You for Your Order!</h1>
      <p className="text-[#4A4036] mb-2">Your order has been received and is being processed.</p>
      {orderId && (
        <p className="text-sm text-[#786B59] mb-8">
          Order Number: <span className="font-medium text-[#2D2A26]">{orderId}</span>
        </p>
      )}
      <div className="bg-[#F2EFE9] border border-[#E5E0D8] p-6 mb-8">
        <p className="text-[#4A4036] mb-4">
          We've sent a confirmation email with your order details and tracking information.
        </p>
        <p className="text-sm text-[#786B59]">
          If you have any questions, please contact us at concierge@tsuyanouchi.com
        </p>
      </div>
      <div className="flex gap-4 justify-center">
        <Link href="/shop">
          <Button>Continue Shopping</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F4]">
      <Navbar />
      <main className="flex-grow pt-24">
        <Suspense fallback={<div className="text-center py-16">Loading...</div>}>
          <ThankYouContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
