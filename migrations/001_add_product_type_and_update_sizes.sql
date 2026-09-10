-- Migration: Add product_type column and update sizes structure
-- Date: 2026-02-16
-- Description: Adds product_type field and documents new sizes structure with cost and stock

-- Add product_type column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_type TEXT;

-- Update sample data comment for sizes structure
COMMENT ON COLUMN products.sizes IS 
'JSONB array of product variations. Each variation should have: 
{
  "label": "8\" × 10\"",
  "price": 189.00,
  "cost": 85.00,
  "stock": 15
}
The product-level price, cost, and stock are calculated aggregates from all variations.';

-- Example: Update existing products to have proper variation structure
-- This is commented out - uncomment and customize for your data
/*
UPDATE products 
SET sizes = jsonb_build_array(
  jsonb_build_object(
    'label', '8" × 10"',
    'price', price,
    'cost', COALESCE(cost, 0),
    'stock', stock
  )
)
WHERE sizes = '[]'::jsonb OR sizes IS NULL;
*/

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added product_type column to products table.';
  RAISE NOTICE 'Updated sizes column documentation.';
  RAISE NOTICE 'NOTE: The variations system now requires each size to have: label, price, cost, and stock.';
END $$;
