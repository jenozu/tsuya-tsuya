import React from 'react';
import { AdminDashboard } from './admin-client';
import { getProducts, getOrders } from '@/lib/data'
import { isPrintifyOrdersEnabled } from '@/lib/printify-config'
import { getPrintifyAdminFlags, getPrintifyAdminTracking } from '@/lib/printify-store'

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [products, orders, printifyFlags, printifyTracking] = await Promise.all([
    getProducts(),
    getOrders(),
    // Table printify_orders exists only where migration 004 is applied: never query it with the flag off.
    isPrintifyOrdersEnabled() ? getPrintifyAdminFlags().catch(() => ({})) : {},
    // Tracking columns come from migration 007; empty until it is applied.
    isPrintifyOrdersEnabled() ? getPrintifyAdminTracking().catch(() => ({})) : {},
  ]);

  return <AdminDashboard initialProducts={products} initialOrders={orders} printifyFlags={printifyFlags} printifyTracking={printifyTracking} />;
}
