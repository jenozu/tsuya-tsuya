import React from 'react';
import { AdminDashboard } from './admin-client';
import { getProducts, getOrders } from '@/lib/data'

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [products, orders] = await Promise.all([
    getProducts(),
    getOrders(),
  ]);

  return <AdminDashboard initialProducts={products} initialOrders={orders} />;
}
