# Neon PostgreSQL + Cloudflare R2

Tsuyanouchi uses **Neon PostgreSQL for structured application data** and **Cloudflare R2 for product image files**.

## Neon

1. Create/open the Neon project/database.
2. Run `migrations/002_neon_r2_schema.sql` in the Neon SQL Editor.
3. Add the pooled connection string to Vercel as `DATABASE_URL`.

The application data layer lives in `lib/data.ts` and connects through `lib/db.ts`.

## Cloudflare R2

1. Create/open the R2 bucket `tsuya-tsuya-images`.
2. Enable public access through a custom domain or the public `r2.dev` URL.
3. Create an R2 API token with Object Read & Write access to this bucket.
4. Configure these Vercel variables:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
```

R2 access is implemented in `lib/r2.ts` through the S3-compatible API.

## Admin image uploads

The admin image picker calls `/api/admin/product-images`. The authenticated server route validates JPG, PNG, or WebP input up to 10 MB and uploads the original bytes directly to R2.

New objects use keys like:

```text
products/YYYY-MM-DD/<uuid>.jpg
products/YYYY-MM-DD/<uuid>.png
products/YYYY-MM-DD/<uuid>.webp
```

The returned public URL is saved in the Neon product record. The storefront, product page, cart, and checkout consume that URL.

## Existing repository image folders

Tracked files under `product-images/1`, `product-images/2`, and `product-images/3` can be uploaded directly to R2 with:

```bash
npm run upload-images-1
npm run upload-images-2
npm run upload-images-3
```

Those commands use `scripts/bulk-upload-images.js` and preserve filenames under `products/<folder>/<filename>`.

## Required production variables

The admin/catalogue pipeline requires:

```text
DATABASE_URL
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

Stripe, Resend, Gemini, and preview-gate variables are feature-specific and documented in `ENV_TEMPLATE.md`.

## Verification

Run:

```bash
npm run verify:infra
npx tsc --noEmit
npm run build
```

Then test product CRUD and image upload on the deployed site and confirm both the Neon row and the R2 object are created as expected.
