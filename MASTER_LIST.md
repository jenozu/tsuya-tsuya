# Tsuyanouchi Master List

_Last updated: 2026-09-16_

This file is the current source of truth for the Tsuyanouchi rebuild/deployment work.

## Current checkpoint

### Completed
- [x] Canonical repository established at `jenozu/tsuya-tsuya`
- [x] Vercel project connected to the repository
- [x] `tsuyanouchi.com` and `www.tsuyanouchi.com` connected with valid Vercel configuration
- [x] Neon PostgreSQL project created
- [x] Neon schema created and run successfully
- [x] Cloudflare R2 bucket `tsuya-tsuya-images` created with public access enabled
- [x] R2 API credentials created and added to deployment configuration
- [x] Resend DNS/domain verification completed for `tsuyanouchi.com`
- [x] Stripe API keys/webhook configuration prepared
- [x] Required Vercel environment variables imported
- [x] Production admin login verified
- [x] Product creation verified against the Neon-backed production API
- [x] Database/storage migration code merged into `main`
- [x] Current runtime data layer uses Neon PostgreSQL
- [x] Current product-image storage layer uses Cloudflare R2
- [x] Retired backend/storage code and stale setup documentation removed from the current tree
- [x] Infrastructure guard added to prevent retired backend/storage references from being reintroduced
- [x] Native image-processing dependency removed from the production upload path after Vercel runtime failure
- [x] Cleanup PR #3 merged to `main`
- [x] Vercel production deployment for the cleanup merge completed successfully

### Current production verification
- [x] Confirm the Vercel deployment completes successfully with the infrastructure guard
- [ ] Upload a new JPG/PNG/WebP from `/admin` and confirm `/api/admin/product-images` returns 200
- [ ] Confirm the uploaded object appears in the `tsuya-tsuya-images` R2 bucket
- [ ] Confirm the R2 image displays in admin, `/shop`, product detail, cart, and checkout
- [ ] Test product edit/delete flows
- [ ] Test CSV import using R2-backed image URLs/filenames
- [ ] Test Stripe checkout end-to-end
- [ ] Verify Stripe webhook delivery and resulting Neon order records
- [ ] Verify Resend order-confirmation and owner-notification delivery
- [ ] Run final production smoke test

## Production environment variables

Database/storage/admin:
- [x] `DATABASE_URL`
- [x] `R2_ACCOUNT_ID`
- [x] `R2_ACCESS_KEY_ID`
- [x] `R2_SECRET_ACCESS_KEY`
- [x] `R2_BUCKET_NAME=tsuya-tsuya-images`
- [x] `R2_PUBLIC_URL`
- [x] `ADMIN_PASSWORD`
- [x] `ADMIN_SESSION_SECRET`

Stripe:
- [x] `STRIPE_SECRET_KEY`
- [x] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [x] `STRIPE_WEBHOOK_SECRET`

Resend/email:
- [x] `RESEND_API_KEY`
- [x] `ORDER_NOTIFICATION_EMAIL`
- [ ] Confirm `RESEND_FROM_EMAIL` if overriding the built-in `orders@tsuyanouchi.com` sender

Gemini:
- [x] `GEMINI_API_KEY` if AI description generation is being kept

## Current architecture

- Structured data: Neon PostgreSQL through `lib/db.ts` + `lib/data.ts`
- Product files: Cloudflare R2 through `lib/r2.ts`
- Admin image endpoint: `/api/admin/product-images`
- Payments: Stripe
- Email: Resend
- Hosting: Vercel

## Release gate

Do not treat production as fully verified until the R2 image-upload/display flow, checkout/webhook flow, and email flow have all passed live smoke tests.
