# 🖼️ Local Image Upload - Quick Reference Card

## ⚡ 3-Step Process

### Step 1: Upload Images
```bash
# Add images to product-images/ folder
npm run upload-images
```

### Step 2: Create CSV
```csv
name,category,price,stock,imageUrl
"Product","Category",100,50,"my-image.jpg"
```

### Step 3: Import
```
Admin Panel → Collection → IMPORT CSV → Select file → Done!
```

---

## 📝 CSV Format

### With Local Images (Filename Only)
```csv
name,category,price,stock,imageUrl,description,cost
"Mountain Print","Art",189,50,"mountain.jpg","Beautiful",85
```

### With External URLs (Full URL)
```csv
name,category,price,stock,imageUrl,description,cost
"Ocean Print","Art",189,50,"https://example.com/ocean.jpg","Dramatic",85
```

### Mix Both (Supported!)
```csv
name,category,price,stock,imageUrl,description,cost
"Local","Art",189,50,"mountain.jpg","Local image",85
"External","Art",189,50,"https://cdn.com/img.jpg","External",85
```

---

## 🚀 Commands

```bash
# Upload images to Supabase
npm run upload-images

# Or use full path
node gemini/tsuyanouchi/scripts/bulk-upload-images.js

# Start dev server
npm run dev
```

---

## 📁 File Structure

```
TsuyaNoUchi/
├── product-images/              ← Put images here
│   ├── mountain.jpg
│   └── ocean.jpg
├── gemini/tsuyanouchi/
│   └── scripts/
│       └── bulk-upload-images.js  ← Upload script
└── my-products.csv              ← Your CSV file
```

---

## ✅ Supported Image Formats

- `.jpg` / `.jpeg`
- `.png`
- `.webp`

---

## 🎯 Image Naming Tips

```
✅ Good:
- mountain-landscape.jpg
- ocean-waves-sunset.png
- abstract-art-01.webp

❌ Bad:
- IMG_1234.jpg
- photo (1).jpg
- my image.jpg
- MOUNTAIN.JPG
```

**Rules:**
- Lowercase
- No spaces (use hyphens)
- Descriptive
- Match CSV exactly

---

## 🐛 Quick Troubleshooting

### "Folder not found"
```bash
mkdir product-images
# Add images, then run script again
```

### "No images found"
- Check file extensions (.jpg, .png, .webp)
- Images must be directly in folder (not subfolder)

### Images don't show
- Check filename in CSV matches upload
- Verify Supabase bucket is public
- Test image URL in browser

---

## 📚 Full Documentation

- **Quick Start:** `CSV_IMPORT_WITH_LOCAL_IMAGES.md`
- **All Options:** `IMAGE_UPLOAD_OPTIONS.md`
- **Complete Summary:** `LOCAL_IMAGE_UPLOAD_COMPLETE.md`

---

## 💡 Pro Tip

Upload images ONCE, reuse in multiple CSV imports!

```
Day 1: Upload 100 images
Day 2: Import 20 products (CSV)
Day 3: Import 30 more products (CSV)
Day 4: Import 50 more products (CSV)

No need to re-upload images! 🎉
```

---

## ✨ Status: Ready to Use

**Everything works!** Follow the 3 steps above.

Need help? Read: `CSV_IMPORT_WITH_LOCAL_IMAGES.md`
