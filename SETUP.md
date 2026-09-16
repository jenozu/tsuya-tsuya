# Tsuyanouchi Setup Guide

This guide configures the current Tsuyanouchi stack: Vercel + Next.js, Neon PostgreSQL, Cloudflare R2, Stripe, Resend, and Gemini.

## 1. Install dependencies

Requirements: Node.js 20+ and npm.

```bash
npm install
```

## 2. Configure Neon PostgreSQL

1. Create/open the Neon project and database.
2. Open the Neon SQL Editor.
3. Run `migrations/002_neon_r2_schema.sql`.
4. Copy the pooled PostgreSQL connection string into `DATABASE_URL` locally and in Vercel.

Neon stores products, orders, shipping rates, favourites, waitlist signups, and image URL metadata. Image files are not stored in PostgreSQL.

## 3. Configure Cloudflare R2

1. Create/open the R2 bucket. The production bucket is `tsuya-tsuya-images`.
2. Enable public access through an R2 custom domain or the public `r2.dev` URL.
3. Create an R2 API token with Object Read & Write access to the bucket.
4. Configure:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
```

`R2_PUBLIC_URL` must be the public base URL browsers can use to display objects and should not end with `/`.

Admin product-image uploads accept JPG, PNG, and WebP files up to 10 MB. The server uploads the validated original bytes directly to R2 under `products/YYYY-MM-DD/<uuid>.<ext>` and stores only the returned public URL with the Neon product record.

## 4. Configure admin access

```text
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

Use a long random value for `ADMIN_SESSION_SECRET`. Admin sessions are signed server-side and product mutations/imports/image uploads require a valid admin session.

## 5. Configure Stripe

```text
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

Production webhook endpoint:

```text
https://tsuyanouchi.com/api/webhooks/stripe
```

## 6. Configure Resend

```text
RESEND_API_KEY
ORDER_NOTIFICATION_EMAIL
RESEND_FROM_EMAIL
```

`RESEND_FROM_EMAIL` can use the verified domain, for example `Tsuyanouchi <orders@tsuyanouchi.com>`.

## 7. Configure Gemini

```text
GEMINI_API_KEY
```

This powers the admin product-description generator.

## 8. Optional preview gate

```text
PREVIEW_PASSWORD
NEXT_PUBLIC_UNDER_CONSTRUCTION=true
```

## 9. Run locally

Create `.env.local` using `ENV_TEMPLATE.md`, then:

```bash
npm run verify:infra
npm run dev
```

Open `http://localhost:3000`. The protected admin portal is `http://localhost:3000/admin`.

## 10. Existing product images

For ordinary new listings, upload images directly in the admin product editor; the app sends them to R2 automatically.

For the tracked repository folders under `product-images/`, you can bulk upload them with:

```bash
npm run upload-images-1
npm run upload-images-2
npm run upload-images-3
```

See `CSV_IMPORT_GUIDE.md` if a CSV references those R2 objects by filename.

## 11. Deploy to Vercel

The Vercel project should point to the repository root. Add the variables from `ENV_TEMPLATE.md` to the required environments and deploy from `main`.

The build runs the infrastructure guard before Next.js compilation. If retired backend/storage code is reintroduced anywhere in the current text-based repository tree, the build intentionally fails and reports the offending path.

## 12. Production smoke test

1. Sign into `/admin`.
2. Create a test product and verify it appears in the shop.
3. Upload two JPG/PNG/WebP images and reorder them.
4. Confirm the new objects appear in the R2 bucket.
5. Confirm the first image appears in admin and `/shop`.
6. Open the product and verify the full gallery.
7. Edit and delete a test product and verify storefront cache refresh.
8. Add a priced size to the cart and verify image, size, and price through cart/checkout.
9. Complete a Stripe test-mode checkout before using live cards.
10. Verify the Stripe webhook updates the Neon order and Resend sends the expected emails.

## Troubleshooting

**Products are empty:** verify `DATABASE_URL` and confirm `migrations/002_neon_r2_schema.sql` was run against the same Neon database.

**Image upload returns 500:** inspect Vercel runtime logs for `/api/admin/product-images`, then verify all five `R2_*` variables and the R2 token's Object Read & Write permissions.

**Image uploads but does not display:** open the saved R2 object URL directly. Verify `R2_PUBLIC_URL` points to the same public bucket.

**Admin login fails:** verify `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` are present for Production, then redeploy after changing them.

**Checkout fails:** verify the Stripe keys and production webhook signing secret.
