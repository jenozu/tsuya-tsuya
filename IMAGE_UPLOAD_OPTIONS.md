# CSV Import with Local Images - Implementation Guide

## Overview

Three approaches for handling images with CSV import, from easiest to most advanced.

---

## ✨ OPTION 1: Supabase Storage + Filenames (RECOMMENDED - Easiest)

### How It Works
1. Bulk upload images to Supabase Storage first
2. CSV references images by filename only
3. System constructs full URL automatically

### Step-by-Step Instructions

#### Step 1: Upload Images to Supabase Storage

**Method A: Via Supabase Dashboard (Small batches)**
1. Go to your Supabase Dashboard
2. Click "Storage" in sidebar
3. Open `product-images` bucket
4. Click "Upload Files"
5. Select all your images
6. Wait for upload to complete

**Method B: Bulk Upload Script (Large batches - BEST)**

Create this script: `scripts/bulk-upload-images.js`

```javascript
// Install dependencies first: npm install dotenv @supabase/supabase-js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function uploadImagesFromFolder(folderPath) {
  const files = fs.readdirSync(folderPath);
  const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  
  console.log(`Found ${imageFiles.length} images to upload...`);
  
  for (const filename of imageFiles) {
    try {
      const filePath = path.join(folderPath, filename);
      const fileBuffer = fs.readFileSync(filePath);
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(`products/${filename}`, fileBuffer, {
          contentType: `image/${path.extname(filename).substring(1)}`,
          upsert: true
        });
      
      if (error) throw error;
      console.log(`✅ Uploaded: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to upload ${filename}:`, error.message);
    }
  }
  
  console.log('Upload complete!');
}

// Usage: node scripts/bulk-upload-images.js
const imagesFolder = path.join(__dirname, '../product-images');
uploadImagesFromFolder(imagesFolder);
```

**Run it:**
```bash
# 1. Put all images in a folder called "product-images" in your project
# 2. Install dependencies
npm install dotenv @supabase/supabase-js

# 3. Run the script
node scripts/bulk-upload-images.js
```

#### Step 2: Update CSV Format

**Your CSV should now use just filenames:**
```csv
name,category,price,stock,imageUrl,description,cost
"Mountain Print","Art Prints",189,50,"mountain-landscape.jpg","Beautiful mountain",85
"Ocean Print","Art Prints",189,45,"ocean-waves.jpg","Dramatic ocean",85
```

#### Step 3: Update CSV Parser to Handle Filenames

I'll create an updated parser that automatically constructs Supabase URLs from filenames.

---

## 🚀 OPTION 2: VPS Directory (If you have a VPS with NGINX/Apache)

### Prerequisites
- VPS with web server (NGINX/Apache)
- SSH access to VPS
- Domain or IP address

### Step 1: Upload Images to VPS
```bash
# On your local machine
scp -r ./product-images/* user@your-vps.com:/var/www/html/images/products/

# Or use FTP client (FileZilla, Cyberduck)
```

### Step 2: Configure Web Server

**NGINX config:**
```nginx
location /images/ {
    alias /var/www/html/images/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Apache config:**
```apache
Alias /images/ /var/www/html/images/
<Directory /var/www/html/images/>
    Options Indexes FollowSymLinks
    AllowOverride None
    Require all granted
</Directory>
```

### Step 3: CSV Format
```csv
name,category,price,stock,imageUrl,description,cost
"Mountain Print","Art Prints",189,50,"https://your-vps.com/images/products/mountain.jpg","Beautiful",85
```

---

## 💻 OPTION 3: Multi-File Upload (CSV + Images Together)

### How It Works
Upload CSV + multiple images in one go. System matches images to products by filename.

### Implementation Required

This requires more complex changes:
1. Multi-file upload UI (drop zone)
2. Match images to CSV rows by filename
3. Upload images to Supabase
4. Create products with uploaded image URLs

**Complexity:** High
**Time to implement:** ~2 hours
**Benefit:** One-step process

Let me know if you want this option and I'll implement it.

---

## 🎯 RECOMMENDED: Option 1 with Enhanced Parser

I'll now implement the enhanced parser that works with filenames!

### What I'll Add:
1. Detect if imageUrl is a filename (no http://)
2. Automatically construct Supabase Storage URL
3. Support both filenames and full URLs
4. Clear error messages

### Your Workflow Will Be:
```
1. Put images in folder → Upload to Supabase (one-time bulk)
2. Create CSV with filenames → Import CSV
3. Done! ✨
```

Shall I implement the enhanced parser now?
