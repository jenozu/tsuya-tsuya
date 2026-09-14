# Tsuyanouchi Master List

_Last updated: 2026-09-14_

This file is the current source of truth for the Tsuyanouchi rebuild/deployment work.

## Current checkpoint

### Completed
- [x] Canonical repository established at `jenozu/tsuya-tsuya`
- [x] New Vercel project created and connected to the repository
- [x] Admin/product/image pipeline audit completed
- [x] Supabase runtime replacement implemented on `feat/neon-r2`
- [x] Neon PostgreSQL project created
- [x] Neon PostgreSQL schema created and run successfully
- [x] Cloudflare R2 bucket `tsuya-tsuya-images` created
- [x] R2 public development URL enabled
- [x] R2 user API token created and credentials saved
- [x] `tsuyanouchi.com` renewed at Namecheap
- [x] `tsuyanouchi.com` connected to the Vercel `tsuya-tsuya` project
- [x] `www.tsuyanouchi.com` connected to the Vercel `tsuya-tsuya` project
- [x] Vercel reports valid configuration for apex and `www` domains
- [x] Resend DNS records recreated in Namecheap (DKIM, sending CNAMEs, DMARC)
- [x] Resend domain verification completed for `tsuyanouchi.com`
- [x] Stripe API-key/webhook configuration work started
- [x] Neon + R2 migration branch passes typecheck/build verification

### Current human/configuration work
- [ ] Create/save the production Resend API key if not already created
- [ ] Set/confirm the production sender address, e.g. `orders@tsuyanouchi.com`
- [ ] Configure a normal hosted mailbox separately if desired for human support/replies
- [ ] Finish required Vercel environment variables (see below)
- [ ] Redeploy after environment-variable changes

## Environment variables still to finish/confirm in Vercel

Required database/storage/admin values:
- [ ] `DATABASE_URL`
- [ ] `R2_ACCOUNT_ID`
- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY`
- [ ] `R2_BUCKET_NAME=tsuya-tsuya-images`
- [ ] `R2_PUBLIC_URL`
- [ ] `ADMIN_PASSWORD` — currently not configured in production; `/admin/login` reports this explicitly
- [ ] `ADMIN_SESSION_SECRET`

Stripe:
- [ ] `STRIPE_SECRET_KEY`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`

Resend/email:
- [ ] `RESEND_API_KEY`
- [ ] `ORDER_NOTIFICATION_EMAIL`
- [ ] Confirm application sender address uses the verified `tsuyanouchi.com` domain

Gemini, if keeping AI description generation:
- [ ] `GEMINI_API_KEY`

## Next technical steps after environment setup

- [ ] Migrate existing product/order/shipping data from the legacy Supabase project into Neon
- [ ] Migrate legacy product images into Cloudflare R2 and rewrite product image URLs
- [ ] Verify products and images directly in Neon/R2 before switching production
- [ ] Test admin login
- [ ] Test new product creation
- [ ] Test multi-image upload and image ordering
- [ ] Verify images on shop cards, product detail pages, cart, checkout and Stripe checkout
- [ ] Test product edit/delete flows
- [ ] Test Stripe checkout end-to-end
- [ ] Verify Stripe webhook delivery and resulting order records
- [ ] Verify Resend order-confirmation/notification email delivery
- [ ] Merge PR #2 (`feat/neon-r2` -> `main`) only after infrastructure and migration verification
- [ ] Verify final Vercel production deployment
- [ ] Run final production smoke test

## Current release gate

**Do not merge PR #2 into `main` yet.**

Production cutover should happen only after:
1. required Vercel environment variables are present,
2. existing data/images have been migrated and validated,
3. checkout, webhooks, admin image upload and email delivery pass smoke testing,
4. production deployment is verified on `tsuyanouchi.com`.
