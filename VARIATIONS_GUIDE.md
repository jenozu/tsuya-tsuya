# Product Variations System

## Overview

The product management system now uses a **variations-based** approach where each product can have multiple variations (e.g., different sizes) with individual pricing, cost, and stock tracking.

## Data Structure

### ProductSize Interface

```typescript
interface ProductSize {
  label: string;   // e.g., "8" × 10"", "11" × 14""
  price: number;   // Retail price for this variation
  cost: number;    // Cost of goods for this variation
  stock: number;   // Stock quantity for this variation
}
```

### Product Model

Products maintain aggregate fields calculated from all variations:

- `price`: Average price across all variations
- `cost`: Average cost across all variations
- `stock`: Total stock from all variations
- `sizes`: Array of ProductSize objects (the variations)

## Admin Interface

### Adding Products

1. Fill in basic product information (name, category, description)
2. Add at least one variation with:
   - Size/variation label
   - Price
   - Cost
   - Stock quantity
3. Use "Add Custom Variation" button to add more variations
4. Drag variations to reorder them
5. Save the product

### Features

- **Drag & Drop**: Reorder variations by dragging the grip icon
- **Visual Layout**: Clean table showing all variation details
- **Validation**: Requires at least one variation before saving
- **Automatic Calculations**: Product-level price, cost, and stock are automatically calculated

## Database Schema

The `sizes` column in the products table stores variations as JSONB:

```sql
sizes JSONB DEFAULT '[]'::jsonb
```

Example value:
```json
[
  {
    "label": "8\" × 10\"",
    "price": 189.00,
    "cost": 85.00,
    "stock": 15
  },
  {
    "label": "11\" × 14\"",
    "price": 249.00,
    "cost": 110.00,
    "stock": 10
  }
]
```

## Migration

If you have existing products without the new variation structure, run the migration script:

```bash
# In Supabase SQL Editor
\i migrations/001_add_product_type_and_update_sizes.sql
```

Or manually update existing products to add the new fields to their sizes.

## Frontend Integration

The shop and product detail pages automatically use variation data:

- **Product Listing**: Shows aggregate price and stock
- **Product Detail**: Allows users to select variations
- **Cart**: Stores selected variation with each item
- **Stock Display**: Shows total stock across all variations

## Best Practices

1. **Consistent Naming**: Use consistent labels (e.g., always use `"` symbol for inches)
2. **Pricing Strategy**: Ensure variation prices reflect actual value differences
3. **Stock Management**: Update individual variation stock, not product-level stock
4. **Default Order**: Order variations from smallest to largest or cheapest to most expensive

## Example Use Cases

### Print Products
```
Variations: 8"×10", 11"×14", 16"×20", 18"×24"
Each with different pricing based on size
```

### Product Sets
```
Product Type: "2-piece Set"
Variations: "Set A (Living Room)", "Set B (Bedroom)"
Each set with different cost/price/availability
```

### Material Options
```
Variations: "Canvas Print", "Framed Print", "Metal Print"
Different materials at different price points
```

## Technical Notes

- Variations are stored as JSONB for flexibility
- TypeScript interfaces ensure type safety
- API routes handle variations automatically
- No changes needed to existing API endpoints
