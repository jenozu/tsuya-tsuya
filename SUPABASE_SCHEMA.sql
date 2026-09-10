-- Tsuyanouchi E-Commerce Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2),
  category TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0,
  sizes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  taxes DECIMAL(10, 2) NOT NULL,
  shipping DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  shipping_address JSONB NOT NULL,
  payment_intent_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shipping Rates Table
CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites Table (optional, for future user accounts)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_country ON shipping_rates(country_code);

-- Insert default shipping rates
INSERT INTO shipping_rates (name, country_code, price) VALUES
  ('Standard Shipping - United States', 'US', 9.99),
  ('Express Shipping - United States', 'US', 24.99),
  ('Standard Shipping - Canada', 'CA', 14.99),
  ('Standard Shipping - United Kingdom', 'GB', 19.99),
  ('Standard Shipping - Australia', 'AU', 24.99),
  ('Standard Shipping - Japan', 'JP', 19.99),
  ('International Shipping', 'INTL', 29.99)
ON CONFLICT DO NOTHING;

-- Insert sample products (optional, for testing)
INSERT INTO products (name, description, price, cost, category, image_url, stock, sizes) VALUES
  (
    'Obsidian Vase',
    'A hand-carved obsidian vase with minimalist design. Perfect for displaying seasonal flowers or as a standalone sculptural piece.',
    189.00,
    85.00,
    'Home Decor',
    'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&q=80&w=800',
    15,
    '[]'::jsonb
  ),
  (
    'Ceramic Tea Set',
    'Traditional Japanese ceramic tea set with modern aesthetics. Includes teapot and four cups with matte black finish.',
    145.00,
    60.00,
    'Tableware',
    'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&q=80&w=800',
    8,
    '[]'::jsonb
  ),
  (
    'Washi Paper Lamp',
    'Handcrafted lamp using authentic washi paper. Creates soft, ambient lighting with traditional Japanese aesthetics.',
    225.00,
    95.00,
    'Lighting',
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&q=80&w=800',
    6,
    '[]'::jsonb
  ),
  (
    'Bamboo Storage Box',
    'Minimalist storage solution crafted from sustainable bamboo. Features clean lines and natural finish.',
    89.00,
    35.00,
    'Storage',
    'https://images.unsplash.com/photo-1600298881974-6be191ceeda1?auto=format&fit=crop&q=80&w=800',
    20,
    '[]'::jsonb
  ),
  (
    'Zen Garden Set',
    'Complete zen garden kit with sand, stones, and raking tool. Perfect for meditation and mindfulness practice.',
    65.00,
    25.00,
    'Wellness',
    'https://images.unsplash.com/photo-1602524206684-76b7c36f90b0?auto=format&fit=crop&q=80&w=800',
    12,
    '[]'::jsonb
  ),
  (
    'Silk Wall Hanging',
    'Hand-dyed silk wall hanging featuring abstract mountain landscape. Each piece is unique.',
    320.00,
    140.00,
    'Art',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=800',
    4,
    '[{"label": "Small (24x36)", "price": 320}, {"label": "Medium (36x48)", "price": 450}, {"label": "Large (48x72)", "price": 680}]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access for products" ON products
  FOR SELECT USING (true);

CREATE POLICY "Public read access for shipping rates" ON shipping_rates
  FOR SELECT USING (true);

-- Create policies for authenticated operations
-- Note: For now, we'll allow all operations since we use service role key
-- In production with user auth, you should create more restrictive policies

CREATE POLICY "Allow all operations on products" ON products
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on orders" ON orders
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on shipping_rates" ON shipping_rates
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on favorites" ON favorites
  FOR ALL USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at automatically
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_rates_updated_at BEFORE UPDATE ON shipping_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database schema created successfully!';
  RAISE NOTICE 'Sample products have been added.';
  RAISE NOTICE 'Default shipping rates have been configured.';
  RAISE NOTICE 'Remember to create a storage bucket named "product-images" in the Supabase Storage section.';
END $$;
