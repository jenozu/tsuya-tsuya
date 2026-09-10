# 📸 Detailed Image Upload Instructions - Production Ready

## 🎯 Important Clarification

**Supabase Storage = Cloud Storage (Like AWS S3 or Google Cloud)**

When you upload images using the script:
- ✅ Images go to **Supabase's cloud servers** (NOT your local computer)
- ✅ Images are **publicly accessible via URLs** (like a CDN)
- ✅ Works in **BOTH development AND production**
- ✅ Images stay there **permanently** until you delete them

Think of it like uploading to Google Drive or Dropbox, but optimized for websites.

---

## 🚀 Step-by-Step Upload Instructions

### Step 1: Verify Your Setup

**1.1 Check your product-images folder**

Open a terminal and run:
```powershell
# Check if folder exists and see what's inside
dir product-images
```

**Expected output:**
```
Directory: C:\Users\andel\Desktop\TsuyaNoUchi\product-images

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        2/16/2026   2:30 PM         245823 mountain-landscape.jpg
-a----        2/16/2026   2:30 PM         312456 ocean-waves.jpg
-a----        2/16/2026   2:30 PM         198234 forest-path.png
```

If you see your images listed, you're good! ✅

---

**1.2 Verify Supabase credentials**

```powershell
# Navigate to your project
cd C:\Users\andel\Desktop\TsuyaNoUchi\gemini\tsuyanouchi

# Check if .env.local exists
dir .env.local
```

**Your .env.local should have:**
```
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ[your-service-role-key]
```

If missing, create it:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Settings** → **API**
4. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
5. Copy **service_role key** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

---

### Step 2: Run the Upload Command

**2.1 Open PowerShell/Terminal in your project**

```powershell
# Navigate to the tsuyanouchi folder
cd C:\Users\andel\Desktop\TsuyaNoUchi\gemini\tsuyanouchi
```

**2.2 Run the upload script**

**Option A: Using npm script (Recommended)**
```powershell
npm run upload-images
```

**Option B: Direct node command**
```powershell
node scripts/bulk-upload-images.js
```

---

**2.3 What you'll see**

**If successful:**
```
🚀 Found 10 images to upload

============================================================
✅ Uploaded: mountain-landscape.jpg (245.32 KB)
✅ Uploaded: ocean-waves.jpg (312.15 KB)
✅ Uploaded: forest-path.png (198.45 KB)
✅ Uploaded: desert-dunes.jpg (287.67 KB)
✅ Uploaded: japanese-garden.jpg (356.89 KB)
✅ Uploaded: cherry-blossom.jpg (298.34 KB)
✅ Uploaded: bamboo-forest.jpg (423.12 KB)
✅ Uploaded: architecture.jpg (189.45 KB)
✅ Uploaded: abstract-ink.jpg (156.78 KB)
✅ Uploaded: zen-stones.jpg (234.56 KB)
============================================================

📊 Upload Summary:
   ✅ Uploaded: 10
   ⚠️  Skipped: 0 (already existed)
   ❌ Failed: 0

✨ Done! Your images are now in Supabase Storage.

📝 Next Steps:
   1. Create your CSV with these filenames in the imageUrl column
   2. Import CSV via admin panel
   3. Products will automatically use these images!
```

**If there's an error:**
```
❌ Error: Missing Supabase credentials in .env.local
Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```
→ Go back to Step 1.2 and fix credentials

---

### Step 3: Verify Images in Supabase (Production Storage)

**3.1 Login to Supabase Dashboard**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in left sidebar

**3.2 Navigate to product-images bucket**
1. Click on `product-images` bucket
2. Click on `products/` folder
3. You should see all your uploaded images!

**3.3 Test a public URL**

Click any image → Copy the public URL

**Example URL:**
```
https://abcdefghijk.supabase.co/storage/v1/object/public/product-images/products/mountain-landscape.jpg
```

**Test it:**
- Open this URL in your browser
- Your image should appear! ✅
- **This URL works from ANYWHERE in the world** (dev, production, mobile, etc.)

---

### Step 4: Create Your CSV

Now create a CSV file with just the **filenames** (not full URLs):

**my-products.csv:**
```csv
name,category,price,stock,imageUrl,description,cost
"Mountain Landscape","Art Prints",189,50,"mountain-landscape.jpg","Stunning mountain view",85
"Ocean Waves","Art Prints",189,45,"ocean-waves.jpg","Dramatic ocean scene",85
"Forest Path","Art Prints",189,40,"forest-path.png","Serene forest walk",85
```

**Important:** Use exact filenames that you uploaded!

---

### Step 5: Import via Admin Panel

**5.1 Start your dev server (for testing locally)**
```powershell
npm run dev
```

**5.2 Login to admin**
- Open browser: http://localhost:3000/admin/login
- Enter your admin credentials

**5.3 Import CSV**
1. Click **Collection** in sidebar
2. Click **IMPORT CSV** button (top right)
3. Select your `my-products.csv` file
4. Wait for success message: "Successfully imported X items"

**5.4 Verify**
- Products appear in Collection Archive
- Images show correctly
- Click any product to see all 8 size variations

---

## 🌐 Production Deployment

### Your Images Are Already Production-Ready!

Once uploaded to Supabase Storage, images work everywhere:

| Environment | Image URL | Works? |
|-------------|-----------|--------|
| Local Dev (`npm run dev`) | `https://[project].supabase.co/...` | ✅ YES |
| Production (Vercel/Netlify) | `https://[project].supabase.co/...` | ✅ YES |
| Mobile Browser | `https://[project].supabase.co/...` | ✅ YES |
| Anywhere in World | `https://[project].supabase.co/...` | ✅ YES |

**Why?** Because Supabase Storage is a **CDN (Content Delivery Network)** - just like hosting images on AWS S3 or Cloudflare.

---

### When You Deploy to Production

**Example: Deploying to Vercel**

1. **Push code to GitHub**
   ```powershell
   git add .
   git commit -m "Add CSV import with local images"
   git push
   ```

2. **Deploy on Vercel**
   - Connect GitHub repo
   - Add same `.env.local` variables
   - Deploy

3. **Images automatically work!**
   - Your CSV import uses filenames: `mountain.jpg`
   - System converts to: `https://[project].supabase.co/storage/.../mountain.jpg`
   - This URL works in production ✅

**No additional steps needed!** Images are already in the cloud.

---

## 🔄 Workflow Diagram

```
┌─────────────────────────────────────────────────────┐
│  YOUR COMPUTER                                      │
│                                                     │
│  product-images/                                    │
│  ├── mountain.jpg                                   │
│  └── ocean.jpg                                      │
│                                                     │
│  [Run: npm run upload-images]                      │
│                                                     │
└──────────────┬──────────────────────────────────────┘
               │
               │ Upload via Supabase API
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  SUPABASE CLOUD STORAGE (Production)                │
│  https://[project].supabase.co/storage/...          │
│                                                     │
│  product-images bucket                              │
│  └── products/                                      │
│      ├── mountain.jpg ← STORED IN CLOUD            │
│      └── ocean.jpg    ← STORED IN CLOUD            │
│                                                     │
│  ✅ Accessible 24/7 from anywhere                   │
│  ✅ Global CDN (fast worldwide)                     │
│  ✅ Works in dev AND production                     │
└─────────────────────────────────────────────────────┘
               ▲
               │
               │ Images loaded from Supabase
               │
┌──────────────┴──────────────────────────────────────┐
│  YOUR WEBSITE                                       │
│                                                     │
│  Development:    http://localhost:3000              │
│  Production:     https://yoursite.com               │
│                                                     │
│  Both fetch images from same Supabase URLs ✅       │
└─────────────────────────────────────────────────────┘
```

---

## ❓ Common Questions

### Q: Do I need to upload images again when deploying to production?
**A:** NO! Images are already in Supabase cloud. They work everywhere.

### Q: What's the difference between `npm run dev` and image storage?
**A:**
- `npm run dev` = Runs your website locally for testing (your computer)
- Supabase Storage = Stores images in the cloud (Supabase's servers)
- They're separate! Images are in cloud, not tied to dev/production

### Q: How much does Supabase Storage cost?
**A:**
- **Free tier:** 1GB storage + 2GB bandwidth/month
- **Paid:** $25/month for 100GB storage + 200GB bandwidth
- For small/medium stores: Free tier is plenty!

### Q: Can I add more images later?
**A:** YES!
1. Add new images to `product-images/` folder
2. Run `npm run upload-images` again
3. Create new CSV with new filenames
4. Import via admin panel

### Q: What if I need to update an image?
**A:**
1. Replace the file in `product-images/` folder (same filename)
2. Run `npm run upload-images` (it overwrites)
3. Image automatically updates everywhere (might take 5-10 min for cache)

### Q: Can I organize images in subfolders?
**A:** Not with current script. But you can modify it! Or name images descriptively:
```
category-product-variant.jpg
prints-mountain-landscape.jpg
prints-ocean-waves.jpg
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'dotenv'"

**Solution:**
```powershell
# Install dependencies
npm install
```

### Error: "Folder not found"

**Solution:**
```powershell
# Make sure you're in the right directory
cd C:\Users\andel\Desktop\TsuyaNoUchi\gemini\tsuyanouchi

# Create folder if missing
mkdir ../../product-images

# Verify folder exists
dir ../../product-images
```

### Error: "Missing Supabase credentials"

**Solution:**
1. Create `.env.local` in `gemini/tsuyanouchi/` folder
2. Add Supabase credentials (see Step 1.2)
3. Restart the upload command

### Images uploaded but don't show on website

**Check:**
1. Is `product-images` bucket public?
   - Supabase Dashboard → Storage → product-images → Settings
   - Set to "Public bucket" ✅

2. Did you use exact filename in CSV?
   ```csv
   Uploaded: mountain-landscape.jpg
   CSV: "mountain-landscape.jpg"  ✅ Match!
   ```

3. Check browser console (F12) for 404 errors

---

## ✅ Success Checklist

- [ ] Created `product-images/` folder in project root
- [ ] Added images to folder
- [ ] Verified `.env.local` has Supabase credentials
- [ ] Ran `npm run upload-images` successfully
- [ ] Verified images in Supabase Dashboard → Storage
- [ ] Tested a public URL in browser (image loads)
- [ ] Created CSV with exact filenames
- [ ] Started dev server (`npm run dev`)
- [ ] Logged into admin panel
- [ ] Imported CSV successfully
- [ ] Products show with images ✅

---

## 🎉 You're Done!

Your images are now:
- ✅ Stored in Supabase Cloud (production-ready)
- ✅ Accessible via public URLs
- ✅ Work in development AND production
- ✅ Fast (global CDN)
- ✅ Secure and reliable

**No additional steps needed for production!** 🚀

When you deploy your site to Vercel/Netlify/etc., the images will automatically work because they're already in the cloud.
