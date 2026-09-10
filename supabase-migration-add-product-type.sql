-- Migration: Add product_type column for filtering by "single print", "2-piece Set", "3-piece Set"
-- Run this in your Supabase SQL Editor

-- Add product_type column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT;

-- Create index for filtering performance
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);

-- Update existing products to have a default type (optional: set based on current data or leave NULL)
-- You can manually set these in the admin panel or via SQL:
-- UPDATE products SET product_type = 'Single Print' WHERE ...;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'product_type column added to products table.';
  RAISE NOTICE 'You can now set product types via the admin panel or SQL.';
END $$;
