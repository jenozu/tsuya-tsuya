# Tsuya — Master Plan

Repository audited: `jenozu/tsuya-tsuya` (`main`), September 24, 2026. Existing canonical operational checklist: `MASTER_LIST.md` (preserved). Status marked complete below means directly evidenced *repository implementation*, not an assertion of newly executed live verification. Historical deployment/testing claims in `MASTER_LIST.md` require fresh verification where launch-critical. Source audit includes source and API routes, migrations, environment template, Vercel/CI configuration, docs, and recent commits. Do not put credentials or customer data in this file.

## M1: Repository foundation and deployment

### Goal
Establish an auditable Next.js foundation and reproducible deployment before expanding features.

### Implementation
- [x] Keep the Next.js/TypeScript application and lockfile in the canonical repository (`package.json`, `package-lock.json`). <!-- task:TSU-M1-001 -->
- [x] Keep Vercel framework/build configuration (`vercel.json`) and deployment instructions (`README.md`). <!-- task:TSU-M1-002 -->
- [x] Run the existing Neon/R2 infrastructure guard from the production build and pull-request workflow. <!-- task:TSU-M1-003 -->
- [x] Verify the current default-branch build with dependency installation, `npm run verify:infra`, typecheck, and production build; retain logs. <!-- task:TSU-M1-004 -->
  - Evidence (2026-09-24): GitHub Actions run [36063998982](https://github.com/jenozu/tsuya-tsuya/actions/runs/36063998982), baseline-build against `main` commit `4632b1019f05a4f9b4c8f3adea2b454f44fd6477` using Node 22: `npm ci`, `npm run verify:infra`, `tsc --noEmit`, and `npm run build` all exited successfully. Download the `tsu-m1-004-default-branch-build-36063998982` artifact for the retained command logs (14-day retention); the workflow run's job logs remain accessible on GitHub. Build emitted a nonfatal `DATABASE_URL is not configured` message during product prerendering; database integration and deployed behavior were **not** verified here, and remain covered by later tasks.
- [x] Fix `next.config.ts` build-error suppression; make TypeScript failures block builds and verify a clean build. <!-- task:TSU-M1-005 -->
  - Evidence (2026-09-27): [GitHub Actions run 36345958274](https://github.com/jenozu/tsuya-tsuya/actions/runs/36345958274) passed infrastructure verification, locked dependency install, explicit `tsc --noEmit`, and `npm run build` for PR #5 with `ignoreBuildErrors` removed; Next.js build log now includes `Running TypeScript ...` and completed successfully. The `tsu-m1-005-candidate-build-36345958274` artifact retains logs for 14 days, with Actions job logs thereafter. The isolated build logged `DATABASE_URL is not configured` during product prerendering; live database/deployment verification remains pending under other roadmap tasks.
- [x] Replace or repair the `next lint` script for the installed Next.js version and enforce linting in CI. <!-- task:TSU-M1-006 -->
  - Evidence (2026-09-27): PR #14 updated `package.json` / `package-lock.json` with ESLint 9 and `eslint-config-next` 16.1.6, replaced the removed `next lint` command with `eslint .`, and enforced lint in the existing candidate CI job. [GitHub Actions run 36350526823](https://github.com/jenozu/tsuya-tsuya/actions/runs/36350526823) passed locked install, lint, regression tests, typecheck, and production build; Vercel preview reached READY. Pre-existing CSV `any` types and legacy external-state effects remain visible lint **warnings** pending targeted refactors; lint errors fail CI.
- [x] Confirm Vercel production/preview projects, `main` tracking, rollback procedure, and deployed commit SHA against the live dashboard. <!-- task:TSU-M1-007 -->
  - Evidence (2026-09-27): Connected Vercel project `tsuya-tsuya` (`prj_xY975XUZMyiou8E0HAA6RAcPqkle`), READY production deployment `dpl_HxPEwcKskeRceyE83p6fmvxojTEE` from `main` SHA `818f78fdb5eb31ef6c6703819749808276b13468`, READY preview deployment `dpl_6im68bYtMaXjoE8fT2bTFSspULXs` from PR #5, and production aliases for `tsuyanouchi.com` / `www.tsuyanouchi.com`. The documented rollback procedure and compatibility caution are in `AUTONOMOUS_EXECUTION_PLAN.md`; executing a live rollback, checking DNS and verifying actual payments remain separate release/recovery tasks. Recheck these dated SHA values after future merges.
- [x] Consolidate historical setup notes around `MASTER_LIST.md` and this roadmap without treating historical claims as fresh verification. <!-- task:TSU-M1-008 -->
  - Evidence (2026-09-27): `README.md` now identifies `master_plan.md` as the current roadmap, `MASTER_LIST.md` as a historical snapshot, and `AUTONOMOUS_EXECUTION_PLAN.md` as the execution/evidence and rollback companion. Existing specialized setup guides are preserved rather than duplicated.

## M2: Environment and service configuration

### Goal
Set up deployment-specific integrations without exposing credential values.

### Implementation
- [x] Document required Neon, R2, Stripe, Resend, admin, and preview variable names in `ENV_TEMPLATE.md`. <!-- task:TSU-M2-001 -->
- [x] Use server-only Neon and R2 helper modules (`lib/db.ts`, `lib/r2.ts`). <!-- task:TSU-M2-002 -->
- [ ] Audit production and preview variable *names and scopes* in Vercel without retrieving or committing values; confirm missing-variable handling. <!-- task:TSU-M2-003 -->
- [ ] Independently verify production Neon connection, R2 read/write/delete access, Stripe mode, Resend sender/domain, and preview isolation. <!-- task:TSU-M2-004 -->
- [x] Remove any reliance on sample fallback destinations, sender values, or placeholder account details in production. <!-- task:TSU-M2-005 -->
  - Evidence (2026-09-28): PR #30 removed sample runtime Resend sender/recipient fallbacks and gated mock email previews behind admin authentication. PR #31 removes unverified hard-coded public footer location, email, and social profiles and the thank-you-page sample support address, displaying them only if explicitly configured, syntactically validated public settings are present. Public mailbox config rejects reserved sample domains; dedicated unit tests cover invalid destinations/social URL origins. Actual contact ownership, business identity, policy publication and current production deployment must be confirmed separately under TSU-M17-001 and launch checks.
- [x] Document ownership, least-privilege access, credential rotation, incident revocation, and a safe configuration checklist. <!-- task:TSU-M2-006 -->
  - Evidence (2026-09-27): `docs/SERVICE_ACCESS_RUNBOOK.md` assigns accountable *roles*, defines environment-specific least privilege, rotation and revocation steps, incident escalation and a safe names/scopes-only configuration checklist. Actual named owners, live provider grants and completed rotations must be verified privately before launch under the separate provider/launch roadmap tasks; no secret values are stored here.

## M3: Database schema and migrations

### Goal
Make the current Neon data model reproducible, constrained, and safe to evolve.

### Implementation
- [x] Keep baseline Neon SQL for products, orders, shipping rates, favorites, and waitlist (`migrations/002_neon_r2_schema.sql`). <!-- task:TSU-M3-001 -->
- [x] Use parameterized Neon queries for structured product and order access (`lib/data.ts`). <!-- task:TSU-M3-002 -->
- [x] Introduce ordered, repeatable migrations and a migrations ledger for all subsequent schema changes. <!-- task:TSU-M3-003 -->
  - Evidence (2026-09-28): `scripts/migrate.mjs`, `lib/migration-plan.mjs`, and `migrations/README.md` provide a forward-only ordered migration system with SHA-256 history checks, `public.schema_migrations` ledger, gap/mutation detection, isolated baseline initialization/adoption safeguards, and transactional forward application. PR validation run [36425942145](https://github.com/jenozu/tsuya-tsuya/actions/runs/36425942145) passed the offline migration-plan check. Applying the baseline to blank/production-like databases remains separately tracked under M3-004.
- [ ] Verify baseline schema and migrations apply cleanly to a blank test database and upgrade a production-like copy without data loss. <!-- task:TSU-M3-004 -->
- [ ] Add normalized variant/SKU/inventory tables or rigorously validated JSONB constraints, as dictated by the selected fulfillment model. <!-- task:TSU-M3-005 -->
- [ ] Add persistent Stripe event and email-delivery records plus order/line-item/payment uniqueness constraints for retry safety. <!-- task:TSU-M3-006 -->
  - Partial groundwork (2026-09-29, Task 11): `migrations/forward/003_payment_delivery_foundation.json` defines additive keyed event and email records. Neither the migration nor durable runtime event claims have been applied/verified; existing order line/payment uniqueness remains unimplemented.
- [ ] Define retention, anonymization, backups, restoration, and rollback procedures for customer data. <!-- task:TSU-M3-007 -->

## M4: Storefront and responsive design

### Goal
Deliver a consistent, responsive shopping experience across key screens.

### Implementation
- [x] Provide coded homepage, shop, product-detail, cart, checkout, favorites, and confirmation routes. <!-- task:TSU-M4-001 -->
- [x] Provide reusable navigation, footer, product cards, styling, and responsive utility classes. <!-- task:TSU-M4-002 -->
- [ ] Review and finalize visual copy, branding, trust signals, navigation, and empty/loading/error states on all storefront routes. <!-- task:TSU-M4-003 -->
- [ ] Test mobile layouts at common widths, orientation changes, touch targets, and real devices; record and fix overflow. <!-- task:TSU-M4-004 -->
- [ ] Replace placeholder/random external product imagery and audit fallback image treatment. <!-- task:TSU-M4-005 -->
- [ ] Verify preview/under-construction behavior never exposes unfinished pages or blocks intended launch traffic. <!-- task:TSU-M4-006 -->

## M5: Catalog and product-detail experience

### Goal
Present accurate art-print offerings with discoverable detail and product images.

### Implementation
- [x] Implement Neon-backed product listing and product-detail queries. <!-- task:TSU-M5-001 -->
- [x] Render product descriptions, multi-image galleries, size selection, and add-to-cart interactions in product detail code. <!-- task:TSU-M5-002 -->
- [x] Provide existing CSV import parsing, templates, and a protected import endpoint. <!-- task:TSU-M5-003 -->
- [ ] Verify catalog category, sort, search/filter, availability labels, and no-results behaviors against real production catalog records. <!-- task:TSU-M5-004 -->
- [x] Decide and implement durable SEO-friendly slugs or rename `[slug]` to reflect its current ID lookup; preserve old product URLs. <!-- task:TSU-M5-005 -->
  - Evidence (2026-09-28): the product detail route directory is `app/shop/[id]`, explicitly matching its database-ID lookup while preserving the public `/shop/<existing-id>` URL shape. `docs/SEO_URL_POLICY.md` documents the stable ID contract and future permanent-redirect requirements for any readable-slug migration; README now reflects `/shop/[id]`.
- [ ] Test CSV creation/update, invalid rows, duplicate names, image filename mapping, transaction safety, and re-import reporting using R2 assets. <!-- task:TSU-M5-006 -->
- [ ] Validate catalog copy, art-print product types, image rights/licensing, and the final launch assortment. <!-- task:TSU-M5-007 -->
  - Owner direction (2026-09-30): current print sizes are approved; final launch products are still being finalized. Related-product discovery now prefers the same anime/series category. Artwork rights/licensing and the final assortment still require owner verification, so this task remains open.

## M6: Variants, prices, and inventory

### Goal
Create a single authoritative SKU, price, and stock model.

### Implementation
- [x] Store a base price, overall stock, and per-size pricing data in the product model. <!-- task:TSU-M6-001 -->
- [x] Expose size selection and size-dependent displayed pricing in the product-detail UI. <!-- task:TSU-M6-002 -->
- [x] Define the unique sellable variant identity and whether availability is shared or per-size; implement the approved made-to-order model. <!-- task:TSU-M6-003 -->
  - Evidence (2026-09-30, Phase 2 / PR #51): owner approved made-to-order Printify fulfillment, per-size private availability, and no standalone SKU unless a provider requires one. Product ID + normalized size label is the stable sellable variant identity. Existing JSONB size records now support a private `available` flag (missing means available for backwards compatibility), admin can toggle it per size, and no database migration is required. The legacy product-level `stock` field remains compatibility-only and is derived from available variant count on admin saves; it is not presented as physical stock. See `docs/PHASE_2_CATALOG_FULFILLMENT_DECISIONS.md`.
- [x] Validate variant structure, supported print sizes, price precision, and stock bounds server-side in admin and import endpoints. <!-- task:TSU-M6-004 -->
  - Evidence (2026-09-27): PR #19 introduced strict shared Zod schemas across admin product create/update and CSV import for allowed unique print sizes, positive two-decimal variant prices, bounded nonnegative integer stock and safe image fields. CSV numeric parsing no longer truncates malformed inventory or overprecise prices. [Candidate CI run 36351775450](https://github.com/jenozu/tsuya-tsuya/actions/runs/36351775450) passed tests, typecheck and production build, with a successful preview deployment. Live admin/import workflow and transaction-safe reimport remain separate tasks.
- [x] Keep listings, cart, checkout, and admin availability consistent after edits and discontinued variants. <!-- task:TSU-M6-005 -->
  - Evidence (2026-09-30, Phase 2 / PR #51): customer UI shows no quantity/scarcity messaging; product detail uses made-to-order copy. Product cards/detail, cart reconciliation, server-authoritative checkout, related recommendations and SEO all derive availability from the same per-size flag. Disabled/discontinued sizes are hidden or rejected rather than silently switched. Admin edits the same private availability field. Unit/regression, candidate build and Chromium E2E checks passed.
- [ ] Atomically reserve/decrement available inventory at the correct payment stage; prevent overselling and release failed/expired holds. <!-- task:TSU-M6-006 -->
  - Owner model note (2026-09-30): products are made to order through Printify and do not normally have finite physical stock, so a conventional quantity reservation/decrement system may be inappropriate. Keep this open until Printify/provider availability failure handling and the checkout/fulfillment fallback are defined and tested; do not invent scarcity quantities merely to satisfy the old wording.
- [x] Document catalog price changes, out-of-stock rules, and manual stock reconciliation. <!-- task:TSU-M6-007 -->
  - Evidence (2026-09-28): `docs/CATALOG_PRICE_INVENTORY.md` documents reviewed catalog-price changes, current shared-stock/out-of-stock behavior, discontinued-size handling, manual stock reconciliation and explicit owner-approval boundaries without inventing a per-size SKU model.

## M7: Admin authentication and product management

### Goal
Secure and verify the tools used to maintain the store.

### Implementation
- [x] Implement signed, HTTP-only admin session cookies and protected product-write routes. <!-- task:TSU-M7-001 -->
- [x] Implement admin product creation, edit/delete handlers, a bulk-delete route, and an admin dashboard UI. <!-- task:TSU-M7-002 -->
- [ ] Verify create/edit/delete/bulk-delete behavior on the deployed admin, including undo/safeguards and downstream image/order references. <!-- task:TSU-M7-003 -->
- [ ] Add login throttling, strong credential policy, session revocation, inactivity timeout, and production-safe secret separation. <!-- task:TSU-M7-004 -->
- [x] Apply explicit server-side authorization and method/origin/CSRF checks to every admin mutation and preview-management endpoint. <!-- task:TSU-M7-005 -->
  - Evidence (2026-09-27): PR #17 applied same-origin/Fetch Metadata browser CSRF checks before session/body handling to product mutation routes, CSV import/bulk delete, admin R2 upload/delete, admin login/logout, preview-access, orders, checkout and waitlist. Existing admin session checks protect mutation operations; unsupported HTTP methods are not exported by the relevant Next route handlers, while Stripe webhooks use signature verification instead. [Candidate CI run 36351404362](https://github.com/jenozu/tsuya-tsuya/actions/runs/36351404362) passed the Origin/CSRF regression tests, lint, types and build with a ready preview. Distributed login throttling and end-to-end unauthorized database mutation tests remain separate tasks.
- [x] Validate product payloads consistently with schemas and verify forbidden/invalid requests cannot change data. <!-- task:TSU-M7-006 -->
  - Evidence (2026-09-28, independent Task 5): PR #42 adds independent admin HMAC session unit tests (forged/expired/future/rotated tokens) and actual login/logout route tests (origin checks, invalid credentials, HTTP-only/SameSite cookie, generic configuration errors). It tests real product create/update, CSV import and bulk-delete route handlers against isolated in-memory persistence, verifying unauthorized, cross-origin, malformed and mass-assignment attempts cannot write. It also closes two gaps: update schemas now reject conflicting image aliases, and bulk deletion rejects malformed/oversized lists **before** any item is deleted. [Candidate Actions run 36451581671](https://github.com/jenozu/tsuya-tsuya/actions/runs/36451581671) passed 97 unit tests, 18 isolated route integration tests, CI/security/lint checks, dependency audit, TypeScript and production build. This verifies the repository route boundaries, not live production administrator workflows or a real test database. TSU-M7-003, TSU-M7-004 and TSU-M18-003 remain pending; matching Vercel preview was rate-limited.
- [x] Document administrator access recovery, staff permissions (if needed), audit logs, and a change-management procedure. <!-- task:TSU-M7-007 -->
  - Evidence (2026-09-27): `docs/ADMIN_ACCESS_RECOVERY.md` describes the current shared-admin access model, verified recovery sequence, account/staff and audit-log gaps, product change-management approvals and release checks. This is documentation, **not** evidence that distributed throttling, inactivity expiry, per-staff audit logs, or live recovery drills are implemented; those remain separate unchecked roadmap tasks.

## M8: Image uploads and object storage

### Goal
Manage secure, fast, and traceable storefront artwork assets.

### Implementation
- [x] Implement authenticated JPG/PNG/WebP upload to R2 and a protected object-deletion route. <!-- task:TSU-M8-001 -->
- [x] Provide stored-image URL metadata and an image upload helper for the admin. <!-- task:TSU-M8-002 -->
- [ ] Reverify live admin upload, URL rendering, object deletion, ordering, and CSV-import mapping on the current deployment. <!-- task:TSU-M8-003 -->
- [ ] Constrain file byte signatures, pixel dimensions, total upload rate, and object ownership; reject masquerading formats. <!-- task:TSU-M8-004 -->
  - Partial evidence: PR #18 verifies image magic bytes and decoded JPEG/PNG/WebP format, metadata dimensions, page count and byte bounds before R2 writes. Distributed upload-rate limiting and proof of historical object ownership are still required.
  - PR #43 adds negative tests through real image route handlers using mocked R2, plus rejection of malformed or path-traversal deletion keys. This is not distributed rate limiting or proof of object ownership; the task stays unchecked.
- [ ] Define and implement derivative generation, thumbnails, image compression, responsive sizes, and safe caching. <!-- task:TSU-M8-005 -->
- [x] Restrict `next.config.ts` remote-image hosts to trusted domains and remove blanket HTTP wildcard allowance. <!-- task:TSU-M8-006 -->
  - Evidence (2026-09-27): PR #11 replaced blanket HTTP/HTTPS wildcard image optimizer permissions with exact HTTPS hosts derived from `R2_PUBLIC_URL` and the documented fixed sample host, rejected insecure protocol-relative/HTTP product sources, and removed random cart-image fallbacks. [Actions run 36349860305](https://github.com/jenozu/tsuya-tsuya/actions/runs/36349860305) passed tests, typecheck and production build; live R2 asset rendering still requires separate deployed smoke testing.
- [ ] Define orphan cleanup, image replacement safeguards, watermark/licensing workflow, and an R2 recovery plan. <!-- task:TSU-M8-007 -->

## M9: Cart and checkout preparation

### Goal
Keep cart behavior predictable and make checkout inputs trustworthy.

### Implementation
- [x] Implement localStorage-backed cart persistence, variant-aware item grouping, and quantity controls. <!-- task:TSU-M9-001 -->
- [x] Provide checkout address UI with form validation and a shipping-rate request. <!-- task:TSU-M9-002 -->
- [x] Test cart persistence across refreshes, variant changes, multi-tab edits, invalid cached items, quantity limits, and mobile checkout. <!-- task:TSU-M9-003 -->
  - Evidence (2026-09-28, independent Task 6): PR #38 rebases real Chromium browser tests onto the dependency-audited main branch. Playwright covers localStorage persistence on refresh, distinct selected-size cart lines and removal, cross-tab quantity synchronization and caps, corrupt persisted records, and 375px mobile checkout with mocked catalog/shipping/Checkout Session endpoints. It asserts stale variant price reconciliation, a server-side checkout rejection, no horizontal overflow and removal of discontinued variants without silently switching their size. Cart controls gain descriptive accessible labels. [GitHub Actions run 36457077448](https://github.com/jenozu/tsuya-tsuya/actions/runs/36457077448) passed all 6 actual Chromium browser tests, existing candidate lint/security/typecheck/build checks and baseline verification with no live provider credentials or charges. The browser runner binds Next's development host to the exact Chromium origin to satisfy current Next 16 development-origin protection. This is local browser coverage, **not** verified production Vercel/Stripe behavior; broader admin/order/email end-to-end coverage remains TSU-M18-005.
  - Partial evidence: PR #20 sanitizes persisted cart state, synchronizes cross-tab edits and adds unit tests for invalid cached items, prices, quantities and duplicates. Actual refresh/multi-tab/mobile end-to-end browser coverage remains.
- [x] Requery current catalog/variant prices and availability when entering checkout; never trust stored cart prices. <!-- task:TSU-M9-004 -->
  - Evidence (2026-09-27): PR #10 added server-side Neon product/variant repricing and shared-product-stock preflight before opening a Stripe Checkout Session; stale/edited totals fail with HTTP 409. [Actions run 36347422040](https://github.com/jenozu/tsuya-tsuya/actions/runs/36347422040) passed tests, typecheck and production build. A preflight check is **not** a transactional stock reservation; M6-006 remains open.
- [ ] Validate checkout email/address and destination values on the server using shared schemas. <!-- task:TSU-M9-005 -->
  - Partial evidence: PR #22 shares the browser/server shipping-address, email and checkout request schemas with regression tests. Country *format* is checked, but owner-approved destination eligibility and geographic address verification have not been implemented.
- [ ] Prevent duplicate checkout submissions and handle session expiry, cancellation, and returning shoppers. <!-- task:TSU-M9-006 -->
  - Partial evidence (2026-09-28, autonomous Task 9): PR #45 adds checkout double-submit guards, privacy-preserving browser attempt reuse across retries/refresh/cancellation, deterministic server-owned Stripe idempotency keys/order IDs, typed expiry/completion responses and offline route/UI-helper tests. Stripe test-mode return/replay and a durable cross-device/session/payment ledger (M11-002/003/004) are still unverified, so this task stays unchecked; see `docs/TASK_9_CHECKOUT_RECOVERY.md`.

## M10: Stripe test checkout and order integrity

### Goal
Make sandbox checkout provably correct before enabling real payments.

### Implementation
- [x] Implement Stripe Checkout Session creation, signed webhook verification, and initial paid-order persistence logic. <!-- task:TSU-M10-001 -->
- [x] Replace client-submitted item names/prices/subtotal/shipping/tax in `/api/checkout/create-session` with validated, server-derived catalog and policy totals. <!-- task:TSU-M10-002 -->
  - Evidence (2026-09-27): PR #10 ignores caller-supplied item names/prices as Stripe charge authority and computes canonical line-item amounts, shipping and tax on the server using existing Neon/catalog and application-rate modules, rejecting mismatched client totals. [Actions run 36347422040](https://github.com/jenozu/tsuya-tsuya/actions/runs/36347422040) passed. Shipping eligibility/tax policy correctness, persistent order uniqueness and Stripe sandbox/end-to-end verification remain separate unchecked tasks.
- [x] Lock down `successUrl`/`cancelUrl` to approved site origins and remove untrusted origin-based redirects. <!-- task:TSU-M10-003 -->
  - Evidence (2026-09-27): PR #8 removed caller-supplied Stripe return URLs and request-Origin-based production redirects in favor of server-configured HTTPS site/validated Vercel preview or local development origins; regression tests cover hostile and malformed redirect hosts. [Actions run 36347162859](https://github.com/jenozu/tsuya-tsuya/actions/runs/36347162859) passed.
- [x] Disable or fully harden client-amount-driven `/api/payments/create-intent` and `/api/payments/update-intent` endpoints. <!-- task:TSU-M10-004 -->
  - Evidence (2026-09-27): PR #8 retired both unrestricted client-amount-driven PaymentIntent mutation endpoints with HTTP 410. The storefront's Checkout Session path is independent. [Actions run 36347162859](https://github.com/jenozu/tsuya-tsuya/actions/runs/36347162859) verified candidate build; live payment testing is not claimed.
- [ ] Persist authoritative order line items with product ID, variant/SKU, unit price, currency, and captured shipping/tax breakdown. <!-- task:TSU-M10-005 -->
- [ ] Run and document sandbox cases: paid, failed, canceled, duplicate submission, changed price, stale stock, invalid destination, and manipulated requests. <!-- task:TSU-M10-006 -->
- [ ] Reverify sandbox webhook→Neon→Resend outcome after completing server-side pricing changes. <!-- task:TSU-M10-007 -->

## M11: Stripe webhooks and production payments

### Goal
Make payment processing idempotent, observable, and recoverable.

### Implementation
- [x] Use the Stripe signature verification helper and handle checkout, success, failure, and cancellation event categories in webhook code. <!-- task:TSU-M11-001 -->
- [ ] Persist unique Stripe event/session/payment identifiers and claim each event transactionally to prevent concurrent duplicate processing. <!-- task:TSU-M11-002 -->
  - Partial groundwork (2026-09-29, Task 11): staged event/recipient tables, offline manifest tests and optional explicit disposable-Neon concurrent-claim runbook. Current webhook remains on the existing schema; live event claiming, leases and provider test-mode verification are not implemented.
- [ ] Make order creation, stock updates, and notifications safely retryable; prevent lost email when an order already exists. <!-- task:TSU-M11-003 -->
- [ ] Handle out-of-order and delayed payment events, Stripe retries, request timeouts, and webhook recovery queues. <!-- task:TSU-M11-004 -->
  - Partial implementation (2026-09-29, Task 11): settled paid/refunded orders are atomically protected against late failed/canceled events, and a paid event missing session details returns retryable HTTP 500. Existing database-backed recovery queues, webhook lease retry workers and full Stripe test-mode ordering coverage remain pending.
- [ ] Reconcile Stripe paid/refunded amounts to Neon order records with a documented scheduled or manual procedure. <!-- task:TSU-M11-005 -->
- [ ] Verify live-mode credentials, live webhook endpoint/signature, allowed methods/currencies, fraud settings, and one controlled live purchase/refund. <!-- task:TSU-M11-006 -->
- [x] Document payment incident response, reprocessing steps, settlement checks, and production rollback. <!-- task:TSU-M11-007 -->
  - Evidence (2026-09-28): `docs/PAYMENT_INCIDENT_RESPONSE.md` documents incident triggers, safe Stripe→Neon settlement checks, current replay limitations, owner-authorized reprocessing, deployment/provider rollback boundaries and closeout requirements. Live-mode replay/refund verification remains under M11-006/M21-003.

## M12: Shipping, destinations, and fulfillment charges

### Goal
Offer only supported destinations with verified, predictable charges.

### Implementation
- [x] Implement country/quantity shipping-rate helpers and a checkout-visible shipping quote endpoint. <!-- task:TSU-M12-001 -->
- [x] Document region-specific shipping information in `shipping/` and maintain a shipping-rate database schema. <!-- task:TSU-M12-002 -->
- [ ] Resolve inconsistencies between SQL seed shipping prices, dynamic `lib/shipping.ts` rates, admin rate displays, and actual business policy. <!-- task:TSU-M12-003 -->
- [ ] Implement a definitive destination allowlist/exclusions list and reject unsupported countries server-side before charging. <!-- task:TSU-M12-004 -->
- [ ] Verify US free shipping and the approved Canada, UK, EU, EFTA, Australia, and other region calculations for single/multiple items. <!-- task:TSU-M12-005 -->
- [ ] Define shipping services, handling/transit estimates, PO boxes, tracking, lost parcels, and carrier rate-change procedures. <!-- task:TSU-M12-006 -->
- [ ] Test full address validation, remote areas, customs data needs, and destination-based fulfillment restrictions. <!-- task:TSU-M12-007 -->

## M13: Taxes, duties, and international orders

### Goal
Charge compliant amounts and explain cross-border obligations clearly.

### Implementation
- [x] Provide tax calculation helpers and country/state mapping data. <!-- task:TSU-M13-001 -->
- [ ] Review seller nexus/registration and applicable US, Canada, UK, EU, and other destination tax treatment with qualified advice. <!-- task:TSU-M13-002 -->
- [ ] Choose and implement verified server-side tax calculations or Stripe Tax with consistent taxable shipping/threshold and exemption rules. <!-- task:TSU-M13-003 -->
- [ ] Define import VAT/GST, duties, customs declarations, commodity codes, origin, declared value, and DDP-versus-DAP responsibilities. <!-- task:TSU-M13-004 -->
- [ ] Display duties/tax and recipient-fee disclosures before payment; align legal pages, checkout totals, and email receipts. <!-- task:TSU-M13-005 -->
- [ ] Test representative international orders and document tax-reporting/export records and ongoing rate maintenance. <!-- task:TSU-M13-006 -->

## M14: Order administration and fulfillment

### Goal
Turn each verified payment into a shippable and traceable order.

### Implementation
- [x] Persist orders in Neon and render admin order visibility and dashboard analytics code. <!-- task:TSU-M14-001 -->
- [ ] Verify admin access to order details, variant/SKU, full shipping address, payment status, and searchable order lists. <!-- task:TSU-M14-002 -->
- [ ] Implement explicit fulfillment states and authorized state transitions, shipment creation, tracking numbers, and shipment timestamps. <!-- task:TSU-M14-003 -->
- [ ] Generate a clear pick/pack/print/quality-control workflow, including artwork print-size checks and packaging instructions. <!-- task:TSU-M14-004 -->
- [ ] Add shipment and stock reconciliation for cancellations, partial fulfillment, losses, and manual corrections. <!-- task:TSU-M14-005 -->
- [x] Document daily order processing, customer issue escalation, and manual recovery of paid orders lacking an order record. <!-- task:TSU-M14-006 -->
  - Evidence (2026-09-28): `docs/DAILY_ORDER_RECOVERY.md` documents daily paid-order intake, customer/fulfillment exception escalation, safe investigation of Stripe-paid orders missing Neon rows and private operational records, while explicitly avoiding unverified live replay or refund actions.

## M15: Transactional email and support

### Goal
Communicate critical order events reliably and offer accessible support.

### Implementation
- [x] Implement Resend customer confirmation and owner order-notification email templates and send helpers. <!-- task:TSU-M15-001 -->
- [x] Provide waitlist signup route and newsletter input components. <!-- task:TSU-M15-002 -->
- [ ] Validate email delivery against current test orders; add durable send status, retry, failure alerts, and duplicate suppression. <!-- task:TSU-M15-003 -->
- [x] Escape customer/product fields in outbound HTML and minimize personally identifiable information in application logs. <!-- task:TSU-M15-004 -->
  - Evidence (2026-09-28, independent task 2): PR #39 extracts the owner HTML into a pure testable renderer and checks both customer and owner templates against hostile product names, order references, customer/address fields and malformed runtime quantities. Optional customer support links accept only validated, non-placeholder plain mailboxes. Delivery helpers log structured event names only, without customer addresses, order IDs or raw provider errors; regression tests cover that contract. [Candidate Actions run 36429500752](https://github.com/jenozu/tsuya-tsuya/actions/runs/36429500752) passed 78 unit tests and 3 isolated admin-route integration tests, security check, lint, migration plan, TypeScript and Next production build. This proves repository-level rendering/logging, not actual provider delivery, inbox placement, or retry/alert outcomes (M15-003 remains unchecked).
- [ ] Implement shipping, cancellation, refund, failed-payment, and customer-support notification templates triggered by real status changes. <!-- task:TSU-M15-005 -->
- [ ] Create an accessible contact form with server validation, spam controls, delivery confirmation, and a support inbox process. <!-- task:TSU-M15-006 -->
- [ ] Document response-time targets, unsubscribe/consent handling where applicable, retention, and email sender reputation monitoring. <!-- task:TSU-M15-007 -->

## M16: Returns, refunds, and customer policies

### Goal
Make after-sale handling consistent with actual payment and fulfillment behavior.

### Implementation
- [ ] Publish and operationalize returns/exchange policy, eligibility window, exception rules, and a return-request channel. <!-- task:TSU-M16-001 -->
- [ ] Define cancellation cutoffs and implement safe pre-/post-payment cancellation with inventory restoration. <!-- task:TSU-M16-002 -->
- [ ] Create Stripe full/partial refund procedure and synchronize refunds/chargebacks with order status and customer notification. <!-- task:TSU-M16-003 -->
- [ ] Document damaged/misprinted/lost-order evidence collection, replacement decisions, shipping responsibility, and dispute handling. <!-- task:TSU-M16-004 -->
- [ ] Test representative refund/cancellation/replacement scenarios with redacted test orders. <!-- task:TSU-M16-005 -->

## M17: Privacy, legal, and security

### Goal
Protect buyers, prevent abuse, and publish appropriate business disclosures.

### Implementation
- [ ] Publish verified business identity/contact details, terms, shipping policy, returns policy, and privacy policy; link them sitewide. <!-- task:TSU-M17-001 -->
- [ ] Inventory all cookies/localStorage, analytics, processors, and international data transfers; implement appropriate consent controls. <!-- task:TSU-M17-002 -->
- [ ] Set customer/marketing data retention, deletion/export requests, least-privilege access, and incident handling procedures. <!-- task:TSU-M17-003 -->
- [ ] Add rate limiting, request-size limits, strong input validation, security headers, origin checks, and CSRF defenses on state changes. <!-- task:TSU-M17-004 -->
  - Partial evidence: PR #17 adds Origin/Fetch Metadata checks for all first-party mutation routes, and PR #18 hardens image byte validation. Distributed rate limits and complete route-by-route size/security-header validation remain required.
  - Partial evidence (2026-09-29, autonomous Task 10): PR #46 adds streamed actual-byte JSON ceilings and strict media/JSON parsing to admin/preview/waitlist/checkout endpoints, preflights declared multipart sizes before image parsing, introduces conservative site-wide security headers and credential-free abuse regression tests. Distributed rate limits/WAF, full API surface size audit, strict CSP and production header checks are still open; see `docs/TASK_10_API_SECURITY.md`.
- [x] Eliminate logging of sensitive order data and payment metadata; redact errors returned to public endpoints. <!-- task:TSU-M17-005 -->
  - Evidence (2026-09-28, independent Task 3): PR #40 audited every repository API route and server logger. Its server log helper now accepts only vetted event labels, preventing even syntactically harmless-looking customer/order/payment values from becoming log messages. Checkout/admin browsers no longer dump raw exception objects. Admin/preview/webhook configuration failures return stable generic no-store errors, webhook body-read failures are handled, and payment/order references are removed from webhook exception strings. Tests scan API/Stripe/email sources for direct error logging and raw data serialization; isolated real API handler tests inject synthetic private DB error text and verify no disclosure in public responses or logs. [GitHub Actions run 36431530681](https://github.com/jenozu/tsuya-tsuya/actions/runs/36431530681) passed 81 unit tests, 6 isolated route tests, lint, security checks, migrations check, typecheck and production build. This is repository-level log/error redaction only: provider-hosted request log settings, data-retention policies and fresh live-preview confirmation remain separately unverified; Vercel preview was rate-limited when this PR was built.
- [ ] Review dependencies, R2 bucket exposure, image upload abuse, preview access, and admin session fallback behavior. <!-- task:TSU-M17-006 -->
- [ ] Rotate compromised/old secrets through provider dashboards, verify revoked credentials no longer work, and document routine rotation. <!-- task:TSU-M17-007 -->
- [ ] Review artwork/IP commercialization rights and required consumer notices for each selling region. <!-- task:TSU-M17-008 -->

## M18: Automated tests and continuous integration

### Goal
Prevent regressions and demonstrate that critical checkout behavior works.

### Implementation
- [x] Run the repository's existing infrastructure-reference guard on pull requests. <!-- task:TSU-M18-001 -->
- [x] Add unit tests for tax, shipping, variant pricing, cart calculations, address validation, and CSV parsing. <!-- task:TSU-M18-002 -->
  - Evidence (2026-09-27): Deterministic Node tests now cover provisional shipping/tax calculations and country-scoped overrides (PR #21), canonical variant pricing (PR #10/#19), cart sanitation and cent-based totals (PR #20), shared address/email validation (PR #22), and strict CSV parsing/import values (PR #19). [Candidate CI run 36352047444](https://github.com/jenozu/tsuya-tsuya/actions/runs/36352047444) reported 45 tests passed, 0 failed, 0 skipped; lint, typecheck, build and preview also succeeded. Integration/browser/live-provider tests remain separately unchecked.
- [ ] Add integration tests for product CRUD, authorized/unauthorized admin actions, order creation, R2 upload validation, and test database migration. <!-- task:TSU-M18-003 -->
  - Partial evidence (2026-09-28): PR #42 adds real route-handler tests against an isolated in-memory catalog for product create/update/bulk delete/CSV import and authentication; tests against a disposable PostgreSQL database, object storage validation, order persistence and migration application remain pending.
  - Partial evidence (2026-09-28, autonomous Task 7): PR #43 adds seven real admin image upload/deletion route tests against isolated R2 test doubles, covering authorization, origin, MIME spoofing, size bounds, redacted provider errors and generated object keys. CI enforces them alongside the existing product CRUD/CSV tests. A separate, explicitly gated `npm run test:disposable-db` harness can initialize a brand-new empty Neon test branch and check baseline ledger, product CRUD and stock/order constraints, but was **not run** against an actual Neon provider during this repository-only task. Its existence is not evidence of real DB verification, production upgrade success or live R2 behavior; task remains unchecked. See `docs/TASK_7_ISOLATED_INTEGRATION.md`.
- [ ] Add Stripe sandbox/webhook tests for tampered prices, invalid destinations, retries, concurrent duplicates, refunds, and out-of-order events. <!-- task:TSU-M18-004 -->
  - Partial coverage (2026-09-29, Task 11): real route handler receives isolated synthetic signature/payment/session/email fixtures, testing deferred/duplicate/out-of-order transitions and persistence failures. Synthetic signatures do not test real Stripe HMAC or provider behavior. Mismatched destinations, refunds, true DB concurrency and Stripe test-mode checks remain pending.
- [ ] Add end-to-end browser tests covering mobile storefront, cart, checkout, admin operations, email test doubles, and error states. <!-- task:TSU-M18-005 -->
  - Partial evidence (2026-09-28): PR #38 adds and CI-enforces 6 Playwright Chromium tests for cart/variant persistence, multi-tab behavior, malformed cached data and a mobile checkout with synthetic checkout-provider responses. Browser tests for actual admin UI, fulfilled orders, email test doubles and production release flows are still outstanding; this task remains unchecked.
  - Partial evidence (2026-09-28, autonomous Task 8): PR #44 adds isolated Chromium browser tests for anonymous admin access, synthetic signed-session UI login/logout, invalid admin product forms and a rejected mocked save, empty order/settings screens, empty storefront search/navigation, mobile menu/overflow and waitlist error/synthetic success. The Playwright dev server explicitly clears inherited provider credentials. `docs/TASK_8_BROWSER_COVERAGE.md` records scope. Browser login and data mutations are mocked where documented; real persisted admin CRUD, populated SSR catalog, order/email workflows, real providers and production release checks remain unverified. Keep this task unchecked.
- [x] Expand CI to run format/lint, typecheck, unit/integration suites, clean build, and required security checks on every PR. <!-- task:TSU-M18-006 -->
  - Evidence (2026-09-28, independent Task 4): PR #41 enforces read-only PR job permissions, obsolete-run cancellation and job timeouts; retains failing build/test/security logs; compares main-branch and PR-merge builds; and adds a workflow self-check, changed-file newline/JSON validation alongside Git diff whitespace checking, critical-severity production dependency auditing, high-severity advisory reporting, static security invariants and negative gate-regression tests. A one-time branch-only lock refresh updated semver-compatible vulnerable dependencies (including Next.js and protobufjs); the privileged temporary workflow was deleted before merge. [Candidate Actions run 36444892013](https://github.com/jenozu/tsuya-tsuya/actions/runs/36444892013) passed initial checks: 89 unit tests, 6 isolated integration tests, zero reported npm audit advisories, security checks, lint, migrations check, TypeScript and Next production build; repeat verification covers this documentation/test-only follow-up. The already-known admin signing-secret fallback remains a flagged owner-verification dependency (TSU-M7-004); GitHub branch protection/release promotion (TSU-M18-007) and a fresh Vercel preview, currently rate-limited, remain separately unverified.
- [ ] Require passing checks and a documented release checklist before merging or promoting production. <!-- task:TSU-M18-007 -->

## M19: Accessibility, SEO, and performance

### Goal
Make the shop discoverable, fast, and usable across devices and browsers.

### Implementation
- [x] Provide root-level Next.js metadata and image components in the current application. <!-- task:TSU-M19-001 -->
- [ ] Audit keyboard navigation, focus visibility, form labels/errors, dialog semantics, contrast, alt text, and screen-reader announcements. <!-- task:TSU-M19-002 -->
- [ ] Test current Chrome, Edge, Firefox, Safari, and mobile browsers; fix documented incompatibilities. <!-- task:TSU-M19-003 -->
- [x] Add per-product canonical metadata, Open Graph images, descriptive titles, and indexing control for admin/preview pages. <!-- task:TSU-M19-004 -->
  - Evidence (2026-09-27): PR #12 added product-specific canonical metadata, titles, description and available HTTPS Open Graph images; PR #15 added explicit noindex to admin/cart/checkout/favourites/thank-you layouts and the mock preview response (alongside preview/under-construction global noindex). [Actions run 36350008171](https://github.com/jenozu/tsuya-tsuya/actions/runs/36350008171) and [run 36350418932](https://github.com/jenozu/tsuya-tsuya/actions/runs/36350418932) passed. Production indexing/Search Console verification remains a separate release task.
- [x] Generate sitemap and robots rules, Product/Breadcrumb structured data, and an intentional URL migration policy. <!-- task:TSU-M19-005 -->
  - Evidence (2026-09-27): PR #12 added a production-only, dynamically generated product-ID sitemap and robots rules; safely escaped Product/Breadcrumb JSON-LD with current variant price/stock; and `docs/SEO_URL_POLICY.md` preserves existing ID URLs until permanent redirects are prepared for any future slug migration. [Actions run 36350008171](https://github.com/jenozu/tsuya-tsuya/actions/runs/36350008171) passed; actual live database and crawler behavior need a separate production check.
- [ ] Implement privacy-conscious analytics with verified consent handling, ecommerce event measurement, and search-console registration. <!-- task:TSU-M19-006 -->
- [ ] Measure Core Web Vitals and optimize image loading, remote image patterns, cache strategy, font loading, and JS bundle. <!-- task:TSU-M19-007 -->

## M20: Monitoring, backups, and recovery

### Goal
Detect production issues quickly and prove that data and orders can be restored.

### Implementation
- [ ] Add structured, redacted request and order-correlation logging with actionable alerting for checkout, webhooks, R2, Neon, and email. <!-- task:TSU-M20-001 -->
- [ ] Configure error monitoring, uptime/health checks, payment and email failure alerts, and incident ownership. <!-- task:TSU-M20-002 -->
  - Partial evidence (autonomous Task 12): PR #48 supplies a no-store, public Git SHA fingerprint route and a local read-only two-domain release/security-header reachability checker with synthetic CI tests. It does not configure external monitoring, alerts or prove a live production or provider smoke test; retain this item unchecked. See `docs/TASK_12_RELEASE_VERIFICATION.md` and `docs/PENDING_LIVE_VERIFICATION.md`.
- [ ] Schedule Neon backups and validate an actual point-in-time or snapshot restore in an isolated environment. <!-- task:TSU-M20-003 -->
- [ ] Enable and document R2 retention/versioning or equivalent asset backup and restore tests. <!-- task:TSU-M20-004 -->
- [x] Establish documented deployment rollback, DNS/domain recovery, webhook replay, manual order reconciliation, and outage communications. <!-- task:TSU-M20-005 -->
  - Evidence (2026-09-28): `docs/RECOVERY_RUNBOOK.md` establishes deployment rollback, DNS/domain recovery, one-event webhook replay boundaries, manual paid-order reconciliation, R2/image recovery, outage communication and recovery-closeout procedures. Actual provider restore/replay drills remain separate verification tasks.
- [ ] Record service costs/limits, SLOs, audit trail requirements, and periodic disaster-recovery drills. <!-- task:TSU-M20-006 -->

## M21: Launch verification and post-launch operations

### Goal
Launch only after payments, fulfillment, compliance, and support work as one system.

### Implementation
- [ ] Verify intended custom domain, HTTPS, DNS, redirects, canonical host, preview separation, and production environment. <!-- task:TSU-M21-001 -->
- [ ] Run full production smoke test on the deployed SHA: catalog → cart → server-side totals → payment → webhook → Neon → email → fulfillment. <!-- task:TSU-M21-002 -->
- [ ] Place and reconcile a controlled live transaction, test a permitted refund, and verify production Stripe/Resend alerts. <!-- task:TSU-M21-003 -->
- [ ] Inspect live mobile/desktop browser UX, destination/tax scenarios, legal links, consent, and accessibility blockers. <!-- task:TSU-M21-004 -->
- [ ] Create a signed launch checklist with owner, evidence links, go/no-go review, and rollback contacts. <!-- task:TSU-M21-005 -->
- [x] Set weekly order/payment reconciliation, customer-support review, inventory updates, backup checks, and performance monitoring. <!-- task:TSU-M21-006 -->
  - Evidence (2026-09-28): `docs/OPERATIONS_CADENCE.md` sets a weekly first-business-day checklist covering payment/order reconciliation, customer-support exceptions, catalog/inventory review, backup readiness, deployment rollback readiness and reliability/performance review, with private/redacted evidence requirements.
- [x] Set monthly dependency/security patching, analytics/SEO review, pricing/shipping/tax policy review, and recovery drills. <!-- task:TSU-M21-007 -->
  - Evidence (2026-09-28): `docs/OPERATIONS_CADENCE.md` sets a monthly first-business-day checklist for dependency/security maintenance, analytics/SEO, pricing/shipping/tax policy review, non-production recovery drills and cost/capacity review. Policy/provider changes still require their separately tracked approvals.

> Do not check off a task merely because code exists. Tasks involving third-party configuration, payments, fulfillment, security, deployment, or launch readiness are complete only after the deployed behavior has been tested and the operating procedure has been documented.
