# Tsuya — Master Plan

Repository audited: `jenozu/tsuya-tsuya` (`main`), September 24, 2026. Existing canonical operational checklist: `MASTER_LIST.md` (preserved). Status marked complete below means directly evidenced *repository implementation*, not an assertion of newly executed live verification. Historical deployment/testing claims in `MASTER_LIST.md` require fresh verification where launch-critical. Source audit includes source and API routes, migrations, environment template, Vercel/CI configuration, docs, and recent commits. Do not put credentials or customer data in this file.

## M1: Repository foundation and deployment

### Goal
Establish an auditable Next.js foundation and reproducible deployment before expanding features.

### Implementation
- [x] Keep the Next.js/TypeScript application and lockfile in the canonical repository (`package.json`, `package-lock.json`). <!-- task:TSU-M1-001 -->
- [x] Keep Vercel framework/build configuration (`vercel.json`) and deployment instructions (`README.md`). <!-- task:TSU-M1-002 -->
- [x] Run the existing Neon/R2 infrastructure guard from the production build and pull-request workflow. <!-- task:TSU-M1-003 -->
- [ ] Verify the current default-branch build with dependency installation, `npm run verify:infra`, typecheck, and production build; retain logs. <!-- task:TSU-M1-004 -->
- [ ] Fix `next.config.ts` build-error suppression; make TypeScript failures block builds and verify a clean build. <!-- task:TSU-M1-005 -->
- [ ] Replace or repair the `next lint` script for the installed Next.js version and enforce linting in CI. <!-- task:TSU-M1-006 -->
- [ ] Confirm Vercel production/preview projects, `main` tracking, rollback procedure, and deployed commit SHA against the live dashboard. <!-- task:TSU-M1-007 -->
- [ ] Consolidate historical setup notes around `MASTER_LIST.md` and this roadmap without treating historical claims as fresh verification. <!-- task:TSU-M1-008 -->

## M2: Environment and service configuration

### Goal
Set up deployment-specific integrations without exposing credential values.

### Implementation
- [x] Document required Neon, R2, Stripe, Resend, admin, and preview variable names in `ENV_TEMPLATE.md`. <!-- task:TSU-M2-001 -->
- [x] Use server-only Neon and R2 helper modules (`lib/db.ts`, `lib/r2.ts`). <!-- task:TSU-M2-002 -->
- [ ] Audit production and preview variable *names and scopes* in Vercel without retrieving or committing values; confirm missing-variable handling. <!-- task:TSU-M2-003 -->
- [ ] Independently verify production Neon connection, R2 read/write/delete access, Stripe mode, Resend sender/domain, and preview isolation. <!-- task:TSU-M2-004 -->
- [ ] Remove any reliance on sample fallback destinations, sender values, or placeholder account details in production. <!-- task:TSU-M2-005 -->
- [ ] Document ownership, least-privilege access, credential rotation, incident revocation, and a safe configuration checklist. <!-- task:TSU-M2-006 -->

## M3: Database schema and migrations

### Goal
Make the current Neon data model reproducible, constrained, and safe to evolve.

### Implementation
- [x] Keep baseline Neon SQL for products, orders, shipping rates, favorites, and waitlist (`migrations/002_neon_r2_schema.sql`). <!-- task:TSU-M3-001 -->
- [x] Use parameterized Neon queries for structured product and order access (`lib/data.ts`). <!-- task:TSU-M3-002 -->
- [ ] Introduce ordered, repeatable migrations and a migrations ledger for all subsequent schema changes. <!-- task:TSU-M3-003 -->
- [ ] Verify baseline schema and migrations apply cleanly to a blank test database and upgrade a production-like copy without data loss. <!-- task:TSU-M3-004 -->
- [ ] Add normalized variant/SKU/inventory tables or rigorously validated JSONB constraints, as dictated by the selected fulfillment model. <!-- task:TSU-M3-005 -->
- [ ] Add persistent Stripe event and email-delivery records plus order/line-item/payment uniqueness constraints for retry safety. <!-- task:TSU-M3-006 -->
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
- [ ] Decide and implement durable SEO-friendly slugs or rename `[slug]` to reflect its current ID lookup; preserve old product URLs. <!-- task:TSU-M5-005 -->
- [ ] Test CSV creation/update, invalid rows, duplicate names, image filename mapping, transaction safety, and re-import reporting using R2 assets. <!-- task:TSU-M5-006 -->
- [ ] Validate catalog copy, art-print product types, image rights/licensing, and the final launch assortment. <!-- task:TSU-M5-007 -->

## M6: Variants, prices, and inventory

### Goal
Create a single authoritative SKU, price, and stock model.

### Implementation
- [x] Store a base price, overall stock, and per-size pricing data in the product model. <!-- task:TSU-M6-001 -->
- [x] Expose size selection and size-dependent displayed pricing in the product-detail UI. <!-- task:TSU-M6-002 -->
- [ ] Define unique sellable SKUs and whether stock is shared or per-size; implement the approved model. <!-- task:TSU-M6-003 -->
- [ ] Validate variant structure, supported print sizes, price precision, and stock bounds server-side in admin and import endpoints. <!-- task:TSU-M6-004 -->
- [ ] Keep listings, cart, checkout, and admin inventory consistent after edits and discontinued variants. <!-- task:TSU-M6-005 -->
- [ ] Atomically reserve/decrement available inventory at the correct payment stage; prevent overselling and release failed/expired holds. <!-- task:TSU-M6-006 -->
- [ ] Document catalog price changes, out-of-stock rules, and manual stock reconciliation. <!-- task:TSU-M6-007 -->

## M7: Admin authentication and product management

### Goal
Secure and verify the tools used to maintain the store.

### Implementation
- [x] Implement signed, HTTP-only admin session cookies and protected product-write routes. <!-- task:TSU-M7-001 -->
- [x] Implement admin product creation, edit/delete handlers, a bulk-delete route, and an admin dashboard UI. <!-- task:TSU-M7-002 -->
- [ ] Verify create/edit/delete/bulk-delete behavior on the deployed admin, including undo/safeguards and downstream image/order references. <!-- task:TSU-M7-003 -->
- [ ] Add login throttling, strong credential policy, session revocation, inactivity timeout, and production-safe secret separation. <!-- task:TSU-M7-004 -->
- [ ] Apply explicit server-side authorization and method/origin/CSRF checks to every admin mutation and preview-management endpoint. <!-- task:TSU-M7-005 -->
- [ ] Validate product payloads consistently with schemas and verify forbidden/invalid requests cannot change data. <!-- task:TSU-M7-006 -->
- [ ] Document administrator access recovery, staff permissions (if needed), audit logs, and a change-management procedure. <!-- task:TSU-M7-007 -->

## M8: Image uploads and object storage

### Goal
Manage secure, fast, and traceable storefront artwork assets.

### Implementation
- [x] Implement authenticated JPG/PNG/WebP upload to R2 and a protected object-deletion route. <!-- task:TSU-M8-001 -->
- [x] Provide stored-image URL metadata and an image upload helper for the admin. <!-- task:TSU-M8-002 -->
- [ ] Reverify live admin upload, URL rendering, object deletion, ordering, and CSV-import mapping on the current deployment. <!-- task:TSU-M8-003 -->
- [ ] Constrain file byte signatures, pixel dimensions, total upload rate, and object ownership; reject masquerading formats. <!-- task:TSU-M8-004 -->
- [ ] Define and implement derivative generation, thumbnails, image compression, responsive sizes, and safe caching. <!-- task:TSU-M8-005 -->
- [ ] Restrict `next.config.ts` remote-image hosts to trusted domains and remove blanket HTTP wildcard allowance. <!-- task:TSU-M8-006 -->
- [ ] Define orphan cleanup, image replacement safeguards, watermark/licensing workflow, and an R2 recovery plan. <!-- task:TSU-M8-007 -->

## M9: Cart and checkout preparation

### Goal
Keep cart behavior predictable and make checkout inputs trustworthy.

### Implementation
- [x] Implement localStorage-backed cart persistence, variant-aware item grouping, and quantity controls. <!-- task:TSU-M9-001 -->
- [x] Provide checkout address UI with form validation and a shipping-rate request. <!-- task:TSU-M9-002 -->
- [ ] Test cart persistence across refreshes, variant changes, multi-tab edits, invalid cached items, quantity limits, and mobile checkout. <!-- task:TSU-M9-003 -->
- [ ] Requery current catalog/variant prices and availability when entering checkout; never trust stored cart prices. <!-- task:TSU-M9-004 -->
- [ ] Validate checkout email/address and destination values on the server using shared schemas. <!-- task:TSU-M9-005 -->
- [ ] Prevent duplicate checkout submissions and handle session expiry, cancellation, and returning shoppers. <!-- task:TSU-M9-006 -->

## M10: Stripe test checkout and order integrity

### Goal
Make sandbox checkout provably correct before enabling real payments.

### Implementation
- [x] Implement Stripe Checkout Session creation, signed webhook verification, and initial paid-order persistence logic. <!-- task:TSU-M10-001 -->
- [ ] Replace client-submitted item names/prices/subtotal/shipping/tax in `/api/checkout/create-session` with validated, server-derived catalog and policy totals. <!-- task:TSU-M10-002 -->
- [ ] Lock down `successUrl`/`cancelUrl` to approved site origins and remove untrusted origin-based redirects. <!-- task:TSU-M10-003 -->
- [ ] Disable or fully harden client-amount-driven `/api/payments/create-intent` and `/api/payments/update-intent` endpoints. <!-- task:TSU-M10-004 -->
- [ ] Persist authoritative order line items with product ID, variant/SKU, unit price, currency, and captured shipping/tax breakdown. <!-- task:TSU-M10-005 -->
- [ ] Run and document sandbox cases: paid, failed, canceled, duplicate submission, changed price, stale stock, invalid destination, and manipulated requests. <!-- task:TSU-M10-006 -->
- [ ] Reverify sandbox webhook→Neon→Resend outcome after completing server-side pricing changes. <!-- task:TSU-M10-007 -->

## M11: Stripe webhooks and production payments

### Goal
Make payment processing idempotent, observable, and recoverable.

### Implementation
- [x] Use the Stripe signature verification helper and handle checkout, success, failure, and cancellation event categories in webhook code. <!-- task:TSU-M11-001 -->
- [ ] Persist unique Stripe event/session/payment identifiers and claim each event transactionally to prevent concurrent duplicate processing. <!-- task:TSU-M11-002 -->
- [ ] Make order creation, stock updates, and notifications safely retryable; prevent lost email when an order already exists. <!-- task:TSU-M11-003 -->
- [ ] Handle out-of-order and delayed payment events, Stripe retries, request timeouts, and webhook recovery queues. <!-- task:TSU-M11-004 -->
- [ ] Reconcile Stripe paid/refunded amounts to Neon order records with a documented scheduled or manual procedure. <!-- task:TSU-M11-005 -->
- [ ] Verify live-mode credentials, live webhook endpoint/signature, allowed methods/currencies, fraud settings, and one controlled live purchase/refund. <!-- task:TSU-M11-006 -->
- [ ] Document payment incident response, reprocessing steps, settlement checks, and production rollback. <!-- task:TSU-M11-007 -->

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
- [ ] Document daily order processing, customer issue escalation, and manual recovery of paid orders lacking an order record. <!-- task:TSU-M14-006 -->

## M15: Transactional email and support

### Goal
Communicate critical order events reliably and offer accessible support.

### Implementation
- [x] Implement Resend customer confirmation and owner order-notification email templates and send helpers. <!-- task:TSU-M15-001 -->
- [x] Provide waitlist signup route and newsletter input components. <!-- task:TSU-M15-002 -->
- [ ] Validate email delivery against current test orders; add durable send status, retry, failure alerts, and duplicate suppression. <!-- task:TSU-M15-003 -->
- [ ] Escape customer/product fields in outbound HTML and minimize personally identifiable information in application logs. <!-- task:TSU-M15-004 -->
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
- [ ] Eliminate logging of sensitive order data and payment metadata; redact errors returned to public endpoints. <!-- task:TSU-M17-005 -->
- [ ] Review dependencies, R2 bucket exposure, image upload abuse, preview access, and admin session fallback behavior. <!-- task:TSU-M17-006 -->
- [ ] Rotate compromised/old secrets through provider dashboards, verify revoked credentials no longer work, and document routine rotation. <!-- task:TSU-M17-007 -->
- [ ] Review artwork/IP commercialization rights and required consumer notices for each selling region. <!-- task:TSU-M17-008 -->

## M18: Automated tests and continuous integration

### Goal
Prevent regressions and demonstrate that critical checkout behavior works.

### Implementation
- [x] Run the repository's existing infrastructure-reference guard on pull requests. <!-- task:TSU-M18-001 -->
- [ ] Add unit tests for tax, shipping, variant pricing, cart calculations, address validation, and CSV parsing. <!-- task:TSU-M18-002 -->
- [ ] Add integration tests for product CRUD, authorized/unauthorized admin actions, order creation, R2 upload validation, and test database migration. <!-- task:TSU-M18-003 -->
- [ ] Add Stripe sandbox/webhook tests for tampered prices, invalid destinations, retries, concurrent duplicates, refunds, and out-of-order events. <!-- task:TSU-M18-004 -->
- [ ] Add end-to-end browser tests covering mobile storefront, cart, checkout, admin operations, email test doubles, and error states. <!-- task:TSU-M18-005 -->
- [ ] Expand CI to run format/lint, typecheck, unit/integration suites, clean build, and required security checks on every PR. <!-- task:TSU-M18-006 -->
- [ ] Require passing checks and a documented release checklist before merging or promoting production. <!-- task:TSU-M18-007 -->

## M19: Accessibility, SEO, and performance

### Goal
Make the shop discoverable, fast, and usable across devices and browsers.

### Implementation
- [x] Provide root-level Next.js metadata and image components in the current application. <!-- task:TSU-M19-001 -->
- [ ] Audit keyboard navigation, focus visibility, form labels/errors, dialog semantics, contrast, alt text, and screen-reader announcements. <!-- task:TSU-M19-002 -->
- [ ] Test current Chrome, Edge, Firefox, Safari, and mobile browsers; fix documented incompatibilities. <!-- task:TSU-M19-003 -->
- [ ] Add per-product canonical metadata, Open Graph images, descriptive titles, and indexing control for admin/preview pages. <!-- task:TSU-M19-004 -->
- [ ] Generate sitemap and robots rules, Product/Breadcrumb structured data, and an intentional URL migration policy. <!-- task:TSU-M19-005 -->
- [ ] Implement privacy-conscious analytics with verified consent handling, ecommerce event measurement, and search-console registration. <!-- task:TSU-M19-006 -->
- [ ] Measure Core Web Vitals and optimize image loading, remote image patterns, cache strategy, font loading, and JS bundle. <!-- task:TSU-M19-007 -->

## M20: Monitoring, backups, and recovery

### Goal
Detect production issues quickly and prove that data and orders can be restored.

### Implementation
- [ ] Add structured, redacted request and order-correlation logging with actionable alerting for checkout, webhooks, R2, Neon, and email. <!-- task:TSU-M20-001 -->
- [ ] Configure error monitoring, uptime/health checks, payment and email failure alerts, and incident ownership. <!-- task:TSU-M20-002 -->
- [ ] Schedule Neon backups and validate an actual point-in-time or snapshot restore in an isolated environment. <!-- task:TSU-M20-003 -->
- [ ] Enable and document R2 retention/versioning or equivalent asset backup and restore tests. <!-- task:TSU-M20-004 -->
- [ ] Establish documented deployment rollback, DNS/domain recovery, webhook replay, manual order reconciliation, and outage communications. <!-- task:TSU-M20-005 -->
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
- [ ] Set weekly order/payment reconciliation, customer-support review, inventory updates, backup checks, and performance monitoring. <!-- task:TSU-M21-006 -->
- [ ] Set monthly dependency/security patching, analytics/SEO review, pricing/shipping/tax policy review, and recovery drills. <!-- task:TSU-M21-007 -->

> Do not check off a task merely because code exists. Tasks involving third-party configuration, payments, fulfillment, security, deployment, or launch readiness are complete only after the deployed behavior has been tested and the operating procedure has been documented.
