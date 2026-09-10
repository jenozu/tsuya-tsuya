# 🖼️ CSV Import with Your Own Images - Quick Start

## ✨ EASIEST METHOD: Supabase Storage + Filenames

This guide shows you how to import products using your own images (no external URLs needed).

---

## 📋 Overview

**What You'll Do:**
1. Upload your images to Supabase Storage (one-time bulk upload)
2. Create CSV with just filenames
3. Import CSV via admin panel
4. Done! Products use your uploaded images

**Time Required:** ~10 minutes for first setup

---

## 🚀 Step-by-Step Instructions

### Step 1: Prepare Your Images

1. **Create a folder** in your project root called `product-images`
2. **Add all your product images** to this folder
3. **Name them clearly** (e.g., `mountain-landscape.jpg`, `ocean-waves.png`)

**Example folder structure:**
```
TsuyaNoUchi/
├── product-images/           ← Create this folder
│   ├── mountain-landscape.jpg
│   ├── ocean-waves.jpg
│   ├── forest-path.png
│   └── ...
├── gemini/
├── package.json
└── ...
```

**✅ Supported formats:** `.jpg`, `.jpeg`, `.png`, `.webp`

---

### Step 2: Bulk Upload Images to Supabase

**Option A: Using the Upload Script (RECOMMENDED)**

Open your terminal and run:

```bash
# 1. Install dependencies (one-time only)
npm install

# 2. Run the bulk upload script
node gemini/tsuyanouchi/scripts/bulk-upload-images.js
```

**What happens:**
- Script finds all images in `product-images/` folder
- Uploads them to your Supabase Storage bucket
- Shows progress with ✅ success messages
- Gives you a summary at the end

**Example output:**
```
🚀 Found 10 images to upload

============================================================
✅ Uploaded: mountain-landscape.jpg (245.32 KB)
✅ Uploaded: ocean-waves.jpg (312.15 KB)
✅ Uploaded: forest-path.png (198.45 KB)
...
============================================================

📊 Upload Summary:
   ✅ Uploaded: 10
   ⚠️  Skipped: 0 (already existed)
   ❌ Failed: 0

✨ Done! Your images are now in Supabase Storage.
```

**Option B: Manual Upload via Supabase Dashboard**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Storage** in left sidebar
4. Open `product-images` bucket
5. Click **Upload Files**
6. Select all images from your `product-images/` folder
7. Wait for upload to complete

---

### Step 3: Create Your CSV

**Create a CSV file with filenames only:**

```csv
name,category,price,stock,imageUrl,description,cost
"Mountain Print","Art Prints",189,50,"mountain-landscape.jpg","Beautiful mountain",85
"Ocean Print","Art Prints",189,45,"ocean-waves.jpg","Dramatic ocean",85
"Forest Print","Art Prints",189,40,"forest-path.png","Serene forest",85
```

**Key Points:**
- **imageUrl column:** Just the filename (e.g., `mountain-landscape.jpg`)
- **No full URLs needed** - system constructs them automatically
- **Case-sensitive** - match exact filenames you uploaded

**Example CSV:** See `example-import-with-filenames.csv` in your project

---

### Step 4: Import CSV

1. **Start your dev server**
   ```bash
   npm run dev
   ```

2. **Login to admin panel**
   - Navigate to: `http://localhost:3000/admin/login`

3. **Import your CSV**
   - Click **"Collection"** in sidebar
   - Click **"IMPORT CSV"** button
   - Select your CSV file
   - Wait for success message ✨

4. **Done!** Your products now show with your uploaded images

---

## 🎯 Quick Reference

### CSV Format (with filenames)
```csv
name,category,price,stock,imageUrl,description,cost
"Product Name","Category",189,50,"my-image.jpg","Description",85
```

### Upload Script Location
```
gemini/tsuyanouchi/scripts/bulk-upload-images.js
```

### Where Images Go
```
Supabase Storage → product-images bucket → products/ folder
```

### CSV Image Column
```
Just filename: "mountain.jpg"
NOT full URL: "https://..."
```

---

## 💡 Pro Tips

### Tip 1: Batch Upload Multiple Times
You can run the upload script multiple times. It will:
- Skip images that already exist
- Only upload new images
- Overwrite existing images if you want (uses `upsert: true`)

### Tip 2: Image Naming Best Practices
```
✅ Good: mountain-landscape.jpg, ocean-waves-01.png
❌ Bad: IMG_1234.jpg, photo (1).jpg, my image.jpg
```
- Use lowercase
- Use hyphens (not spaces)
- Be descriptive
- Avoid special characters

### Tip 3: Check Images in Supabase
**Via Dashboard:**
1. Go to Supabase Dashboard → Storage → product-images
2. Navigate to `products/` folder
3. See all uploaded images with public URLs

### Tip 4: Mix Filenames and Full URLs
The system supports BOTH:
```csv
"Product 1","Category",189,50,"my-local-image.jpg","Description",85
"Product 2","Category",189,50,"https://example.com/image.jpg","Description",85
```

---

## 🐛 Troubleshooting

### Problem: "Folder not found" error

**Solution:**
```bash
# Create the folder
mkdir product-images

# Add some images to it
# Then run script again
```

### Problem: "No image files found"

**Solution:**
- Check file extensions (must be .jpg, .jpeg, .png, or .webp)
- Make sure images are directly in `product-images/` folder (not in a subfolder)

### Problem: Upload script fails with Supabase error

**Solution:**
1. Check `.env.local` has:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Verify `product-images` bucket exists in Supabase
3. Check bucket is public (Storage → product-images → Settings)

### Problem: CSV import says "invalid image URL"

**Solution:**
- Make sure filename in CSV matches uploaded filename exactly
- Check file extension is included (e.g., `.jpg`)
- Verify image was uploaded successfully to Supabase

### Problem: Images don't show on website

**Solution:**
1. Open browser DevTools (F12)
2. Check Console for 404 errors
3. Verify image URL format:
   - Should be: `https://[project].supabase.co/storage/v1/object/public/product-images/products/[filename]`
4. Test URL directly in browser
5. Check Supabase Storage bucket is public

---

## 📊 Workflow Summary

```
┌─────────────────────┐
│  1. Prepare Images  │ ← Put images in product-images/ folder
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  2. Bulk Upload     │ ← Run: node scripts/bulk-upload-images.js
│     to Supabase     │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  3. Create CSV      │ ← Use filenames in imageUrl column
│     with Filenames  │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  4. Import CSV      │ ← Via admin panel "IMPORT CSV" button
│     via Admin       │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  5. Done! ✨        │ ← Products show with your images
└─────────────────────┘
```

---

## 🎉 Next Steps

After successful import:
1. **Verify products** in admin Collection Archive
2. **Check images** display correctly
3. **Edit variations** if needed (prices, costs)
4. **Publish to shop** for customers to see

---

## 📚 Related Documentation

- **Full CSV Import Guide:** `CSV_IMPORT_DOCUMENTATION.md`
- **Example CSV with Filenames:** `example-import-with-filenames.csv`
- **Example CSV with URLs:** `example-import.csv`
- **Upload Script:** `scripts/bulk-upload-images.js`

---

## ✅ Checklist

Before importing:
- [ ] Images in `product-images/` folder
- [ ] Upload script executed successfully
- [ ] CSV created with correct filenames
- [ ] Dev server running (`npm run dev`)
- [ ] Logged into admin panel

Ready to import! 🚀
