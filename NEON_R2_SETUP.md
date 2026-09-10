# Neon + Cloudflare R2 setup

Tsuyanouchi now uses **Neon PostgreSQL for structured data** and **Cloudflare R2 for product image files**. The production application has no Supabase SDK/runtime dependency.

## 1. Neon
1. Create a Neon project/database.
2. Open Neon's SQL Editor and run `migrations/002_neon_r2_schema.sql`.
3. Copy the pooled PostgreSQL connection string into Vercel as `DATABASE_URL`.

## 2. Cloudflare R2
1. Create an R2 bucket (recommended name: `tsuya-tsuya-images`).
2. Enable public access through an R2 custom domain or the development `r2.dev` public URL.
3. Create an R2 API token with Object Read & Write access to this bucket.
4. Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL` to Vercel.

Uploaded admin images are automatically rotated, resized to fit within 2400×2400 without enlargement, converted to WebP at quality 84, and stored under `products/YYYY-MM-DD/<uuid>.webp`. Neon stores only the resulting URL/string metadata.

## 3. Existing data
Before removing the old service, temporarily add `LEGACY_SUPABASE_URL` and `LEGACY_SUPABASE_SERVICE_ROLE_KEY` to a local `.env.local`, then run:

```bash
node scripts/migrate-supabase-to-neon.mjs
```

The migration copies products, orders, shipping rates, and waitlist entries into Neon. Supabase-hosted, legacy base64, and local product images are copied/optimized into R2 and product image URLs are rewritten. External non-Supabase image URLs are left unchanged.

After validating the new site, delete the two `LEGACY_SUPABASE_*` values. They are not used by the application itself.

## 4. Existing repository image folders
If you want to upload the tracked `product-images/1`, `2`, or `3` folders directly while retaining filenames:

```bash
npm run upload-images-1
npm run upload-images-2
npm run upload-images-3
```

## Required Vercel production variables
`DATABASE_URL`, all five `R2_*` variables, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` are required for the admin/catalogue pipeline. Stripe/Resend/Gemini variables remain feature-specific.
