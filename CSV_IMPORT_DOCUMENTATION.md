# CSV Bulk Import Feature - Complete Documentation

## Overview

The CSV Bulk Import feature allows staff to quickly add multiple products to the House of Lustre collection. Each CSV row creates one base product with **automatic size variations** for all standard print sizes.

---

## 📋 CSV File Format

### Required Headers (case-insensitive)
- `name` - Product name (text)
- `category` - Product category (text, e.g., "Art Prints", "Home Decor")
- `price` - Base price (numeric, e.g., 189 or 189.00)
- `stock` - Total stock quantity (integer, e.g., 50)
- `imageUrl` - Public image URL (must end with .jpg, .jpeg, .png, or .webp)

### Optional Headers
- `description` - Product description (text)
- `cost` - Cost of goods (numeric)
- `salePrice` - Sale price if applicable (numeric)
- `videoUrl` - Product video URL (text)

### Example CSV

```csv
name,category,price,stock,imageUrl,description,cost
"Mountain Landscape Print","Art Prints",189,50,"https://example.com/mountain.jpg","Beautiful mountain landscape",85
"Ocean Waves Print","Art Prints",189,45,"https://example.com/ocean.jpg","Dramatic ocean waves",85
```

---

## 🎯 Automatic Size Variations

For **EVERY** imported product, the system automatically creates **8 size variations**:

| Size | Default Multiplier (Option B) |
|------|-------------------------------|
| 8" x 10" | 1.0x (base price) |
| 11" x 14" | 1.3x |
| 12" x 18" | 1.5x |
| 16" x 20" | 1.8x |
| 18" x 24" | 2.1x |
| 20" x 30" | 2.5x |
| 24" x 32" | 2.8x |
| 24" x 36" | 3.2x |

### Pricing Options

**Option A (Default):** All variations get the same base price
- CSV price: $189 → All sizes: $189

**Option B (Multipliers):** Sizes scale based on multipliers
- CSV price: $189
- 8" x 10": $189 (1.0x)
- 11" x 14": $246 (1.3x, rounded)
- 16" x 20": $340 (1.8x, rounded)
- 24" x 36": $605 (3.2x, rounded)

Toggle multipliers with the checkbox in the import UI (future enhancement).

---

## 🚀 How to Use

### Step 1: Prepare Your CSV
1. Create a CSV file with required headers
2. Add one row per product
3. Ensure image URLs are public and valid
4. Save as `.csv` file

**Use the template:** `example-import.csv` in your project root

### Step 2: Import via Admin Panel
1. Go to admin dashboard
2. Click "Collection" in sidebar
3. Click "IMPORT CSV" button (next to "NEW ENTRY")
4. Select your CSV file
5. Wait for processing (you'll see "Importing..." status)

### Step 3: Review Results
You'll see a popup with:
- ✅ Number of products imported
- ❌ Number failed
- ⚠️ Number skipped
- Error details (if any)

### Step 4: Verify Products
- Products appear immediately in the Collection Archive table
- Each product has 8 size variations auto-created
- Edit any product to adjust individual variation prices

---

## ⚙️ Technical Implementation

### Files Created

**1. `lib/print-sizes.ts`**
- Constants for standard print sizes
- Price multipliers configuration
- CSV validation config

**2. `lib/csv-parser.ts`**
- CSV parsing logic
- Row validation
- Size variation generation
- Error handling

**3. `app/api/products/import/route.ts`**
- POST endpoint for CSV upload
- Bulk product creation
- Error reporting
- GET endpoint for template info

**4. `example-import.csv`**
- 10 sample products
- All required and optional fields
- Valid image URLs from Unsplash

### Updated Files

**5. `app/admin/admin-client.tsx`**
- Added Import CSV button
- Added file upload handler
- Added loading state
- Added success/error feedback

---

## 🔍 Validation Rules

### File Validation
- ✅ Must be `.csv` extension
- ✅ Maximum file size: 5MB
- ✅ Must not be empty

### Row Validation
- ✅ All required fields must be present
- ✅ `price` must be a positive number
- ✅ `stock` must be a non-negative integer
- ✅ `imageUrl` must end with valid extension
- ✅ `name` and `category` cannot be empty

### Error Handling
- Invalid rows are **skipped** (not imported)
- Detailed error messages show which rows failed
- Import continues even if some rows fail
- Summary shows: imported count, failed count, skipped count

---

## 📊 Import Process Flow

```
1. User clicks "Import CSV"
   ↓
2. File selected
   ↓
3. Frontend sends to /api/products/import
   ↓
4. Server parses CSV text
   ↓
5. Each row validated
   ↓
6. For each valid row:
   - Create 8 size variations
   - Apply pricing (flat or multiplied)
   - Save to Supabase
   ↓
7. Return summary
   ↓
8. Show success popup
   ↓
9. Refresh product list
```

---

## 🎨 Admin UI Changes

### New Button: "IMPORT CSV"
- Location: Collection Archive header (left of "NEW ENTRY")
- Style: Outlined button with FileSpreadsheet icon
- States:
  - Default: "Import CSV"
  - Loading: "Importing..." (disabled)
  - Hidden file input (triggered on click)

### Success Feedback
```
✅ Successfully imported 10 items

Imported: 10
Failed: 0
Skipped: 0
```

### Error Feedback
```
❌ Import Failed

CSV parsing failed

Details:
Row 2: Missing required field "price"
Row 5: Invalid imageUrl (must end with .jpg/.png/.webp)
```

---

## 💾 Database Schema

No changes required! The existing schema already supports:
- JSONB `sizes` column for variations
- All product fields (name, category, price, cost, stock, etc.)

Each imported product stores variations as:
```json
[
  {"label": "8\" x 10\"", "price": 189, "cost": 85},
  {"label": "11\" x 14\"", "price": 246, "cost": 111},
  ...
]
```

---

## 🧪 Testing Checklist

- [ ] **Valid CSV**: Import example-import.csv
- [ ] **Missing Headers**: Try CSV without 'price' column (should fail)
- [ ] **Invalid Price**: Row with price = "abc" (row skipped)
- [ ] **Invalid Image**: Row with imageUrl ending in .pdf (row skipped)
- [ ] **Empty File**: Upload empty CSV (should fail)
- [ ] **Mixed Valid/Invalid**: CSV with some good rows, some bad (good ones import)
- [ ] **Large File**: Try 100+ rows (should work)
- [ ] **After Import**: Verify products appear in list
- [ ] **Variations Check**: Edit imported product → verify 8 sizes exist
- [ ] **Frontend Display**: Check shop page displays imported products

---

## 🔧 Configuration

### Modify Size List
Edit `lib/print-sizes.ts`:
```typescript
export const STANDARD_PRINT_SIZES = [
  '8" x 10"',
  // Add or remove sizes here
];
```

### Modify Price Multipliers
Edit `SIZE_MULTIPLIERS` in same file:
```typescript
export const SIZE_MULTIPLIERS: Record<string, number> = {
  '8" x 10"': 1.0,
  '11" x 14"': 1.5, // Changed from 1.3x to 1.5x
};
```

### Adjust Validation
Edit `CSV_CONFIG` in `lib/print-sizes.ts`:
```typescript
export const CSV_CONFIG = {
  REQUIRED_HEADERS: ['name', 'category', 'price', 'stock', 'imageUrl'],
  VALID_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'], // Added .gif
  MAX_FILE_SIZE: 10 * 1024 * 1024, // Increased to 10MB
};
```

---

## 🐛 Troubleshooting

### "Import Failed" with no details
- **Check:** Browser console for errors
- **Fix:** Ensure API route exists at `/api/products/import`

### "All rows skipped"
- **Check:** CSV headers match exactly (case-insensitive)
- **Fix:** Use headers from example-import.csv

### "Invalid imageUrl" errors
- **Check:** URLs end with .jpg, .jpeg, .png, or .webp
- **Fix:** Update image URLs or add extension to CSV_CONFIG

### Products imported but don't show variations
- **Check:** Database `sizes` column contains JSONB array
- **Fix:** Run database migration to ensure `sizes` column exists

### "Failed to save product" during import
- **Check:** Supabase connection and credentials
- **Fix:** Verify `.env.local` has correct SUPABASE_URL and keys

---

## 🎯 API Endpoints

### POST /api/products/import
**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: FormData with 'file' and optional 'useMultipliers'

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully imported 10 items",
  "imported": 10,
  "failed": 0,
  "skipped": 0,
  "errors": []
}
```

**Response (Failure):**
```json
{
  "error": "CSV parsing failed",
  "details": ["Row 2: Missing required field 'price'"],
  "imported": 8,
  "skipped": 2
}
```

### GET /api/products/import
Returns template information and example format.

---

## 📈 Future Enhancements

1. **UI Toggle for Multipliers:** Add checkbox to enable Option B pricing
2. **Progress Bar:** Show real-time import progress for large files
3. **Preview:** Show parsed data before confirming import
4. **Export:** Export current products to CSV
5. **Bulk Update:** Update existing products from CSV
6. **Image Upload:** Allow image upload in CSV import process
7. **Categories Dropdown:** Suggest existing categories during CSV creation
8. **Validation Report:** Downloadable report of all errors

---

## 📞 Support

**Example CSV:** `example-import.csv`
**Configuration:** `lib/print-sizes.ts`
**Parser Logic:** `lib/csv-parser.ts`
**API Endpoint:** `app/api/products/import/route.ts`

For questions or issues, check the browser console and API logs for detailed error messages.
