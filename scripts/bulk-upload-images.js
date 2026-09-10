#!/usr/bin/env node

try { process.loadEnvFile?.('.env.local') } catch {}
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const fs = require('fs')
const path = require('path')

const subfolder = process.argv[2]
const baseFolder = path.join(__dirname, '../product-images')
const imagesFolder = subfolder ? path.join(baseFolder, subfolder) : baseFolder
const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing ${name} in .env.local`)
    process.exit(1)
  }
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
})

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

async function run() {
  if (!fs.existsSync(imagesFolder)) throw new Error(`Folder not found: ${imagesFolder}`)
  const files = fs.readdirSync(imagesFolder).filter(name => MIME[path.extname(name).toLowerCase()])
  if (!files.length) throw new Error(`No JPG, PNG, or WebP files found in ${imagesFolder}`)

  let uploaded = 0
  for (const filename of files) {
    const ext = path.extname(filename).toLowerCase()
    const relative = subfolder ? `${subfolder}/${filename}` : filename
    const key = `products/${relative.replace(/\\/g, '/')}`
    const body = fs.readFileSync(path.join(imagesFolder, filename))
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: MIME[ext],
      CacheControl: 'public, max-age=31536000, immutable',
    }))
    uploaded += 1
    const publicUrl = `${process.env.R2_PUBLIC_URL.replace(/\/+$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`
    console.log(`Uploaded ${filename} -> ${publicUrl}`)
  }
  console.log(`Done. Uploaded ${uploaded} image(s) to Cloudflare R2.`)
}

run().catch(error => { console.error(error); process.exit(1) })
