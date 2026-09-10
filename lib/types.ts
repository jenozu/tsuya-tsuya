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
  product_type?: string | null
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

export function parseProductImageUrls(value: string | null | undefined): string[] {
  if (!value || typeof value !== 'string' || !value.trim()) return []
  const trimmed = value.trim()
  if (!trimmed.startsWith('[')) return [trimmed]

  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : []
  } catch {
    return [trimmed]
  }
}

export function getImageUrls(product: Pick<Product, 'image_url'>): string[] {
  return parseProductImageUrls(product.image_url)
}
