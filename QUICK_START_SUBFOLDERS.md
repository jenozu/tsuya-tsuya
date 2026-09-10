# ⚡ QUICK START - Upload from Subfolders

## 📁 Your Current Setup

**Location:**
```
C:\Users\andel\Desktop\TsuyaNoUchi\gemini\tsuyanouchi\product-images\
├── 1\    ← Your images here
├── 2\    ← Your images here  
└── 3\    ← Your images here
```

---

## 🚀 Upload Commands (Copy & Paste)

### Step 1: Open PowerShell
Press `Windows Key + R`, type `powershell`, press Enter

### Step 2: Navigate to Project
```powershell
cd C:\Users\andel\Desktop\TsuyaNoUchi\gemini\tsuyanouchi
```

### Step 3: Upload from Your Folder

**From folder 1:**
```powershell
npm run upload-images-1
```

**From folder 2:**
```powershell
npm run upload-images-2
```

**From folder 3:**
```powershell
npm run upload-images-3
```

---

## ✅ What You'll See

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

## 📝 CSV Format

**Your images:**
```
product-images\1\mountain.jpg
product-images\1\ocean.jpg
```

**Your CSV (use JUST the filename):**
```csv
name,category,price,stock,imageUrl
"Mountain","Art",189,50,"mountain.jpg"
"Ocean","Art",189,45,"ocean.jpg"
```

✅ **Correct:** `"mountain.jpg"`  
❌ **Wrong:** `"1/mountain.jpg"` or `"1\mountain.jpg"`

---

## 🎯 Complete Example

```powershell
# 1. Navigate to project
cd C:\Users\andel\Desktop\TsuyaNoUchi\gemini\tsuyanouchi

# 2. Upload images from folder 1
npm run upload-images-1

# 3. Start dev server (for testing/importing)
npm run dev

# 4. Open browser
# http://localhost:3000/admin/login

# 5. Click Collection → IMPORT CSV

# 6. Done! ✨
```

---

## 💡 Pro Tips

### Upload Multiple Folders
```powershell
npm run upload-images-1
npm run upload-images-2
npm run upload-images-3
```

All images from all folders go to the same Supabase Storage!

### Check What Folders Exist
```powershell
dir product-images
```

Should show: `1`, `2`, `3`

### Check What Images Are in Folder 1
```powershell
dir product-images\1
```

---

## 🆘 Quick Troubleshooting

**Error: "Folder not found"**
```powershell
# Check folders exist
dir product-images

# Should show: 1, 2, 3
```

**Error: "No image files found"**
```powershell
# Check images in folder
dir product-images\1

# Should show: *.jpg, *.png, *.webp
```

**Error: "Missing Supabase credentials"**
- Check `.env.local` exists
- Should have `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

---

## 📚 Full Documentation

- **SUBFOLDER_UPLOAD_GUIDE.md** - Complete subfolder guide
- **SIMPLE_UPLOAD_GUIDE.md** - General upload guide  
- **CSV_IMPORT_WITH_LOCAL_IMAGES.md** - Full CSV import guide

---

## ✨ That's It!

**3 simple steps:**
1. `cd C:\Users\andel\Desktop\TsuyaNoUchi\gemini\tsuyanouchi`
2. `npm run upload-images-1` (or 2, or 3)
3. Create CSV with filenames → Import

**Ready to upload!** 🚀
