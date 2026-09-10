# Tsuyanouchi Setup Guide

This guide configures the current Tsuyanouchi stack: Vercel + Next.js, Neon PostgreSQL, Cloudflare R2, Stripe, Resend and Gemini.

## 1. Install dependencies

Requirements: Node.js 20+ and npm.

```bash
npm install
```

## 2. Create the Neon database

1. Create a Neon project and PostgreSQL database.
2. Open the Neon SQL Editor.
3. Run `migrations/002_neon_r2_schema.sql`.
4. Copy the pooled Neon connection string and save it as `DATABASE_URL` in `.env.local` and later in Vercel.

The database stores products, product image URL metadata, orders, shipping rates, favourites and waitlist signups. Actual image files are not stored in Neon.

## 3. Create Cloudflare R2 image storage

1. In Cloudflare, create an R2 bucket. `tsuya-tsuya-images` is the recommended name.
2. Enable public access using either an R2 custom domain or the provided development `r2.dev` URL.
3. Create an R2 API token with Object Read & Write access to this bucket.
4. Add these environment variables:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
```

`R2_PUBLIC_URL` is the public base URL used by browsers to display product images. Do not put the R2 access-key secret into a `NEXT_PUBLIC_*` variable.

When an administrator uploads a JPG, PNG or WebP, the server rotates it if needed, resizes it to fit within 2400×2400 without enlarging it, converts it to WebP and saves it to R2. Neon receives only the resulting public image URL.

## 4. Configure admin access

Add:

```text
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

Use a long random value for `ADMIN_SESSION_SECRET`. Admin sessions are signed server-side and product mutations/image uploads require a valid admin session.

## 5. Configure Stripe

Add:

```text
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

For production, create a Stripe webhook endpoint at:

```text
https://YOUR-DOMAIN/api/webhooks/stripe
```

Enable the Stripe events used by the application, including checkout completion and the payment-intent events handled by the webhook route.

## 6. Configure Resend

Add:

```text
RESEND_API_KEY
ORDER_NOTIFICATION_EMAIL
RESEND_FROM_EMAIL
```

Without Resend, the storefront can still build, but order/waitlist notification email functionality will be unavailable.

## 7. Configure Gemini product descriptions

Add:

```text
GEMINI_API_KEY
```

This is used by the admin product-description generator.

## 8. Optional preview/under-construction access

If the under-construction gate is enabled, configure:

```text
PREVIEW_PASSWORD
NEXT_PUBLIC_UNDER_CONSTRUCTION=true
```

## 9. Run locally

Create `.env.local` from the values documented in `ENV_TEMPLATE.md`, then run:

```bash
npm run dev
```

Open `http://localhost:3000`. The protected admin portal is at `http://localhost:3000/admin`.

## 10. Migrate existing Supabase data before retiring it

The production application no longer uses the Supabase SDK/runtime. The repository includes a temporary one-time migration script so existing catalogue/order data and product images are not lost.

Before running it, add these temporary variables locally only:

```text
LEGACY_SUPABASE_URL
LEGACY_SUPABASE_SERVICE_ROLE_KEY
```

Then run:

```bash
node scripts/migrate-supabase-to-neon.mjs
```

The script copies products, orders, shipping rates and waitlist entries to Neon. Supabase-hosted images, legacy base64 product images and supported local product images are copied to R2 and rewritten to R2 URLs. External non-Supabase URLs are left unchanged.

After validating the migration, remove the two `LEGACY_SUPABASE_*` credentials and retire the old Supabase project when you are comfortable doing so.

## 11. Deploy to Vercel

The Vercel project should point at the repository root. Add the variables from `ENV_TEMPLATE.md` to the appropriate Vercel environments, then deploy.

At minimum, the admin/catalogue pipeline requires:

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

Stripe/Resend/Gemini variables are required for those features.

## 12. Production smoke test

After deploying, verify this sequence before retiring the old service:

1. Sign into `/admin`.
2. Create or edit a test product.
3. Upload two images and reorder them.
4. Save the product.
5. Confirm the first image appears correctly in admin and `/shop`.
6. Open the product and confirm the complete image gallery works.
7. Add a priced size to cart and confirm the image/price/size are correct in the cart drawer, `/cart`, `/checkout`, and Stripe Checkout.
8. Edit the listing image again and verify the storefront updates immediately.
9. Confirm the uploaded `.webp` object exists in the R2 bucket and the product row in Neon contains the public URL rather than image bytes/base64 data.

## Troubleshooting

**Products are empty:** verify `DATABASE_URL` and that `migrations/002_neon_r2_schema.sql` was run in the same Neon database.

**Image upload fails:** verify all five `R2_*` variables, the R2 token's bucket permissions and that the bucket/public URL are configured correctly.

**Images upload but do not display:** open the value of `R2_PUBLIC_URL` in a browser and make sure the bucket is publicly reachable. A custom domain is preferable for production.

**Admin login fails:** verify both `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`, then redeploy/restart after changing them.

**Checkout fails:** verify Stripe keys and the production webhook signing secret.

See `NEON_R2_SETUP.md` for the short migration-focused checklist.