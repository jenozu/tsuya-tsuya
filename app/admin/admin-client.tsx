'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  LayoutDashboard, Package, Settings, LogOut, Plus, Trash2, Edit2, Wand2, 
  Upload, Image as ImageIcon, X, GripVertical, Copy, FileSpreadsheet,
  TrendingUp, AlertCircle, DollarSign, ArrowRight, ShoppingCart, Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product, Order, ShippingRate, ProductSize } from '@/lib/supabase-helpers';
import { STANDARD_PRINT_SIZES } from '@/lib/print-sizes';
import { generateProductDescription } from '@/services/gemini';
import { uploadProductImage } from '@/lib/supabase-helpers';

type AdminTab = 'DASHBOARD' | 'PRODUCTS' | 'ORDERS' | 'SHIPPING' | 'SETTINGS';
type AnalyticsViewType = 'INVENTORY' | 'CATEGORIES' | 'VALUATION' | 'SALES';
type DetailModalType = 'NONE' | 'LOW_STOCK' | 'VALUATION_DETAILS';

const COLORS = ['#2D2A26', '#5C5446', '#8C8476', '#CDC6BC', '#8C3F3F', '#5C7C66'];

interface AdminDashboardProps {
  initialProducts: Product[];
  initialOrders: Order[];
  initialShippingRates: ShippingRate[];
}

export function AdminDashboard({ initialProducts, initialOrders, initialShippingRates }: AdminDashboardProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');
  const [isEditing, setIsEditing] = useState(false);
  
  // Dashboard State
  const [analyticsView, setAnalyticsView] = useState<AnalyticsViewType>('SALES');
  const [detailModal, setDetailModal] = useState<DetailModalType>('NONE');
  const [timeRange, setTimeRange] = useState('30D');

  // Form State
  const [currentId, setCurrentId] = useState<string>('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [stock, setStock] = useState(0);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // AI Loading State
  const [isGenerating, setIsGenerating] = useState(false);

  // Drag State
  const [draggedSizeIndex, setDraggedSizeIndex] = useState<number | null>(null);

  // CSV Upload Ref and State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  React.useEffect(() => { setProducts(initialProducts); }, [initialProducts]);
  React.useEffect(() => { setOrders(initialOrders); }, [initialOrders]);

  // --- Calculations for Dashboard ---
  const lowStockItems = useMemo(() => products.filter(p => p.stock < 5), [products]);
  const totalStock = useMemo(() => products.reduce((acc, p) => acc + p.stock, 0), [products]);
  const totalValue = useMemo(() => products.reduce((acc, p) => acc + (p.price * p.stock), 0), [products]);
  
  const categoryData = useMemo(() => {
    const counts = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [products]);

  const valuationData = useMemo(() => {
    return products
      .map(p => ({ name: p.name, value: p.price * p.stock }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [products]);

  const inventoryData = useMemo(() => {
    return products.map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      stock: p.stock,
      full_name: p.name
    }));
  }, [products]);

  const salesData = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (timeRange === '7D') start.setDate(now.getDate() - 6);
    else if (timeRange === '30D') start.setDate(now.getDate() - 29);
    else start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);

    const productById = new Map(products.map(product => [product.id, product]));
    const productByName = new Map(products.map(product => [product.name, product]));
    const buckets = new Map<string, { period: string; revenue: number; cost: number }>();

    const addBucket = (date: Date) => {
      const key = timeRange === 'YTD'
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : date.toISOString().slice(0, 10);
      if (!buckets.has(key)) {
        buckets.set(key, {
          period: timeRange === 'YTD'
            ? date.toLocaleDateString(undefined, { month: 'short' })
            : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          revenue: 0,
          cost: 0,
        });
      }
      return buckets.get(key)!;
    };

    if (timeRange === 'YTD') {
      for (let month = 0; month <= now.getMonth(); month += 1) {
        addBucket(new Date(now.getFullYear(), month, 1));
      }
    } else {
      const cursor = new Date(start);
      while (cursor <= now) {
        addBucket(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    for (const order of orders) {
      const date = new Date(order.created_at);
      if (Number.isNaN(date.getTime()) || date < start || date > now) continue;
      if (['failed', 'canceled', 'cancelled'].includes(order.status?.toLowerCase())) continue;
      if (['failed', 'canceled', 'cancelled'].includes(order.payment_status?.toLowerCase())) continue;

      const bucket = addBucket(date);
      for (const item of order.items || []) {
        const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
        bucket.revenue += (Number.isFinite(item.price) ? item.price : 0) * quantity;
        const product = productById.get(item.productId) || productByName.get(item.productName);
        const sizeCost = item.selectedSize
          ? product?.sizes?.find(size => size.label === item.selectedSize)?.cost
          : undefined;
        bucket.cost += (sizeCost ?? product?.cost ?? 0) * quantity;
      }
    }

    return Array.from(buckets.values()).map(item => ({
      ...item,
      profit: item.revenue - item.cost,
      profitMargin: item.revenue > 0 ? Math.round(((item.revenue - item.cost) / item.revenue) * 100) : 0,
    }));
  }, [orders, products, timeRange]);

  const refreshData = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const fresh = await res.json();
        setProducts(fresh);
      }
    } catch (err) {
      console.error('Error refreshing products:', err);
    }
    router.refresh();
  };

  const parseImageUrls = (val: string): string[] => {
    if (!val?.trim()) return [];
    const trimmed = val.trim();
    if (trimmed.startsWith('[')) {
      try {
        const arr = JSON.parse(trimmed) as string[];
        return Array.isArray(arr) ? arr.filter(Boolean) : [trimmed];
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  };

  const serializeImageUrls = (urls: string[]): string => {
    const filtered = urls.filter(Boolean);
    if (filtered.length === 0) return '';
    if (filtered.length === 1) return filtered[0];
    return JSON.stringify(filtered);
  };

  // --- Form Handlers ---
  const resetForm = () => {
    setCurrentId('');
    setName('');
    setCategory('');
    setDescription('');
    setImageUrls([]);
    setStock(0);
    setImageUploadError(null);
    setSizes(STANDARD_PRINT_SIZES.map(label => ({ label, price: 0, cost: 0 })));
  };

  const handleEdit = (product: Product) => {
    setCurrentId(product.id);
    setName(product.name);
    setCategory(product.category);
    setDescription(product.description);
    const urls = parseImageUrls(product.image_url);
    setImageUrls(urls);
    const existingSizes = product.sizes || [];
    const sizeMap = new Map(existingSizes.map(s => [s.label, s]));
    const standardLabels = new Set<string>(STANDARD_PRINT_SIZES);
    const standardSizes = STANDARD_PRINT_SIZES.map(label => {
      const existing = sizeMap.get(label);
      return { label, price: existing?.price ?? 0, cost: existing?.cost ?? 0 };
    });
    const customSizes = existingSizes.filter(s => !standardLabels.has(s.label));
    setSizes([...standardSizes, ...customSizes]);
    setStock(product.stock ?? 0);
    setImageUploadError(null);
    setIsEditing(true);
    setActiveTab('PRODUCTS');
  };

  const handleDuplicate = async (product: Product) => {
    const baseName = product.name.replace(/ - Copy( \d+)?$/, '');
    const escapedBase = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingCopies = products.filter(p =>
      p.name === `${baseName} - Copy` ||
      new RegExp(`^${escapedBase} - Copy \\d+$`).test(p.name)
    );
    const copyName = existingCopies.length === 0
      ? `${baseName} - Copy`
      : `${baseName} - Copy ${existingCopies.length + 1}`;

    const effectivePrice = product.price || (
      product.sizes && product.sizes.length > 0
        ? Math.round(product.sizes.reduce((s, z) => s + z.price, 0) / product.sizes.length)
        : 1
    );

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: copyName,
          description: product.description,
          price: effectivePrice,
          cost: product.cost ?? 0,
          category: product.category,
          image_url: product.image_url,
          stock: product.stock ?? 0,
          sizes: product.sizes ?? [],
        }),
      });
      if (response.ok) {
        refreshData();
      } else {
        alert('Failed to duplicate product');
      }
    } catch (error) {
      console.error('Error duplicating product:', error);
      alert('Error duplicating product');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          refreshData();
        } else {
          alert('Failed to delete product');
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product');
      }
    }
  };

  const handleSave = async () => {
    if (isUploadingImages) {
      alert('Please wait for image uploads to finish.');
      return;
    }
    if (!name || !category) {
      alert('Please fill in Name and Category.');
      return;
    }
    const sizesWithPrice = sizes.filter(s => Number.isFinite(s.price) && s.price > 0);
    if (sizesWithPrice.length === 0) {
      alert('Please add at least one size with a price.');
      return;
    }

    const avgPrice = Math.round(sizesWithPrice.reduce((sum, s) => sum + s.price, 0) / sizesWithPrice.length);
    const avgCost = Math.round(sizesWithPrice.reduce((sum, s) => sum + (s.cost ?? 0), 0) / sizesWithPrice.length);
    const imageUrlValue = imageUrls.length > 0 ? serializeImageUrls(imageUrls) : '/product-placeholder.svg';
    const productData = {
      name,
      description,
      price: avgPrice,
      cost: avgCost,
      category,
      image_url: imageUrlValue,
      stock,
      sizes: sizesWithPrice
    };

    try {
      const url = currentId ? `/api/products/${currentId}` : '/api/products';
      const method = currentId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        refreshData();
        resetForm();
        setIsEditing(false);
      } else {
        alert('Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product');
    }
  };

  // --- Size Management ---
  const updateSizeField = (index: number, field: 'price' | 'cost', value: string) => {
    const num = parseFloat(value) || 0;
    const newSizes = [...sizes];
    newSizes[index] = { ...newSizes[index], [field]: num };
    setSizes(newSizes);
  };

  const handleDragStart = (index: number) => {
    setDraggedSizeIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSizeIndex === null) return;
    if (draggedSizeIndex !== index) {
      const newSizes = [...sizes];
      const [draggedItem] = newSizes.splice(draggedSizeIndex, 1);
      newSizes.splice(index, 0, draggedItem);
      setSizes(newSizes);
      setDraggedSizeIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedSizeIndex(null);
  };

  // --- Image Upload ---
  const processFiles = async (files: File[]) => {
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const maxBytes = 10 * 1024 * 1024;
    const validFiles = files.filter(file => allowedTypes.has(file.type) && file.size > 0 && file.size <= maxBytes);
    const rejectedCount = files.length - validFiles.length;

    if (validFiles.length === 0) {
      setImageUploadError('No valid images selected. Use JPG, PNG, or WebP files up to 10 MB each.');
      return;
    }

    setIsUploadingImages(true);
    setImageUploadError(null);
    const newUrls: string[] = [];
    const failures: string[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const publicUrl = await uploadProductImage(file, file.name);
        if (publicUrl) newUrls.push(publicUrl);
        else failures.push(file.name);
      } catch (error) {
        console.error('Error uploading image:', error);
        failures.push(`${file.name}: ${error instanceof Error ? error.message : 'upload failed'}`);
      }
    }

    if (newUrls.length > 0) setImageUrls(prev => [...prev, ...newUrls]);

    const messages: string[] = [];
    if (rejectedCount > 0) messages.push(`${rejectedCount} file(s) were rejected because of type or size.`);
    if (failures.length > 0) messages.push(`Upload failed for ${failures.join(', ')}`);
    setImageUploadError(messages.length ? messages.join(' ') : null);
    setIsUploadingImages(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileArray = Array.from(e.target.files || []);
    e.target.value = '';
    if (!fileArray.length) return;
    await processFiles(fileArray);
  };

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageDragStart = (index: number) => setDraggedImageIndex(index);
  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedImageIndex === null) return;
    if (draggedImageIndex !== index) {
      const newUrls = [...imageUrls];
      const [dragged] = newUrls.splice(draggedImageIndex, 1);
      newUrls.splice(index, 0, dragged);
      setImageUrls(newUrls);
      setDraggedImageIndex(index);
    }
  };
  const handleImageDragEnd = () => setDraggedImageIndex(null);

  // --- AI Generation ---
  const handleGenerateDescription = async () => {
    if (!name || !category) {
      alert('Please enter a Product Name and Category first.');
      return;
    }
    
    setIsGenerating(true);
    const keywords = description || 'Luxury, Minimalist, Japanese'; 
    const desc = await generateProductDescription(name, category, keywords);
    setDescription(desc);
    setIsGenerating(false);
  };

  // --- CSV Import ---
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a valid CSV file (.csv extension)');
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('useMultipliers', 'false');

      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(
          `✅ ${result.message}\n\n` +
          `Imported: ${result.imported}\n` +
          `Failed: ${result.failed || 0}\n` +
          `Skipped: ${result.skipped || 0}` +
          (result.errors?.length > 0 ? `\n\nWarnings:\n${result.errors.slice(0, 5).join('\n')}` : '')
        );
        refreshData();
      } else {
        alert(
          `❌ Import Failed\n\n` +
          `${result.error || 'Unknown error'}\n\n` +
          (result.details ? `Details:\n${Array.isArray(result.details) ? result.details.slice(0, 5).join('\n') : result.details}` : '')
        );
      }
    } catch (error) {
      console.error('CSV import error:', error);
      alert('Failed to import CSV. Please check your file format and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  // --- Logout ---
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // --- Render Detail Modal ---
  const renderDetailModalContent = () => {
    if (detailModal === 'NONE') return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDetailModal('NONE')}>
        <div className="bg-[#F9F8F4] max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-[#E5E0D8] animate-fade-in" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-[#E5E0D8] flex justify-between items-center bg-white sticky top-0">
            <h3 className="text-xl font-serif text-[#2D2A26]">
              {detailModal === 'LOW_STOCK' ? 'Low Stock Alerts' : 'Inventory Valuation Breakdown'}
            </h3>
            <button onClick={() => setDetailModal('NONE')}><X size={24} className="text-[#786B59] hover:text-[#2D2A26]" /></button>
          </div>
          <div className="p-6">
            {detailModal === 'LOW_STOCK' && (
              <div>
                {lowStockItems.length === 0 ? (
                  <div className="text-center py-8 text-[#5C7C66]">
                    <Package size={48} className="mx-auto mb-2 opacity-50" />
                    <p>All stock levels are healthy.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="text-xs uppercase text-[#786B59] border-b border-[#E5E0D8]">
                      <tr>
                        <th className="pb-2 font-medium">Product</th>
                        <th className="pb-2 font-medium text-right">Current Stock</th>
                        <th className="pb-2 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E0D8]">
                      {lowStockItems.map(item => (
                        <tr key={item.id}>
                          <td className="py-3 text-[#2D2A26] font-medium">{item.name}</td>
                          <td className="py-3 text-right text-[#8C3F3F] font-bold">{item.stock}</td>
                          <td className="py-3 text-right">
                            <button 
                              onClick={() => { handleEdit(item); setDetailModal('NONE'); }}
                              className="text-xs text-[#2D2A26] underline hover:text-[#786B59]"
                            >
                              Restock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {detailModal === 'VALUATION_DETAILS' && (
              <div>
                <p className="mb-4 text-sm text-[#4A4036]">Total Asset Value: <span className="font-bold text-[#2D2A26]">${totalValue.toLocaleString()}</span></p>
                <table className="w-full text-left">
                  <thead className="text-xs uppercase text-[#786B59] border-b border-[#E5E0D8]">
                    <tr>
                      <th className="pb-2 font-medium">Product</th>
                      <th className="pb-2 font-medium text-right">Cost</th>
                      <th className="pb-2 font-medium text-right">Retail</th>
                      <th className="pb-2 font-medium text-right">Stock</th>
                      <th className="pb-2 font-medium text-right">Potential Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E0D8]">
                    {[...products].sort((a,b) => (b.price * b.stock) - (a.price * a.stock)).map(item => {
                      const potentialProfit = (item.price - (item.cost || 0)) * item.stock;
                      return (
                        <tr key={item.id}>
                          <td className="py-3 text-[#2D2A26]">{item.name}</td>
                          <td className="py-3 text-right text-[#786B59]">${item.cost || 0}</td>
                          <td className="py-3 text-right text-[#2D2A26] font-medium">${item.price}</td>
                          <td className="py-3 text-right text-[#786B59]">{item.stock}</td>
                          <td className="py-3 text-right text-[#5C7C66]">+${potentialProfit.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F9F8F4]">
      {renderDetailModalContent()}

      {/* Sidebar */}
      <div className="w-64 bg-[#1A1816] text-[#E5E0D8] flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-[#2D2A26]">
          <h1 className="text-2xl font-serif text-white">Tsuyanouchi</h1>
          <p className="text-xs text-[#786B59] uppercase tracking-widest mt-1">Admin Portal</p>
        </div>
        
        <nav className="flex-1 py-6 space-y-2">
          <button 
            onClick={() => { setActiveTab('DASHBOARD'); setIsEditing(false); }}
            className={`w-full flex items-center px-6 py-3 transition-colors ${activeTab === 'DASHBOARD' ? 'bg-[#2D2A26] text-white border-l-4 border-white' : 'hover:bg-[#2D2A26]/50 text-[#786B59]'}`}
          >
            <LayoutDashboard className="mr-3" size={20} />
            Dashboard
          </button>
          <button 
            onClick={() => { setActiveTab('PRODUCTS'); setIsEditing(false); }}
            className={`w-full flex items-center px-6 py-3 transition-colors ${activeTab === 'PRODUCTS' ? 'bg-[#2D2A26] text-white border-l-4 border-white' : 'hover:bg-[#2D2A26]/50 text-[#786B59]'}`}
          >
            <Package className="mr-3" size={20} />
            Products
          </button>
          <button 
            onClick={() => setActiveTab('ORDERS')}
            className={`w-full flex items-center px-6 py-3 transition-colors ${activeTab === 'ORDERS' ? 'bg-[#2D2A26] text-white border-l-4 border-white' : 'hover:bg-[#2D2A26]/50 text-[#786B59]'}`}
          >
            <ShoppingCart className="mr-3" size={20} />
            Orders
          </button>
          <button 
            onClick={() => setActiveTab('SHIPPING')}
            className={`w-full flex items-center px-6 py-3 transition-colors ${activeTab === 'SHIPPING' ? 'bg-[#2D2A26] text-white border-l-4 border-white' : 'hover:bg-[#2D2A26]/50 text-[#786B59]'}`}
          >
            <Truck className="mr-3" size={20} />
            Shipping
          </button>
          <button 
            onClick={() => setActiveTab('SETTINGS')}
            className={`w-full flex items-center px-6 py-3 transition-colors ${activeTab === 'SETTINGS' ? 'bg-[#2D2A26] text-white border-l-4 border-white' : 'hover:bg-[#2D2A26]/50 text-[#786B59]'}`}
          >
            <Settings className="mr-3" size={20} />
            Settings
          </button>
        </nav>

        <div className="p-6 border-t border-[#2D2A26]">
          <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2 border border-[#2D2A26] hover:bg-[#2D2A26] transition-colors rounded text-sm">
            <LogOut className="mr-2" size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          
          {/* Dashboard View */}
          {activeTab === 'DASHBOARD' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-end">
                <h2 className="text-3xl font-serif text-[#2D2A26]">Executive Overview</h2>
                <div className="flex bg-white border border-[#E5E0D8] rounded-none overflow-hidden">
                  {['7D', '30D', 'YTD'].map(range => (
                    <button 
                      key={range} 
                      onClick={() => setTimeRange(range)}
                      className={`px-4 py-2 text-xs font-medium transition-colors ${timeRange === range ? 'bg-[#2D2A26] text-white' : 'text-[#786B59] hover:bg-[#F2EFE9]'}`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Interactive Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Total Products Card */}
                <button 
                  onClick={() => setActiveTab('PRODUCTS')}
                  className="group bg-white p-6 rounded-none shadow-sm border border-[#E5E0D8] text-left hover:border-[#2D2A26] transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <h3 className="text-[#786B59] text-xs uppercase tracking-wide font-semibold">Total Products</h3>
                      <p className="text-4xl font-serif text-[#2D2A26] mt-2 group-hover:scale-105 transition-transform origin-left">{products.length}</p>
                    </div>
                    <Package className="text-[#E5E0D8] group-hover:text-[#2D2A26]/10 transition-colors" size={48} />
                  </div>
                  <div className="mt-4 flex items-center text-xs text-[#5C7C66]">
                    <TrendingUp size={14} className="mr-1" />
                    <span>Catalogue healthy</span>
                  </div>
                </button>

                {/* Asset Value Card */}
                <button 
                  onClick={() => setDetailModal('VALUATION_DETAILS')}
                  className="group bg-white p-6 rounded-none shadow-sm border border-[#E5E0D8] text-left hover:border-[#2D2A26] transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <h3 className="text-[#786B59] text-xs uppercase tracking-wide font-semibold">Total Asset Value</h3>
                      <p className="text-4xl font-serif text-[#2D2A26] mt-2 group-hover:scale-105 transition-transform origin-left">
                        ${(totalValue / 1000).toFixed(1)}k
                      </p>
                    </div>
                    <DollarSign className="text-[#E5E0D8] group-hover:text-[#2D2A26]/10 transition-colors" size={48} />
                  </div>
                  <div className="mt-4 flex items-center text-xs text-[#786B59] group-hover:text-[#2D2A26] transition-colors">
                    <span>View breakdown</span>
                    <ArrowRight size={14} className="ml-1" />
                  </div>
                </button>

                {/* Low Stock Card */}
                <button 
                  onClick={() => setDetailModal('LOW_STOCK')}
                  className={`group bg-white p-6 rounded-none shadow-sm border text-left hover:border-[#2D2A26] transition-all duration-300 relative overflow-hidden ${lowStockItems.length > 0 ? 'border-red-200' : 'border-[#E5E0D8]'}`}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <h3 className="text-[#786B59] text-xs uppercase tracking-wide font-semibold">Low Stock Items</h3>
                      <p className={`text-4xl font-serif mt-2 group-hover:scale-105 transition-transform origin-left ${lowStockItems.length > 0 ? 'text-[#8C3F3F]' : 'text-[#2D2A26]'}`}>
                        {lowStockItems.length}
                      </p>
                    </div>
                    <AlertCircle className={`${lowStockItems.length > 0 ? 'text-red-100' : 'text-[#E5E0D8]'} group-hover:text-red-200 transition-colors`} size={48} />
                  </div>
                  <div className="mt-4 flex items-center text-xs text-[#786B59]">
                    {lowStockItems.length > 0 ? 'Action required' : 'Inventory stable'}
                  </div>
                </button>
              </div>

              {/* Analytics Hub */}
              <div className="bg-white p-6 rounded-none shadow-sm border border-[#E5E0D8] min-h-[500px]">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-[#E5E0D8] pb-4 gap-4">
                  <h3 className="text-[#2D2A26] font-serif text-xl flex items-center gap-2">
                    Analytics Hub
                  </h3>
                  
                  <div className="flex gap-2 bg-[#F9F8F4] p-1 rounded-none border border-[#E5E0D8]">
                    <button 
                      onClick={() => setAnalyticsView('SALES')}
                      className={`px-4 py-2 text-xs uppercase tracking-wider font-medium transition-all ${analyticsView === 'SALES' ? 'bg-white shadow text-[#2D2A26]' : 'text-[#786B59] hover:text-[#2D2A26]'}`}
                    >
                      Sales Perf.
                    </button>
                    <button 
                      onClick={() => setAnalyticsView('INVENTORY')}
                      className={`px-4 py-2 text-xs uppercase tracking-wider font-medium transition-all ${analyticsView === 'INVENTORY' ? 'bg-white shadow text-[#2D2A26]' : 'text-[#786B59] hover:text-[#2D2A26]'}`}
                    >
                      Inventory
                    </button>
                    <button 
                      onClick={() => setAnalyticsView('CATEGORIES')}
                      className={`px-4 py-2 text-xs uppercase tracking-wider font-medium transition-all ${analyticsView === 'CATEGORIES' ? 'bg-white shadow text-[#2D2A26]' : 'text-[#786B59] hover:text-[#2D2A26]'}`}
                    >
                      Category
                    </button>
                    <button 
                      onClick={() => setAnalyticsView('VALUATION')}
                      className={`px-4 py-2 text-xs uppercase tracking-wider font-medium transition-all ${analyticsView === 'VALUATION' ? 'bg-white shadow text-[#2D2A26]' : 'text-[#786B59] hover:text-[#2D2A26]'}`}
                    >
                      Asset Value
                    </button>
                  </div>
                </div>

                <div className="h-80 w-full">
                  {analyticsView === 'SALES' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D8" />
                        <XAxis dataKey="period" stroke="#786B59" fontSize={12} tickLine={false} interval="preserveStartEnd" />
                        <YAxis stroke="#786B59" fontSize={12} tickLine={false} tickFormatter={(val) => val >= 1000 ? `$${(val/1000).toFixed(1)}k` : `$${val}`} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#F9F8F4', border: '1px solid #E5E0D8' }}
                          formatter={(value: number | undefined, name: string | undefined) => [`$${Math.round(value ?? 0).toLocaleString()}`, name === 'profit' ? 'Net Profit' : 'Cost of Goods']}
                          cursor={{fill: '#F2EFE9'}}
                        />
                        <Legend iconType="circle" />
                        <Bar dataKey="cost" stackId="a" fill="#8C8476" name="Cost" />
                        <Bar dataKey="profit" stackId="a" fill="#2D2A26" name="Profit" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {analyticsView === 'INVENTORY' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={inventoryData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D8" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#786B59" 
                          fontSize={10} 
                          tickLine={false} 
                          interval={0} 
                          angle={-45} 
                          textAnchor="end"
                        />
                        <YAxis stroke="#786B59" fontSize={12} tickLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#F9F8F4', border: '1px solid #E5E0D8', borderRadius: 0 }}
                          cursor={{fill: '#F2EFE9'}}
                        />
                        <Bar dataKey="stock" fill="#2D2A26" radius={[2, 2, 0, 0]} name="Stock Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {analyticsView === 'CATEGORIES' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          fill="#8884d8"
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#F9F8F4', border: '1px solid #E5E0D8' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}

                  {analyticsView === 'VALUATION' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={valuationData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E0D8" />
                        <XAxis type="number" stroke="#786B59" fontSize={12} tickLine={false} tickFormatter={(val) => `$${val}`} />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          stroke="#786B59" 
                          fontSize={11} 
                          tickLine={false} 
                          width={100}
                        />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#F9F8F4', border: '1px solid #E5E0D8' }}
                          formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString()}`, 'Total Value']}
                          cursor={{fill: '#F2EFE9'}}
                        />
                        <Bar dataKey="value" fill="#5C7C66" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="mt-4 text-center">
                  {analyticsView === 'CATEGORIES' && (
                    <div className="flex flex-wrap justify-center gap-4">
                      {categoryData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="text-xs text-[#4A4036]">{entry.name} ({entry.value})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {analyticsView === 'SALES' && (
                    <div className="text-xs text-[#786B59]">
                      Showing actual {timeRange} order revenue, estimated product cost, and gross profit.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Products View */}
          {activeTab === 'PRODUCTS' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-serif text-[#2D2A26]">Product Management</h2>
                <div className="flex gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    <FileSpreadsheet size={16} className="mr-2" />
                    {isImporting ? 'Importing...' : 'Import CSV'}
                  </Button>
                  <Button onClick={() => { resetForm(); setIsEditing(true); }}>
                    <Plus size={20} className="mr-2" />
                    Add Product
                  </Button>
                </div>
              </div>

              {isEditing ? (
                <div className="bg-white p-8 rounded-none shadow-lg border border-[#E5E0D8] max-w-4xl mx-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-serif text-[#2D2A26]">{currentId ? 'Edit Product' : 'New Product'}</h3>
                    <button onClick={() => setIsEditing(false)} className="text-[#786B59] hover:text-[#2D2A26]">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[#4A4036]">Name</label>
                        <input 
                          value={name} 
                          onChange={(e) => setName(e.target.value)}
                          className="w-full p-3 bg-[#F9F8F4] border border-[#E5E0D8] focus:border-[#2D2A26] outline-none transition-colors"
                          placeholder="Obsidian Vase"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[#4A4036]">Category</label>
                        <input 
                          value={category} 
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full p-3 bg-[#F9F8F4] border border-[#E5E0D8] focus:border-[#2D2A26] outline-none transition-colors"
                          placeholder="Home Decor"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[#4A4036]">Stock</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={stock}
                          onChange={(e) => setStock(Math.max(0, parseInt(e.target.value || '0', 10)))}
                          className="w-full p-3 bg-[#F9F8F4] border border-[#E5E0D8] focus:border-[#2D2A26] outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-[#4A4036]">Description</label>
                        <button 
                          onClick={handleGenerateDescription}
                          disabled={isGenerating}
                          className="flex items-center text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded hover:bg-purple-100 transition-colors disabled:opacity-50"
                        >
                          <Wand2 size={12} className="mr-1" /> 
                          {isGenerating ? 'Generating...' : 'AI Generate'}
                        </button>
                      </div>
                      <textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 bg-[#F9F8F4] border border-[#E5E0D8] focus:border-[#2D2A26] outline-none transition-colors h-32 resize-none"
                        placeholder="Product details..."
                      />
                    </div>

                    {/* Product Images */}
                    <div className="space-y-4 pt-4 border-t border-[#E5E0D8]">
                      <label className="text-sm font-medium text-[#4A4036]">Product Images</label>
                      <p className="text-xs text-[#786B59]">Add multiple images by clicking or dragging onto the upload area. Drag thumbnails to reorder. First image is the primary. JPG, PNG, or WebP; max 10 MB each.</p>
                      {isUploadingImages && <p className="text-xs text-[#4A4036]">Uploading images…</p>}
                      {imageUploadError && <p className="text-xs text-[#8C3F3F]">{imageUploadError}</p>}
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                        {imageUrls.map((url, index) => (
                          <div
                            key={`${url.slice(-20)}-${index}`}
                            draggable
                            onDragStart={() => handleImageDragStart(index)}
                            onDragOver={(e) => handleImageDragOver(e, index)}
                            onDragEnd={handleImageDragEnd}
                            className={`relative aspect-square border bg-[#F2EFE9] overflow-hidden group cursor-grab active:cursor-grabbing ${draggedImageIndex === index ? 'ring-2 ring-[#2D2A26] opacity-60' : 'border-[#E5E0D8]'}`}
                          >
                            <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                              <GripVertical className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={24} />
                            </div>
                            {index === 0 && (
                              <span className="absolute top-1 left-1 bg-[#2D2A26] text-white text-[10px] px-1.5 py-0.5 uppercase">Primary</span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md border border-[#E5E0D8] hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <label
                          className={`relative aspect-square border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragOver ? 'border-[#2D2A26] bg-[#EAE5DC]' : 'border-[#E5E0D8] bg-[#F9F8F4] hover:border-[#2D2A26] hover:bg-[#F2EFE9]'}`}
                          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                          onDragLeave={() => setIsDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                            const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                            if (dropped.length) processFiles(dropped);
                          }}
                        >
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            disabled={isUploadingImages}
                            onChange={handleImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <Upload size={24} className={`mb-1 ${isDragOver ? 'text-[#2D2A26]' : 'text-[#786B59]'}`} />
                          <span className={`text-xs ${isDragOver ? 'text-[#2D2A26] font-medium' : 'text-[#786B59]'}`}>
                            {isDragOver ? 'Drop here' : 'Add / Drop'}
                          </span>
                        </label>
                      </div>

                    </div>

                    {/* Sizes & Pricing */}
                    <div className="p-4 bg-[#F2EFE9] border border-[#E5E0D8] rounded-none">
                      <h4 className="flex items-center gap-2 text-sm font-medium text-[#2D2A26] mb-4">
                        Sizes & Pricing
                      </h4>
                      <p className="text-xs text-[#786B59] mb-4">Add the price for each size. At least one size must have a price.</p>

                      <div className="space-y-2">
                        {sizes.map((size, index) => (
                          <div 
                            key={index} 
                            className={`flex items-center justify-between bg-white p-3 border ${draggedSizeIndex === index ? 'border-[#2D2A26] shadow-md opacity-50' : 'border-[#E5E0D8]'}`}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                          >
                            <div className="flex items-center gap-3">
                              <GripVertical size={16} className="text-[#786B59] cursor-grab active:cursor-grabbing" />
                              <span className="text-sm font-medium text-[#2D2A26]">{size.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1 text-xs text-[#786B59]">
                                Price $
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={size.price || ''}
                                  onChange={(e) => updateSizeField(index, 'price', e.target.value)}
                                  className="w-24 p-2 text-sm text-[#2D2A26] border border-[#E5E0D8] focus:border-[#2D2A26] outline-none"
                                  placeholder="0"
                                />
                              </label>
                              <label className="flex items-center gap-1 text-xs text-[#786B59]">
                                Cost $
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={size.cost || ''}
                                  onChange={(e) => updateSizeField(index, 'cost', e.target.value)}
                                  className="w-24 p-2 text-sm text-[#2D2A26] border border-[#E5E0D8] focus:border-[#2D2A26] outline-none"
                                  placeholder="0"
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#786B59] mt-2">Drag to reorder sizes.</p>
                    </div>

                    <div className="flex justify-end pt-6 gap-4">
                      <Button variant="secondary" onClick={() => { resetForm(); setIsEditing(false); }}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={isUploadingImages}>
                        {isUploadingImages ? 'Uploading…' : 'Save Product'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-none shadow-sm border border-[#E5E0D8] overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[#F2EFE9] text-[#786B59] text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-4 font-medium">Product</th>
                        <th className="p-4 font-medium">Category</th>
                        <th className="p-4 font-medium text-right">Cost</th>
                        <th className="p-4 font-medium text-right">Price</th>
                        <th className="p-4 font-medium text-right">Stock</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E0D8]">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-[#F9F8F4] transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img src={parseImageUrls(product.image_url)[0] || '/product-placeholder.svg'} alt={product.name} className="w-10 h-10 object-cover bg-[#E5E0D8]" />
                              <span className="font-medium text-[#2D2A26]">{product.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-[#4A4036] text-sm">{product.category}</td>
                          <td className="p-4 text-right text-[#786B59] text-sm">${product.cost || 0}</td>
                          <td className="p-4 text-right text-[#2D2A26] font-medium">${product.price}</td>
                          <td className="p-4 text-right">
                            <span className={`px-2 py-1 text-xs ${product.stock < 5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleEdit(product)}
                                className="p-2 text-[#786B59] hover:bg-[#E5E0D8] hover:text-[#2D2A26] transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDuplicate(product)}
                                className="p-2 text-[#786B59] hover:bg-[#E5E0D8] hover:text-[#2D2A26] transition-colors"
                                title="Duplicate"
                              >
                                <Copy size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(product.id)}
                                className="p-2 text-[#786B59] hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {products.length === 0 && (
                    <div className="p-12 text-center text-[#786B59]">
                      <Package size={48} className="mx-auto mb-4 opacity-20" />
                      <p>No products available.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Orders View */}
          {activeTab === 'ORDERS' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-3xl font-serif text-[#2D2A26]">Order Management</h2>
              
              <div className="bg-white rounded-none shadow-sm border border-[#E5E0D8] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#F2EFE9] text-[#786B59] text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4 font-medium">Order ID</th>
                      <th className="p-4 font-medium">Customer</th>
                      <th className="p-4 font-medium text-right">Total</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E0D8]">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#F9F8F4] transition-colors">
                        <td className="p-4 font-medium text-[#2D2A26]">{order.order_id}</td>
                        <td className="p-4 text-[#4A4036] text-sm">{order.email}</td>
                        <td className="p-4 text-right text-[#2D2A26] font-medium">${order.total.toFixed(2)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs ${
                            order.status === 'processing' ? 'bg-blue-50 text-blue-600' :
                            order.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                            order.status === 'completed' ? 'bg-green-50 text-green-600' :
                            'bg-red-50 text-red-600'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-4 text-[#786B59] text-sm">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && (
                  <div className="p-12 text-center text-[#786B59]">
                    <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No orders yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shipping View */}
          {activeTab === 'SHIPPING' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-3xl font-serif text-[#2D2A26]">Shipping Rates</h2>
              <div className="bg-white p-6 border border-[#E5E0D8]">
                <p className="text-[#786B59]">Shipping rates are managed through Supabase. Visit your Supabase dashboard to add or modify rates.</p>
              </div>
            </div>
          )}

          {/* Settings View */}
          {activeTab === 'SETTINGS' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-3xl font-serif text-[#2D2A26]">System Settings</h2>
              <div className="bg-white p-8 rounded-none shadow-sm border border-[#E5E0D8]">
                <h3 className="text-lg font-medium text-[#2D2A26] mb-4">Admin Session</h3>
                <p className="text-[#4A4036] mb-6 max-w-xl">
                  You are currently signed in. Use the logout button in the sidebar to end your session.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
