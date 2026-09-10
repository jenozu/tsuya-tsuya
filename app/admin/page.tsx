import React from 'react';
import { AdminDashboard } from './admin-client';
import { getProducts, getOrders, getShippingRates } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [products, orders, shippingRates] = await Promise.all([
    getProducts(),
    getOrders(),
    getShippingRates(),
  ]);

  return <AdminDashboard initialProducts={products} initialOrders={orders} initialShippingRates={shippingRates} />;
}
