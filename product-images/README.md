# Product Images Folder

## 📸 Purpose

This folder is used to **bulk upload product images** to Supabase Storage.

**Current structure:**
```
product-images/
├── 1/    ← Your images here
├── 2/    ← Your images here
└── 3/    ← Your images here
```

---

## 📋 Instructions

### 1. Add Your Images to Subfolders

Place your product images in one of the subfolders (1, 2, or 3):

```
product-images/
├── 1/
│   ├── mountain-landscape.jpg
│   ├── ocean-waves.jpg
│   └── ...
├── 2/
│   ├── forest-path.png
│   └── ...
└── 3/
    ├── desert-dunes.jpg
    └── ...
```

### 2. Run the Bulk Upload Script

From `gemini/tsuyanouchi/`, run:

```bash
# Upload from folder "1"
npm run upload-images-1

# Upload from folder "2"
npm run upload-images-2

# Upload from folder "3"
npm run upload-images-3
```

### 3. Create Your CSV

Use just the filenames (no folder paths):

```csv
name,category,price,stock,imageUrl,description,cost
"Mountain Print","Art Prints",189,50,"mountain-landscape.jpg","Beautiful",85
"Ocean Print","Art Prints",189,45,"ocean-waves.jpg","Dramatic",85
```

### 4. Import via Admin Panel

1. Login to admin: `http://localhost:3000/admin/login`
2. Click "Collection" → "IMPORT CSV"
3. Select your CSV file
4. Done! ✨

---

## ✅ Supported Formats

- `.jpg` / `.jpeg`
- `.png`
- `.webp`

---

## 💡 Tips

- **Name clearly:** Use descriptive names like `mountain-landscape.jpg` not `IMG_1234.jpg`
- **No spaces:** Use hyphens instead: `ocean-waves.jpg` not `ocean waves.jpg`
- **Lowercase:** `mountain.jpg` not `MOUNTAIN.JPG`
- **Unique names:** If same filename exists in multiple folders, the last upload will overwrite!

---

## 📚 More Help

- **Quick Guide:** `SUBFOLDER_UPLOAD_GUIDE.md`
- **Complete Guide:** `CSV_IMPORT_WITH_LOCAL_IMAGES.md`
