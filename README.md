# Tsuyanouchi — House of Lustre

A luxury e-commerce storefront built with Next.js and TypeScript for Japanese-inspired art and lifestyle goods.

## Current architecture

- **Framework / hosting:** Next.js 16 + React 19 on Vercel
- **Database:** Neon PostgreSQL
- **Product image storage:** Cloudflare R2
- **Payments:** Stripe
- **Transactional email:** Resend
- **AI product descriptions:** Google Gemini

Neon stores structured application data such as products, orders, shipping rates, favourites, waitlist signups, and public product-image URL metadata. Product image files themselves are stored in Cloudflare R2.

## Admin portal

The protected `/admin` portal supports product create/edit/delete, multiple product images, image ordering, stock/cost management, CSV import, order visibility, shipping management, analytics, and Gemini-assisted descriptions.

When an administrator selects a JPG, PNG, or WebP from their computer, the browser sends it to `/api/admin/product-images`. The authenticated server route validates the file and uploads the original image bytes directly to R2. The returned public R2 URL is then stored with the product in Neon.

Typical R2 object key:

```text
products/2026-09-16/550e8400-e29b-41d4-a716-446655440000.jpg
```

You do not need to manually upload ordinary admin product images through the Cloudflare dashboard.

## Local setup

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/jenozu/tsuya-tsuya.git
cd tsuya-tsuya
npm install
```

Create `.env.local` using `ENV_TEMPLATE.md`, run `migrations/002_neon_r2_schema.sql` in the Neon SQL Editor, and then start the app:

```bash
npm run dev
```

Storefront: `http://localhost:3000`  
Admin: `http://localhost:3000/admin`

## Required infrastructure variables

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

Stripe, Resend, Gemini, and optional preview variables are documented in `ENV_TEMPLATE.md`.

Never expose `DATABASE_URL`, R2 secret credentials, Stripe secret keys, or the admin-session secret through a `NEXT_PUBLIC_*` variable.

## Product image workflows

### Admin uploads

Use the image picker/drop area in the admin product editor. Supported types are JPG, PNG, and WebP, up to 10 MB each. Files are written to Cloudflare R2 automatically.

### Existing tracked image folders

The repository also contains historical product image folders under `product-images/`. To upload those files to R2 while retaining their filenames:

```bash
npm run upload-images-1
npm run upload-images-2
npm run upload-images-3
```

See `CSV_IMPORT_GUIDE.md` for using filenames in CSV imports.

## Infrastructure guard

Production builds run:

```bash
npm run verify:infra
```

The guard fails the build if the current repository tree contains references to the retired backend/storage provider, and it verifies that the Neon and R2 dependencies/configuration markers are present. This prevents an old backend integration from accidentally being reintroduced.

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
- `/api/products` and `/api/products/[id]` — Neon-backed product API
- `/api/admin/product-images` — authenticated R2 image upload/delete
- `/api/webhooks/stripe` — Stripe webhook
- `/api/waitlist` — waitlist signup

## Deployment verification

Before considering a production change complete, verify:

```bash
npm run verify:infra
npx tsc --noEmit
npm run build
```

Then smoke-test admin login, product creation, R2 image upload/display, product editing/deletion, checkout, Stripe webhooks, Neon order records, and Resend delivery.
