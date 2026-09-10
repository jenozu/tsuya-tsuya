# 📁 Uploading Images from Subfolders

## 🎯 Your Folder Structure

```
gemini/tsuyanouchi/
└── product-images/
    ├── 1/
    │   ├── image1.jpg
    │   ├── image2.jpg
    │   └── ...
    ├── 2/
    │   ├── image3.jpg
    │   ├── image4.jpg
    │   └── ...
    └── 3/
        ├── image5.jpg
        ├── image6.jpg
        └── ...
```

**Full path example:**
```
C:\Users\andel\Desktop\TsuyaNoUchi\gemini\tsuyanouchi\product-images\1\image1.jpg
```

---

## 🚀 How to Upload from Each Subfolder

### Option A: Using npm Commands (Easiest)

Open PowerShell in your project:
```powershell
cd C:\Users\andel\Desktop\TsuyaNoUchi\gemini\tsuyanouchi
```

**Upload from folder "1":**
```powershell
npm run upload-images-1
```

**Upload from folder "2":**
```powershell
npm run upload-images-2
```

**Upload from folder "3":**
```powershell
npm run upload-images-3
```

---

### Option B: Using node Command (More Flexible)

```powershell
# Upload from folder "1"
node scripts/bulk-upload-images.js 1

# Upload from folder "2"
node scripts/bulk-upload-images.js 2

# Upload from folder "3"
node scripts/bulk-upload-images.js 3

# Upload from root (if you have images directly in product-images/)
node scripts/bulk-upload-images.js
```

---

## 📊 Example Workflow

Let's say you want to upload images from folder "1":

```powershell
# Navigate to project
cd C:\Users\andel\Desktop\TsuyaNoUchi\gemini\tsuyanouchi

# Upload from subfolder "1"
npm run upload-images-1
```

**Output:**
```
🚀 Found 15 images to upload from "1"

============================================================
✅ Uploaded: image1.jpg (245.32 KB)
✅ Uploaded: image2.jpg (312.15 KB)
✅ Uploaded: image3.jpg (198.45 KB)
...
============================================================

📊 Upload Summary:
   ✅ Uploaded: 15
   ⚠️  Skipped: 0
   ❌ Failed: 0

✨ Done! Your images are now in Supabase Storage.
```

---

## 📝 Creating Your CSV

**Important:** Use just the filename (not the subfolder path)!

**Your folder structure:**
```
gemini/tsuyanouchi/product-images/
└── 1/
    ├── mountain.jpg
    └── ocean.jpg
```

**Your CSV:**
```csv
name,category,price,stock,imageUrl
"Mountain","Art",189,50,"mountain.jpg"
"Ocean","Art",189,45,"ocean.jpg"
```

**✅ Correct:** Just `"mountain.jpg"`  
**❌ Wrong:** `"1/mountain.jpg"` (don't include folder path)

---

## 🔄 Uploading Multiple Folders

If you want to upload images from all 3 folders:

```powershell
# Upload folder 1
npm run upload-images-1

# Upload folder 2
npm run upload-images-2

# Upload folder 3
npm run upload-images-3
```

All images will go to the same Supabase Storage location and can be used in your CSV.

---

## 💡 Use Cases

### Use Case 1: Collections by Folder
```
gemini/tsuyanouchi/product-images/
├── 1/   ← Spring collection
├── 2/   ← Summer collection
└── 3/   ← Fall collection
```

**Workflow:**
1. Upload folder 1: `npm run upload-images-1`
2. Create CSV for spring products
3. Import spring products
4. Later: Upload folder 2, import summer products
5. Etc.

### Use Case 2: Product Categories
```
gemini/tsuyanouchi/product-images/
├── 1/   ← Art Prints
├── 2/   ← Posters
└── 3/   ← Canvas
```

### Use Case 3: Testing vs Production
```
gemini/tsuyanouchi/product-images/
├── 1/   ← Test images (low quality)
├── 2/   ← Production images (high quality)
└── 3/   ← Backups
```

---

## 🎯 Quick Reference

| Command | Uploads From |
|---------|--------------|
| `npm run upload-images` | `product-images/` (root only) |
| `npm run upload-images-1` | `product-images/1/` |
| `npm run upload-images-2` | `product-images/2/` |
| `npm run upload-images-3` | `product-images/3/` |

---

## 🆘 Troubleshooting

### Error: "Folder not found"

The script will show you available folders:
```
❌ Error: Folder not found

📝 Available folders:
   1, 2, 3

💡 Usage:
   node scripts/bulk-upload-images.js       (upload from root)
   node scripts/bulk-upload-images.js 1    (upload from subfolder "1")
   node scripts/bulk-upload-images.js 2    (upload from subfolder "2")
   node scripts/bulk-upload-images.js 3    (upload from subfolder "3")
```

### Images uploaded but duplicate filenames?

If you have the same filename in multiple folders:
```
gemini/tsuyanouchi/product-images/
├── 1/mountain.jpg
└── 2/mountain.jpg  ← Same name!
```

**When you upload both, the second one will overwrite the first!**

**Solution:** Rename files to be unique:
```
gemini/tsuyanouchi/product-images/
├── 1/mountain-spring.jpg
└── 2/mountain-summer.jpg
```

---

## ✅ Step-by-Step Example

**Goal:** Upload images from folder "1" and import them

**Step 1: Navigate to project**
```powershell
cd C:\Users\andel\Desktop\TsuyaNoUchi\gemini\tsuyanouchi
```

**Step 2: Upload images from folder 1**
```powershell
npm run upload-images-1
```

**Step 3: Create CSV with filenames**
```csv
name,category,price,stock,imageUrl,description,cost
"Mountain","Art",189,50,"mountain.jpg","Beautiful",85
"Ocean","Art",189,45,"ocean.jpg","Dramatic",85
```

**Step 4: Import via admin**
```powershell
npm run dev
```
- Go to: http://localhost:3000/admin/login
- Click Collection → IMPORT CSV
- Select your CSV
- Done! ✨

---

## 🎉 Summary

**Upload from specific folder:**
```powershell
npm run upload-images-1   # for folder "1"
npm run upload-images-2   # for folder "2"
npm run upload-images-3   # for folder "3"
```

**CSV uses just filenames:**
```csv
"mountain.jpg"  ✅
```

**Not folder paths:**
```csv
"1/mountain.jpg"  ❌
```

**Ready to upload!** 🚀
