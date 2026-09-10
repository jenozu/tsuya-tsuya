#!/usr/bin/env node

/**
 * Bulk Image Upload Script for Supabase Storage
 * 
 * Usage:
 * 1. Place all product images in a folder (e.g., ./product-images/)
 * 2. Run: node scripts/bulk-upload-images.js [subfolder]
 * 3. Images will be uploaded to Supabase Storage bucket 'product-images'
 * 4. Use the filenames in your CSV (e.g., "mountain.jpg")
 * 
 * Examples:
 * - Upload from root:           node scripts/bulk-upload-images.js
 * - Upload from subfolder "1":  node scripts/bulk-upload-images.js 1
 * - Upload from subfolder "2":  node scripts/bulk-upload-images.js 2
 * - Upload from subfolder "3":  node scripts/bulk-upload-images.js 3
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get subfolder from command line argument (e.g., "1", "2", "3")
const subfolder = process.argv[2];

// Configuration
const BASE_FOLDER = path.join(__dirname, '../product-images');
const IMAGES_FOLDER = subfolder 
  ? path.join(BASE_FOLDER, subfolder)
  : BASE_FOLDER;
const SUPABASE_FOLDER = 'products'; // Folder within the bucket

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Upload all images from a folder to Supabase Storage
 */
async function uploadImagesFromFolder(folderPath) {
  // Check if folder exists
  if (!fs.existsSync(folderPath)) {
    console.error(`❌ Error: Folder not found: ${folderPath}`);
    console.log('\n📝 Available folders:');
    const baseFolder = path.join(__dirname, '../product-images');
    if (fs.existsSync(baseFolder)) {
      const folders = fs.readdirSync(baseFolder, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      if (folders.length > 0) {
        console.log(`   ${folders.join(', ')}`);
        console.log('\n💡 Usage:');
        console.log('   node scripts/bulk-upload-images.js       (upload from root)');
        folders.forEach(f => {
          console.log(`   node scripts/bulk-upload-images.js ${f}    (upload from subfolder "${f}")`);
        });
      } else {
        console.log('   No subfolders found in product-images/');
        console.log('   Create a folder and add images there.');
      }
    } else {
      console.log('   Create a folder called "product-images" in your project root');
    }
    process.exit(1);
  }

  // Read all files
  const files = fs.readdirSync(folderPath);
  const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  
  if (imageFiles.length === 0) {
    console.error('❌ No image files found in folder');
    console.log(`   Looking in: ${folderPath}`);
    console.log('   Supported formats: .jpg, .jpeg, .png, .webp');
    process.exit(1);
  }

  const folderName = subfolder || 'root';
  console.log(`\n🚀 Found ${imageFiles.length} images to upload from "${folderName}"\n`);
  console.log('=' .repeat(60));
  
  let uploaded = 0;
  let failed = 0;
  let skipped = 0;

  for (const filename of imageFiles) {
    try {
      const filePath = path.join(folderPath, filename);
      const fileBuffer = fs.readFileSync(filePath);
      const fileSize = (fileBuffer.length / 1024).toFixed(2);
      
      // Upload to Supabase Storage
      const storagePath = `${SUPABASE_FOLDER}/${filename}`;
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(storagePath, fileBuffer, {
          contentType: `image/${path.extname(filename).substring(1)}`,
          upsert: true, // Overwrite if exists
          cacheControl: '3600'
        });
      
      if (error) {
        // Check if file already exists
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Skipped: ${filename} (already exists)`);
          skipped++;
        } else {
          throw error;
        }
      } else {
        console.log(`✅ Uploaded: ${filename} (${fileSize} KB)`);
        uploaded++;
      }
      
    } catch (error) {
      console.error(`❌ Failed: ${filename} - ${error.message}`);
      failed++;
    }
  }
  
  console.log('=' .repeat(60));
  console.log(`\n📊 Upload Summary:`);
  console.log(`   ✅ Uploaded: ${uploaded}`);
  console.log(`   ⚠️  Skipped: ${skipped} (already existed)`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`\n✨ Done! Your images are now in Supabase Storage.`);
  console.log(`\n📝 Next Steps:`);
  console.log(`   1. Create your CSV with these filenames in the imageUrl column`);
  console.log(`   2. Import CSV via admin panel`);
  console.log(`   3. Products will automatically use these images!\n`);
}

// Run the upload
uploadImagesFromFolder(IMAGES_FOLDER);
