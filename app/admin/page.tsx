import React from 'react';
import { AdminDashboard } from './admin-client';
import { getProducts, getOrders } from '@/lib/data'
import { isPrintifyOrdersEnabled } from '@/lib/printify-config'
import { getPrintifyAdminFlags } from '@/lib/printify-store'

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [products, orders, printifyFlags] = await Promise.all([
    getProducts(),
    getOrders(),
    // Table printify_orders exists only where migration 004 is applied: never query it with the flag off.
    isPrintifyOrdersEnabled() ? getPrintifyAdminFlags().catch(() => ({})) : {},
  ]);

  return <AdminDashboard initialProducts={products} initialOrders={orders} printifyFlags={printifyFlags} />;
}
