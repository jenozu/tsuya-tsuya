'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-context';
import { ArrowLeft, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { computeTaxAmount } from '@/lib/tax';

const checkoutSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().min(1, 'State/Province is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const { cartItems, getCartTotal } = useCart();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingCost, setShippingCost] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { country: 'US' },
  });

  const watchedCountry = watch('country');
  const watchedState = watch('state');

  const subtotal = getCartTotal();
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const resolvedShipping = shippingCost ?? 0;
  const taxableAmount = subtotal + resolvedShipping;
  const taxes = computeTaxAmount(taxableAmount, watchedCountry || 'US', watchedState || undefined);
  const total = subtotal + resolvedShipping + taxes;

  useEffect(() => {
    if (!watchedCountry) {
      setShippingCost(null);
      return;
    }
    const q = Math.max(1, totalQuantity);
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/shipping/rate?country=${encodeURIComponent(watchedCountry)}&quantity=${q}`
        );
        const data = await res.json().catch(() => ({}));
        if (!cancelled && typeof data?.price === 'number') {
          setShippingCost(data.price);
        } else if (!cancelled) {
          setShippingCost(0);
        }
      } catch {
        if (!cancelled) setShippingCost(0);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [watchedCountry, totalQuantity]);

  const onSubmit = async (data: CheckoutFormData) => {
    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    setIsRedirecting(true);
    setError(null);

    const shipping_address = {
      firstName: data.firstName,
      lastName: data.lastName,
      address: data.address,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
    };

    const items = cartItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.selectedSize?.price ?? item.price,
      quantity: item.quantity,
      imageUrl: item.imageUrl || undefined,
    }));

    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          subtotal,
          shipping: resolvedShipping,
          tax: taxes,
          country: data.country,
          state: data.state,
          shipping_address,
          email: data.email,
        }),
      });

      const sessionData = await res.json().catch(() => ({}));

      if (!res.ok) {
        let message: string =
          (typeof sessionData.error === 'string' && sessionData.error) ||
          'Could not start checkout. Please try again.';

        if (message.includes('URL must be 2048 characters or less')) {
          message =
            'There was a problem starting checkout. Please refresh the page and try again. If the issue persists, please contact support.';
        }

        setError(message);
        setIsRedirecting(false);
        return;
      }

      if (sessionData.url) {
        window.location.href = sessionData.url;
        return;
      }

      setError('Invalid response from server.');
      setIsRedirecting(false);
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Something went wrong. Please try again.');
      setIsRedirecting(false);
    }
  };

  if (cartItems.length === 0 && !isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F9F8F4]">
        <Navbar />
        <main className="flex-grow pt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <h1 className="text-3xl font-serif text-[#2D2A26] mb-4">Your cart is empty</h1>
            <Link href="/shop">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F4]">
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/cart" className="inline-flex items-center text-sm text-[#786B59] hover:text-[#2D2A26] mb-8">
            <ArrowLeft size={16} className="mr-2" />
            Back to Cart
          </Link>

          <h1 className="text-3xl font-serif text-[#2D2A26] mb-8">Checkout</h1>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-[#E5E0D8] p-6">
                  <h2 className="text-xl font-serif text-[#2D2A26] mb-6">Shipping information</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2D2A26] mb-2">First name</label>
                      <input
                        {...register('firstName')}
                        className="w-full px-4 py-2 border border-[#E5E0D8] bg-[#F9F8F4] focus:outline-none focus:border-[#2D2A26]"
                      />
                      {errors.firstName && <p className="text-xs text-[#8C3F3F] mt-1">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2D2A26] mb-2">Last name</label>
                      <input
                        {...register('lastName')}
                        className="w-full px-4 py-2 border border-[#E5E0D8] bg-[#F9F8F4] focus:outline-none focus:border-[#2D2A26]"
                      />
                      {errors.lastName && <p className="text-xs text-[#8C3F3F] mt-1">{errors.lastName.message}</p>}
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-[#2D2A26] mb-2">Email</label>
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full px-4 py-2 border border-[#E5E0D8] bg-[#F9F8F4] focus:outline-none focus:border-[#2D2A26]"
                    />
                    {errors.email && <p className="text-xs text-[#8C3F3F] mt-1">{errors.email.message}</p>}
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-[#2D2A26] mb-2">Address</label>
                    <input
                      {...register('address')}
                      className="w-full px-4 py-2 border border-[#E5E0D8] bg-[#F9F8F4] focus:outline-none focus:border-[#2D2A26]"
                    />
                    {errors.address && <p className="text-xs text-[#8C3F3F] mt-1">{errors.address.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2D2A26] mb-2">City</label>
                      <input
                        {...register('city')}
                        className="w-full px-4 py-2 border border-[#E5E0D8] bg-[#F9F8F4] focus:outline-none focus:border-[#2D2A26]"
                      />
                      {errors.city && <p className="text-xs text-[#8C3F3F] mt-1">{errors.city.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2D2A26] mb-2">State / Province</label>
                      <input
                        {...register('state')}
                        className="w-full px-4 py-2 border border-[#E5E0D8] bg-[#F9F8F4] focus:outline-none focus:border-[#2D2A26]"
                      />
                      {errors.state && <p className="text-xs text-[#8C3F3F] mt-1">{errors.state.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2D2A26] mb-2">Postal code</label>
                      <input
                        {...register('postalCode')}
                        className="w-full px-4 py-2 border border-[#E5E0D8] bg-[#F9F8F4] focus:outline-none focus:border-[#2D2A26]"
                      />
                      {errors.postalCode && <p className="text-xs text-[#8C3F3F] mt-1">{errors.postalCode.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2D2A26] mb-2">Country</label>
                      <select
                        {...register('country')}
                        className="w-full px-4 py-2 border border-[#E5E0D8] bg-[#F9F8F4] focus:outline-none focus:border-[#2D2A26]"
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AU">Australia</option>
                        <option value="JP">Japan</option>
                        <option value="AT">Austria</option>
                        <option value="BE">Belgium</option>
                        <option value="FR">France</option>
                        <option value="DE">Germany</option>
                        <option value="IE">Ireland</option>
                        <option value="IT">Italy</option>
                        <option value="NL">Netherlands</option>
                        <option value="ES">Spain</option>
                        <option value="SE">Sweden</option>
                      </select>
                      {errors.country && <p className="text-xs text-[#8C3F3F] mt-1">{errors.country.message}</p>}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-[#8C3F3F]/10 border border-[#8C3F3F]/30 text-sm text-[#8C3F3F]">{error}</div>
                )}
                <Button
                  type="submit"
                  disabled={isRedirecting || shippingCost === null}
                  className="w-full flex items-center justify-center gap-2 py-3"
                >
                  <Lock size={18} />
                  {isRedirecting ? 'Redirecting to payment…' : 'Proceed to payment'}
                </Button>
                <p className="text-xs text-[#786B59] text-center mt-3">Secure payment by Stripe. We never store your card details.</p>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white border border-[#E5E0D8] p-6 sticky top-28">
                  <h2 className="text-xl font-serif text-[#2D2A26] mb-6">Order summary</h2>
                  <div className="space-y-4 mb-6">
                    {cartItems.map((item, idx) => (
                      <div key={`${item.id}-${idx}`} className="flex gap-3">
                        <div className="w-16 h-16 flex-shrink-0 border border-[#E5E0D8] relative overflow-hidden">
                          <Image
                            src={item.imageUrl || 'https://picsum.photos/64/64'}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#2D2A26]">{item.name}</p>
                          {item.selectedSize && <p className="text-xs text-[#786B59]">Size: {item.selectedSize.label}</p>}
                          <p className="text-xs text-[#786B59]">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium text-[#2D2A26]">
                          ${((item.selectedSize?.price ?? item.price) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 border-t border-[#E5E0D8] pt-4">
                    <div className="flex justify-between text-[#4A4036]">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#4A4036]">
                      <span>Shipping</span>
                      <span>
                        {shippingCost === null ? '—' : resolvedShipping === 0 ? 'FREE' : `$${resolvedShipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#4A4036]">
                      <span>Tax</span>
                      <span>${taxes.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-medium text-[#2D2A26] border-t border-[#E5E0D8] pt-3">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#786B59] text-center mt-6">By continuing, you agree to our terms and conditions.</p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
