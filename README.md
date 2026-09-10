# Tsuyanouchi — House of Lustre

A luxury e-commerce storefront built with Next.js and TypeScript for Japanese-inspired art and lifestyle goods.

## Core features

Customer-facing functionality includes the product catalogue, search/filtering, favourites, cart, size-based pricing, Stripe checkout, shipping calculations, order confirmation and responsive product galleries.

The protected `/admin` portal includes product CRUD, multiple-image upload/reordering, inventory/cost management, CSV import, order visibility, analytics and Gemini-assisted product descriptions.

## Architecture

- **Framework:** Next.js 16 / React 19
- **Database:** Neon PostgreSQL
- **Product images:** Cloudflare R2
- **Image processing:** Sharp; admin uploads are rotated, resized to fit within 2400×2400 and converted to WebP
- **Payments:** Stripe
- **Email:** Resend
- **AI descriptions:** Google Gemini
- **Deployment:** Vercel

The image files themselves live in Cloudflare R2. Neon stores structured product/order data and image URL metadata; image binaries are not stored in PostgreSQL.

## Local setup

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/jenozu/tsuya-tsuya.git
cd tsuya-tsuya
npm install
```

Create `.env.local` using `ENV_TEMPLATE.md`, then follow `NEON_R2_SETUP.md` or `SETUP.md` to provision Neon and R2.

Run the database schema in the Neon SQL Editor:

```text
migrations/002_neon_r2_schema.sql
```

Then start the app:

```bash
npm run dev
```

The storefront is available at `http://localhost:3000`, and the admin portal is at `http://localhost:3000/admin`.

## Required infrastructure variables

For the catalogue/admin pipeline you need:

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

Stripe, Resend and Gemini variables are documented in `ENV_TEMPLATE.md` and are needed only for their corresponding features.

Never expose the R2 secret key, `DATABASE_URL`, Stripe secret key or admin-session secret in client-side (`NEXT_PUBLIC_*`) variables.

## Product images

Admin uploads are handled by `/api/admin/product-images`. The server validates JPG/PNG/WebP input, optimizes it and uploads the resulting WebP object to R2. A typical object key looks like:

```text
products/2026-09-10/550e8400-e29b-41d4-a716-446655440000.webp
```

Only the resulting public URL is saved with the product record. The same image metadata is then used by the shop, product detail, cart and checkout views.

Existing repository image folders can also be uploaded to R2 with:

```bash
npm run upload-images-1
npm run upload-images-2
npm run upload-images-3
```

## Migrating old Supabase data

The running application has no Supabase SDK/runtime dependency. A temporary one-time migration utility remains at `scripts/migrate-supabase-to-neon.mjs` so existing data and images can be moved before the old Supabase project is retired.

See `NEON_R2_SETUP.md` for the migration procedure. After the migration is validated, remove the temporary `LEGACY_SUPABASE_*` credentials. They are not used by the application itself.

## Important routes

- `/` — homepage
- `/shop` — product catalogue
- `/shop/[slug]` — product detail
- `/cart` — cart
- `/checkout` — checkout
- `/favourites` — saved favourites
- `/thank-you` — confirmation
- `/admin/login` — admin login
- `/admin` — protected admin portal
- `/api/products` and `/api/products/[id]` — product API
- `/api/admin/product-images` — authenticated R2 image upload/delete
- `/api/webhooks/stripe` — Stripe webhook
- `/api/waitlist` — waitlist signup

## Verification

Before merging infrastructure changes, run:

```bash
npx tsc --noEmit
npm run build
git diff --check
```

For detailed Neon/R2 provisioning and migration instructions, use `NEON_R2_SETUP.md`.