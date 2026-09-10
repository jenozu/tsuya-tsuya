# 📝 CSV Template Guide - How to Fill Out Your Import File

## 📋 Template Files Created

**Two templates available:**

1. **`csv-template-blank.csv`** - Empty template, ready to fill
2. **`csv-template-with-example.csv`** - Template with one example row

---

## 📊 CSV Column Reference

### Required Columns (Must Have Values)

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| **name** | Text | `"Mountain Landscape Print"` | Product name (use quotes) |
| **category** | Text | `"Art Prints"` | Category name (use quotes) |
| **price** | Number | `189` | Base price (no $ sign, no quotes) |
| **stock** | Number | `50` | Quantity in stock (no quotes) |
| **imageUrl** | Text | `"mountain.jpg"` | Just filename (use quotes) |

### Optional Columns (Can Leave Empty)

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| **description** | Text | `"Beautiful mountain landscape"` | Product description (use quotes) |
| **cost** | Number | `85` | Cost per item (no $ sign, no quotes) |
| **videoUrl** | Text | `"https://example.com/video.mp4"` | Video URL for hover effect (use quotes) |

---

## ✍️ How to Fill Out the CSV

### Option A: Excel or Google Sheets (Recommended)

1. **Open the template:**
   - Open `csv-template-blank.csv` in Excel or Google Sheets
   - Headers are already there!

2. **Fill in your data:**
   - Each row = one product
   - Fill in the required columns
   - Leave optional columns empty if not needed

3. **Save as CSV:**
   - File → Save As → CSV (Comma delimited)
   - Name it: `my-products.csv`

### Option B: Text Editor (Notepad, VS Code)

1. **Open the template:**
   - Open `csv-template-blank.csv` in text editor

2. **Add rows manually:**
   ```csv
   name,category,price,stock,imageUrl,description,cost,videoUrl
   "Product 1","Art Prints",189,50,"image1.jpg","Description 1",85,
   "Product 2","Art Prints",209,45,"image2.jpg","Description 2",95,
   ```

3. **Save the file**

---

## 📝 Example: Complete CSV

```csv
name,category,price,stock,imageUrl,description,cost,videoUrl
"Mountain Landscape","Art Prints",189,50,"mountain.jpg","Stunning mountain view",85,
"Ocean Waves","Art Prints",189,45,"ocean.jpg","Dramatic ocean scene",85,
"Forest Path","Art Prints",189,40,"forest.jpg","Serene forest walk",85,
"Desert Dunes","Art Prints",189,35,"desert.jpg","Sweeping sand dunes",85,
```

---

## ✅ Important Rules

### 1. Text Values Need Quotes
```csv
✅ "Mountain Landscape","Art Prints"
❌ Mountain Landscape,Art Prints
```

### 2. Numbers Don't Need Quotes
```csv
✅ 189,50,85
❌ "189","50","85"
```

### 3. Image URLs - Just Filenames!
```csv
✅ "mountain.jpg"
❌ "1/mountain.jpg"
❌ "product-images/1/mountain.jpg"
```

The system automatically constructs the full Supabase URL.

### 4. Empty Optional Columns
```csv
✅ "Product","Category",189,50,"image.jpg","",0,
✅ "Product","Category",189,50,"image.jpg",,0,
```

### 5. Commas in Text
If your text has commas, keep the quotes:
```csv
✅ "Landscape, Mountain, Nature","Art Prints",189,50,"image.jpg"
```

---

## 🎯 Field Details

### **name** (Required)
- Product display name
- Use descriptive names
- Example: `"Mountain Landscape Print"` not `"Print 1"`

### **category** (Required)
- Category for filtering in shop
- Common categories: `"Art Prints"`, `"Posters"`, `"Canvas"`, `"Frames"`
- Keep consistent across products

### **price** (Required)
- Base price in your currency (e.g., dollars)
- Whole numbers only (no decimals in this example)
- Example: `189` = $189.00
- System creates 8 size variations with this base price

### **stock** (Required)
- Quantity available
- Whole number
- Example: `50`

### **imageUrl** (Required)
- **Just the filename** you uploaded
- Must match exactly what you uploaded to Supabase
- Example: `"mountain-landscape.jpg"`
- Case-sensitive!

### **description** (Optional)
- Product details
- Can be empty: `""`
- Example: `"Stunning mountain landscape photograph printed on premium archival paper"`

### **cost** (Optional)
- Your cost per unit
- For profit tracking
- Can be `0` if not tracking
- Example: `85` = $85.00 cost

### **videoUrl** (Optional)
- Full URL to video file
- For hover video effect
- Can be empty
- Example: `"https://cdn.example.com/videos/mountain.mp4"`

---

## 🚀 Automatic Size Variations

**Important:** Each CSV row creates **1 product with 8 size variations**!

**Your CSV:**
```csv
name,category,price,stock,imageUrl,description,cost,videoUrl
"Mountain Print","Art Prints",189,50,"mountain.jpg","Beautiful",85,
```

**System Creates:**
- 8" x 10" - $189
- 11" x 14" - $189
- 12" x 18" - $189
- 16" x 20" - $189
- 18" x 24" - $189
- 20" x 30" - $189
- 24" x 32" - $189
- 24" x 36" - $189

All variations inherit the base price. You can edit individual variation prices after import!

---

## 📊 Example Workflows

### Workflow 1: Art Prints Collection

**Your images:** `mountain.jpg`, `ocean.jpg`, `forest.jpg`

**Your CSV:**
```csv
name,category,price,stock,imageUrl,description,cost,videoUrl
"Mountain Landscape","Art Prints",189,50,"mountain.jpg","Majestic mountain vista",85,
"Ocean Waves","Art Prints",189,50,"ocean.jpg","Powerful ocean scene",85,
"Forest Path","Art Prints",189,50,"forest.jpg","Peaceful forest trail",85,
```

**Result:** 3 products × 8 variations each = 24 total product variations!

### Workflow 2: Mixed Products

```csv
name,category,price,stock,imageUrl,description,cost,videoUrl
"Premium Mountain","Art Prints",229,20,"mountain-premium.jpg","High-quality print",105,
"Budget Ocean","Posters",99,100,"ocean-budget.jpg","Affordable poster",45,
"Canvas Forest","Canvas",349,10,"forest-canvas.jpg","Gallery wrapped canvas",165,
```

---

## 🐛 Common Mistakes

### ❌ Mistake 1: Missing Quotes on Text
```csv
Mountain Landscape,Art Prints,189,50,mountain.jpg
```
**Fix:** Add quotes
```csv
"Mountain Landscape","Art Prints",189,50,"mountain.jpg"
```

### ❌ Mistake 2: Quotes on Numbers
```csv
"Mountain","Art","189","50","mountain.jpg"
```
**Fix:** Remove quotes from numbers
```csv
"Mountain","Art",189,50,"mountain.jpg"
```

### ❌ Mistake 3: Including Folder Path
```csv
"Mountain","Art",189,50,"1/mountain.jpg"
```
**Fix:** Just filename
```csv
"Mountain","Art",189,50,"mountain.jpg"
```

### ❌ Mistake 4: Wrong Filename
```csv
"Mountain","Art",189,50,"mountian.jpg"
```
(Typo: "mountian" instead of "mountain")

**Fix:** Match exact uploaded filename
```csv
"Mountain","Art",189,50,"mountain.jpg"
```

---

## ✅ Validation Checklist

Before importing, verify:
- [ ] All required columns have values (name, category, price, stock, imageUrl)
- [ ] Text values have quotes: `"text"`
- [ ] Numbers don't have quotes: `123`
- [ ] Image filenames match uploaded files exactly
- [ ] No folder paths in imageUrl (just `"image.jpg"`)
- [ ] Price and stock are positive numbers
- [ ] File saved as `.csv` format

---

## 🎓 Pro Tips

### Tip 1: Use Excel for Easy Editing
- Open CSV in Excel
- Edit like a normal spreadsheet
- Excel handles quotes automatically
- Save As → CSV

### Tip 2: Test with 1-2 Products First
- Create CSV with just 1-2 products
- Import and verify they look correct
- Then import your full catalog

### Tip 3: Keep a Master CSV File
- Save your CSV file
- Easy to make changes and re-import
- Version control: `products-v1.csv`, `products-v2.csv`

### Tip 4: Bulk Edit in Sheets
- Import CSV to Google Sheets
- Use formulas for bulk changes
- Example: `=CONCATENATE(A2, " Print")` to add "Print" to all names
- Download as CSV

---

## 📋 Quick Reference

**Template Files:**
- `csv-template-blank.csv` - Empty template
- `csv-template-with-example.csv` - Example filled in

**Required Format:**
```csv
name,category,price,stock,imageUrl,description,cost,videoUrl
"Text","Text",Number,Number,"filename.jpg","Text",Number,"URL or empty"
```

**Example Row:**
```csv
"Mountain Print","Art Prints",189,50,"mountain.jpg","Beautiful mountain view",85,
```

---

## 🚀 Next Steps

1. **Choose a template:**
   - `csv-template-blank.csv` for fresh start
   - `csv-template-with-example.csv` to modify example

2. **Fill in your products:**
   - Open in Excel/Sheets or text editor
   - Add one row per product
   - Save as CSV

3. **Import:**
   - `npm run dev`
   - Login to admin: http://localhost:3000/admin/login
   - Click Collection → IMPORT CSV
   - Select your CSV file
   - Done! ✨

**Happy importing!** 🎉
