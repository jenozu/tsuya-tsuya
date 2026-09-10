# Testing Checklist for Variations System

## Pre-Testing Setup
- [ ] Ensure development server is running
- [ ] Navigate to admin dashboard
- [ ] Login to admin panel

## Test 1: Create New Product with Variations
- [ ] Click "Add Product" button
- [ ] Fill in product name (e.g., "Test Print")
- [ ] Fill in category (e.g., "Art")
- [ ] Select product type (optional)
- [ ] Fill in description
- [ ] **Add First Variation:**
  - Size: `8" × 10"`
  - Price: `189`
  - Cost: `85`
  - Stock: `15`
  - Click "Add Custom Variation"
- [ ] Verify variation appears in list with all 4 fields visible
- [ ] **Add Second Variation:**
  - Size: `11" × 14"`
  - Price: `249`
  - Cost: `110`
  - Stock: `10`
  - Click "Add Custom Variation"
- [ ] Verify both variations are listed
- [ ] Try to save without image (should work with placeholder)
- [ ] Click "Save Product"
- [ ] Verify success and return to product list

## Test 2: Verify Product in List
- [ ] Product appears in admin product list
- [ ] Price shows average: $(189+249)/2 = $219
- [ ] Cost shows average: $(85+110)/2 = $97.50
- [ ] Stock shows total: 15+10 = 25

## Test 3: Edit Existing Product
- [ ] Click Edit on the product you just created
- [ ] Verify both variations load correctly
- [ ] **Drag & Drop Test:**
  - Drag second variation above first
  - Verify order changes
  - Drag back to original position
- [ ] **Delete Test:**
  - Add a third variation
  - Delete the third variation
  - Verify it's removed
- [ ] Save changes
- [ ] Verify product updates correctly

## Test 4: Validation Tests
- [ ] Create new product
- [ ] Try to save WITHOUT adding any variations
- [ ] Verify error message: "Please fill in required fields and add at least one variation"
- [ ] Add one variation
- [ ] Save successfully

## Test 5: Frontend Display
- [ ] Navigate to Shop page (/shop)
- [ ] Verify product appears with correct image
- [ ] Verify price displays correctly
- [ ] Click on product to view details
- [ ] **Product Detail Page:**
  - [ ] Verify "Select Size" dropdown appears directly above Add to Cart
  - [ ] Verify all variations are listed in dropdown
  - [ ] Verify benefits strip shows: Free Shipping, Easy Returns, Secure Checkout (with icons)
  - [ ] Verify each variation shows correct price
  - [ ] Select different sizes
  - [ ] Verify price updates when size changes
  - [ ] Verify stock status displays total stock
- [ ] Add to cart with selected variation
- [ ] Open cart
- [ ] Verify selected variation is shown with item

## Test 6: Edge Cases
- [ ] Create product with only 1 variation
- [ ] Create product with 5+ variations
- [ ] Use very long size labels (e.g., "Extra Large Premium Canvas Print")
- [ ] Use decimal prices (e.g., $189.99)
- [ ] Use large stock numbers (e.g., 1000)
- [ ] Use 0 stock for a variation
- [ ] Verify all cases handle correctly

## Test 7: Existing Products (If applicable)
- [ ] Edit an existing product (created before variations update)
- [ ] Product loads without errors
- [ ] Add variations to existing product
- [ ] Save successfully
- [ ] Verify updated product works on frontend

## Expected Results Summary

### Admin Panel
✅ Clean variations section with headers
✅ Each variation shows: size, price, cost, stock
✅ Drag handle visible and functional
✅ Delete button on each variation
✅ "Add Custom Variation" button with dashed border
✅ Validation prevents saving without variations
✅ Product list shows calculated aggregates

### Frontend
✅ Shop page displays products normally
✅ Product detail shows variation selector (if multiple variations)
✅ Price updates when variation selected
✅ Cart stores selected variation
✅ Total stock displays correctly

## Troubleshooting

### Issue: "Cannot read property 'price' of undefined"
**Solution**: Make sure at least one variation is added before saving

### Issue: Variations not appearing in product list
**Solution**: Check browser console for errors, refresh page

### Issue: Drag and drop not working
**Solution**: Make sure you're dragging by the grip handle (≡ icon)

### Issue: Frontend not showing variations selector
**Solution**: Only shows if product has multiple variations (working as intended)

## Database Verification (Optional)

If you have access to Supabase:
1. Go to Table Editor
2. Open `products` table
3. Find your test product
4. Check `sizes` column (JSONB)
5. Should see array of objects with label, price, cost, stock

Example:
```json
[
  {
    "label": "8\" × 10\"",
    "price": 189,
    "cost": 85,
    "stock": 15
  },
  {
    "label": "11\" × 14\"",
    "price": 249,
    "cost": 110,
    "stock": 10
  }
]
```

## Sign-off

- [ ] All tests passed
- [ ] No console errors
- [ ] Ready for production use

Date Tested: ________________
Tested By: ________________
