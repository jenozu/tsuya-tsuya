'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { calculateCartTotal, normalizeCart, parseStoredCart } from './cart-sanitizer';

export interface ProductSize {
  label: string;
  price: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  selectedSize?: ProductSize;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string, sizeLabel?: string) => void;
  updateQuantity: (id: string, quantity: number, sizeLabel?: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'tsuyanouchi_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setCartItems(parseStoredCart(stored));
      }
    } catch {
      console.error('Error loading cart from localStorage:');
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Keep other tabs in sync. Treat StorageEvent contents as untrusted input.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage &&
          (event.key === CART_STORAGE_KEY || event.key === null)) {
        setCartItems(parseStoredCart(event.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
      } catch {
        console.error('Error saving cart to localStorage:');
      }
    }
  }, [cartItems, isInitialized]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    const [validated] = normalizeCart([{ ...item, quantity: 1 }]);
    if (!validated) return;
    setCartItems(prev => {
      const count = prev.reduce((sum, line) => sum + line.quantity, 0);
      if (count >= 100) return prev;
      const existingIndex = prev.findIndex(line =>
        line.id === validated.id && line.selectedSize?.label === validated.selectedSize?.label
      );
      if (existingIndex >= 0) {
        if (prev[existingIndex].quantity >= 20) return prev;
        const next = [...prev];
        next[existingIndex] = { ...validated, quantity: prev[existingIndex].quantity + 1 };
        return next;
      }
      return prev.length < 30 ? [...prev, validated] : prev;
    });
  };

  const removeFromCart = (id: string, sizeLabel?: string) => {
    setCartItems((prev) =>
      prev.filter(
        (item) =>
          !(item.id === id && item.selectedSize?.label === sizeLabel)
      )
    );
  };

  const updateQuantity = (id: string, quantity: number, sizeLabel?: string) => {
    if (!Number.isInteger(quantity)) return;
    if (quantity <= 0) {
      removeFromCart(id, sizeLabel);
      return;
    }

    setCartItems(prev => {
      const otherItems = prev.reduce((sum, line) =>
        line.id === id && line.selectedSize?.label === sizeLabel ? sum : sum + line.quantity, 0);
      const nextQuantity = Math.min(20, quantity, Math.max(0, 100 - otherItems));
      if (nextQuantity < 1) return prev;
      return prev.map(line =>
        line.id === id && line.selectedSize?.label === sizeLabel
          ? { ...line, quantity: nextQuantity }
          : line
      );
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => calculateCartTotal(cartItems);

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const value: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
