import { supabase } from './supabase-client'

// ==================== TYPES ====================

export interface ProductSize {
  label: string
  price: number
  cost?: number
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  cost?: number
  category: string
  image_url: string
  stock: number
  sizes?: ProductSize[]
  created_at?: string
  updated_at?: string
}

export interface Order {
  id: string
  order_id: string
  email: string
  items: OrderItem[]
  subtotal: number
  taxes: number
  shipping: number
  total: number
  status: string
  shipping_address: ShippingAddress
  payment_intent_id?: string
  payment_status: string
  payment_method?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  selectedSize?: string
  imageUrl?: string
}

export interface ShippingAddress {
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface ShippingRate {
  id: string
  name: string
  country_code: string
  price: number
  created_at?: string
  updated_at?: string
}

// ==================== PRODUCT HELPERS ====================

/** Parse image_url which may be a single URL or JSON array of URLs */
export function getImageUrls(product: Product): string[] {
  const val = product.image_url;
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
}

// ==================== PRODUCTS ====================

export async function getProducts(): Promise<Product[]> {
  try {
    const start = Date.now()
    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, price, cost, category, image_url, stock, sizes, created_at, updated_at')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    const duration = Date.now() - start
    console.log(`[perf] getProducts took ${duration}ms`)
    return data || []
  } catch (error) {
    console.error('Error fetching products:', error)
    return []
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  try {
    const start = Date.now()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    const duration = Date.now() - start
    console.log(`[perf] getProduct(${id}) took ${duration}ms`)
    return data
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        description: product.description,
        price: product.price,
        cost: product.cost,
        category: product.category,
        image_url: product.image_url,
        stock: product.stock,
        sizes: product.sizes,
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating product:', error)
    return null
  }
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating product:', error)
    return null
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting product:', error)
    return false
  }
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching products by category:', error)
    return []
  }
}

// ==================== ORDERS ====================

export async function getOrders(): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching orders:', error)
    return []
  }
}

export async function getOrder(orderId: string): Promise<Order | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching order:', error)
    return null
  }
}

export async function createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_id: orderData.order_id,
        email: orderData.email,
        items: orderData.items,
        subtotal: orderData.subtotal,
        taxes: orderData.taxes,
        shipping: orderData.shipping,
        total: orderData.total,
        status: orderData.status || 'pending',
        shipping_address: orderData.shipping_address,
        payment_intent_id: orderData.payment_intent_id,
        payment_status: orderData.payment_status || 'pending',
        payment_method: orderData.payment_method,
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating order:', error)
    return null
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  paymentStatus?: string
): Promise<boolean> {
  try {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    }
    
    if (paymentStatus) {
      updates.payment_status = paymentStatus
    }
    
    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('order_id', orderId)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating order status:', error)
    return false
  }
}

export async function updateOrderPaymentIntent(
  orderId: string,
  paymentIntentId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating order payment intent:', error)
    return false
  }
}

// ==================== SHIPPING RATES ====================

export async function getShippingRates(): Promise<ShippingRate[]> {
  try {
    const { data, error } = await supabase
      .from('shipping_rates')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching shipping rates:', error)
    return []
  }
}

export async function getShippingRate(countryCode: string): Promise<ShippingRate | null> {
  try {
    const { data, error } = await supabase
      .from('shipping_rates')
      .select('*')
      .eq('country_code', countryCode)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching shipping rate:', error)
    return null
  }
}

export async function createShippingRate(rate: Omit<ShippingRate, 'id' | 'created_at' | 'updated_at'>): Promise<ShippingRate | null> {
  try {
    const { data, error } = await supabase
      .from('shipping_rates')
      .insert({
        name: rate.name,
        country_code: rate.country_code,
        price: rate.price,
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating shipping rate:', error)
    return null
  }
}

export async function updateShippingRate(id: string, updates: Partial<ShippingRate>): Promise<ShippingRate | null> {
  try {
    const { data, error } = await supabase
      .from('shipping_rates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating shipping rate:', error)
    return null
  }
}

export async function deleteShippingRate(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shipping_rates')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting shipping rate:', error)
    return false
  }
}

// ==================== STORAGE ====================

export async function uploadProductImage(file: File, fileName: string): Promise<string | null> {
  try {
    const filePath = `products/${fileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })
    
    if (uploadError) throw uploadError
    
    // Get public URL
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)
    
    return data.publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    return null
  }
}

export async function deleteProductImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/product-images/')
    if (urlParts.length < 2) return false
    
    const filePath = urlParts[1]
    
    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath])
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting image:', error)
    return false
  }
}

// ==================== FAVORITES ====================

export async function getUserFavorites(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('product_id')
      .eq('user_id', userId)
    
    if (error) throw error
    return data?.map(f => f.product_id) || []
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return []
  }
}

export async function addFavorite(userId: string, productId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        product_id: productId,
      })
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error adding favorite:', error)
    return false
  }
}

export async function removeFavorite(userId: string, productId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error removing favorite:', error)
    return false
  }
}
