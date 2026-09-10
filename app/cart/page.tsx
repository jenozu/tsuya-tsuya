'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-context';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal } = useCart();
  
  const total = getCartTotal();

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F4]">
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-serif text-[#2D2A26] mb-8">Shopping Cart</h1>

          {cartItems.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag size={64} className="mx-auto text-[#E5E0D8] mb-4" />
              <p className="text-[#786B59] mb-6">Your cart is empty</p>
              <Link href="/shop">
                <Button>Continue Shopping</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-6">
                {cartItems.map((item, index) => {
                  const currentPrice = item.selectedSize ? item.selectedSize.price : item.price;
                  const itemKey = `${item.id}-${item.selectedSize?.label || 'default'}-${index}`;
                  
                  return (
                    <div key={itemKey} className="flex gap-6 p-6 bg-white border border-[#E5E0D8]">
                      <div className="h-32 w-32 flex-shrink-0 overflow-hidden border border-[#E5E0D8] relative">
                        <Image src={item.imageUrl || 'https://picsum.photos/128/128'} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex justify-between">
                            <h3 className="text-lg font-medium text-[#2D2A26]">{item.name}</h3>
                            <p className="ml-4 text-lg font-medium text-[#2D2A26]">
                              ${(currentPrice * item.quantity).toLocaleString()}
                            </p>
                          </div>
                          {item.selectedSize && (
                            <p className="mt-1 text-sm text-[#4A4036]">Size: {item.selectedSize.label}</p>
                          )}
                          <p className="mt-1 text-sm text-[#786B59]">${currentPrice} each</p>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center border border-[#E5E0D8]">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize?.label)}
                              className="p-2 hover:bg-[#E5E0D8] disabled:opacity-50 text-[#2D2A26]"
                              disabled={item.quantity <= 1}
                            >
                              <Minus size={16} />
                            </button>
                            <span className="px-4 text-sm text-[#2D2A26]">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize?.label)}
                              className="p-2 hover:bg-[#E5E0D8] text-[#2D2A26]"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.id, item.selectedSize?.label)}
                            className="text-sm text-[#8C3F3F] hover:text-red-700 flex items-center gap-2"
                          >
                            <Trash2 size={16}/> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-[#E5E0D8] p-6 sticky top-28">
                  <h2 className="text-xl font-serif text-[#2D2A26] mb-6">Order Summary</h2>
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-[#4A4036]">
                      <span>Subtotal</span>
                      <span>${total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[#4A4036] text-sm">
                      <span>Shipping</span>
                      <span>Calculated at checkout</span>
                    </div>
                    <div className="flex justify-between text-[#4A4036] text-sm">
                      <span>Tax</span>
                      <span>Calculated at checkout</span>
                    </div>
                    <div className="border-t border-[#E5E0D8] pt-4">
                      <div className="flex justify-between text-lg font-medium text-[#2D2A26]">
                        <span>Total</span>
                        <span>${total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <Link href="/checkout">
                    <Button className="w-full">Proceed to Checkout</Button>
                  </Link>
                  <Link href="/shop">
                    <Button variant="outline" className="w-full mt-3">Continue Shopping</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
