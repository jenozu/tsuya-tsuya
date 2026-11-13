# PRD: TsuyaNoUchi Print Store

**Status:** APPROVED by the owner on 2026-11-13 (drafted 2026-11-10 from the repository's own documentation).
**Repository:** `jenozu/tsuya-tsuya` (`main`)
**Sources used:** `README.md`, `master_plan.md`, `AUTONOMOUS_EXECUTION_PLAN.md`, `docs/PHASE_2_CATALOG_FULFILLMENT_DECISIONS.md`, `docs/CATALOG_PRICE_INVENTORY.md`, `shipping/*.md`, `MASTER_TAX_TABLE.md`, `package.json`.

## 1. Summary

TsuyaNoUchi (the "House of Lustre" collection) is an online store selling Japanese-inspired art prints. Every product is made to order through Printify. The storefront is a custom Next.js application deployed on Vercel, with production aliases for `tsuyanouchi.com` and `www.tsuyanouchi.com`. The site is built, but launch is not complete. Live payment verification, Printify availability sync, legal and policy content, and several operational checks remain open.

## 2. Goals

- Let shoppers browse, favourite, and buy art prints in a premium, uncluttered storefront.
- Make checkout correct: every amount, shipping charge, tax, size, and availability decision is calculated on the server, never trusted from the browser.
- Keep the store owner's admin tools secure and easy to use for product, image, order, and shipping work.
- Fulfil orders through Printify without showing customers internal quantities or scarcity messaging.
- Reach a launch state that the owner has explicitly approved.

## 3. Non-goals

- No customer-visible stock counts, "only N left" messaging, or invented SKUs. The owner has approved per-size availability, which is private.
- No physical inventory model. Products are made to order.
- No live charges, refunds, production database migrations, or production object deletions as part of validation work.

## 4. Users

- **Shoppers:** desktop and mobile visitors who browse the shop, view product details, and check out.
- **Store owner / administrator:** manages products, images, sizes, prices, availability, CSV imports, orders, shipping rates, and analytics through `/admin`. The current model is a single shared admin login.
- **Operations / support:** handles daily order processing, exceptions, and customer email, using the runbooks in `docs/`.

## 5. What already exists

- Storefront routes: home, shop, product detail (`/shop/[id]`), cart, checkout, favourites, FAQ, shipping, thank-you, under-construction, and preview pages.
- Neon PostgreSQL product catalog with parameterised queries. Product images are uploaded to Cloudflare R2.
- Admin portal: product create, edit, and delete; multiple images with ordering; CSV import; order visibility; shipping management; analytics; Gemini-assisted descriptions.
- Stripe Checkout Session path and a Stripe webhook route with signature verification.
- Waitlist signup and newsletter form.
- Transactional email through Resend with escaped HTML.
- Per-size private availability flag inside the existing sizes data (Phase 2, per `master_plan.md` M6-003 and M6-005).
- CI: an infrastructure guard that runs during the build, lint, unit and integration tests, a dependency audit, and Playwright end-to-end tests.

## 6. Requirements

The roadmap in `master_plan.md` (milestones M1 to M21) is the authoritative task list. This PRD does not duplicate it. The requirements below are the product intent behind it.

**R1. Catalog and sizes.** Each product has a name, a category (used as the series or anime grouping), a description, images, and print sizes. Launch sizes are the eight in `lib/print-sizes.ts`, from 8" x 10" to 24" x 36", with per-size pricing. Each size has a private `available` flag. Customer pages never show numeric stock.

**R2. Discovery and SEO.** Related products prefer other prints in the same category, exclude the current product, and fall back to other catalog products. Page titles use `Character/Product Name - Series/Category - TsuyaNoUchi`, or `Name - TsuyaNoUchi` when the name and category are identical. Disabled sizes make a product's availability reflect only purchasable sizes.

**R3. Cart and checkout integrity.** Cart reconciliation removes a disabled size rather than silently switching to another one. Server-side checkout rejects disabled or discontinued sizes, and derives price, shipping, and tax from server data. Manipulated-request tests cover these cases (roadmap M9, M10, M12).

**R4. Payments and webhooks.** Stripe webhook events are processed idempotently, with durable event and email-delivery records. This is not yet complete (M11-002 to M11-004). Real payments stay disabled until pricing, tax, and destination policy are verified (`AUTONOMOUS_EXECUTION_PLAN.md`, Wave B).

**R5. Fulfilment.** Orders go to Printify on a made-to-order basis. Until a provider connection exists, the owner disables a size manually when Printify cannot fulfil it. Automatic availability sync is an open item.

**R6. Shipping, destinations, and tax.** Shipping rules are documented per region (`shipping/UK.md`, `shipping/EU.md`, `shipping/EFTA-Northern EU.md`, `shipping/AUS.md`) and in `config/shipping-profile.json`. Tax rules are in `MASTER_TAX_TABLE.md` and `lib/tax.ts`. Launch destinations are not yet decided (owner, 2026-11-13: decide later). Tax treatment, destination eligibility, and duty liability need owner and qualified-reviewer decisions before launch (M12, M13).

**R7. Admin security.** Every admin mutation uses session checks and same-origin or CSRF checks, and validates its payload with schemas. Still open: distributed login throttling, session revocation, inactivity timeout, and per-staff audit logs (M7-003, M7-004).

**R8. Image uploads.** Admins upload JPG, PNG, or WebP files up to 10 MB. The server validates each file and writes it to R2. Remote image hosts are restricted to trusted domains. Wildcard remote permissions still need removing (M8-006).

**R9. Email and support.** Transactional email goes through Resend. Sender and recipient values must come from configuration, never sample fallbacks. Public contact details appear only when configured (M2-005, M15).

**R10. Privacy and policies.** Refund, returns, shipping, privacy, and terms content needs owner-approved text. Retention, anonymisation, backup, and restore procedures need documenting (M16, M17).

**R11. Quality gates.** Every change runs the locked install, the infrastructure guard, typecheck, tests, and a clean production build against candidate code. Preview results are checked where available (M18).

**R12. Accessibility, SEO, and performance.** Responsive layouts are tested on real widths and devices. Accessibility, SEO, and performance audits are run (M4, M19).

**R13. Operations.** Monitoring, backups, rollback, and recovery drills are documented and rehearsed. Launch verification is signed off by the owner (M20, M21).

**R14. Payments decisions (owner-confirmed 2026-11-10).**
- Stripe is the only payment processor. Shopify is not used.
- Prices are shown and charged in USD only (about 80%+ of customers are in the US, and Printify fulfilment is US-based).
- Stripe payouts settle in USD to the owner's TD USD account (set as default settlement currency in the Stripe Dashboard).
- Adaptive Pricing is off in the Dashboard and explicitly disabled per Checkout Session in `app/api/checkout/create-session/route.ts`.
- Needs accountant review: US sales tax and Canadian tax obligations.

**R15. Printify order submission (submission built behind `PRINTIFY_ORDERS_ENABLED`, off by default; status/tracking and availability sync not yet built).** After a successful Stripe payment (verified by webhook), the server creates the order through the Printify API, stores the Printify order ID against the order, and handles failure and retry safely and idempotently. Printify order status and tracking are synced back to the order and customer email. Printify availability for sizes is synced automatically or flagged to the admin (replacing the manual toggle in R5). Printify API credentials are server-only secrets. Orders are submitted only after payment is confirmed, never from the browser.

## 7. Constraints

- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zod, Neon PostgreSQL, Cloudflare R2 (S3 API), Stripe, Resend, Google Gemini, Vercel.
- **Package manager:** npm with the committed `package-lock.json`. Keep npm for this repo. The bun default applies to new projects only.
- **Node:** 20 or later locally (per README). CI runs on Node 22 (per `master_plan.md`).
- **Migrations:** forward-only, ordered, and checksummed through `scripts/migrate.mjs`. Do not replay historical SQL files directly.
- **Infrastructure guard:** the production build fails if references to the retired backend or storage provider reappear.
- **Secrets:** never committed, never printed in logs, never exposed through `NEXT_PUBLIC_*` variables.
- **Customer data:** do not log customer addresses, emails, payment metadata, or full provider errors.

## 8. Deployment

- Vercel project `tsuya-tsuya`. `main` tracks production, and pull requests get preview deployments.
- Production domains: `tsuyanouchi.com` and `www.tsuyanouchi.com`.
- Rollback procedure: `AUTONOMOUS_EXECUTION_PLAN.md`. The Vercel project and deployment SHAs were last verified read-only on 2026-09-27 and need re-checking after later merges.

## 9. Decisions only the owner can make

These block launch and must not be decided by an engineer or an AI agent.

1. Final launch product assortment, and artwork rights and licensing.
2. Supported destinations, shipping prices, exclusions, and duty handling.
3. Tax registration and treatment.
4. Refund, returns, and order terms, plus privacy and legal policy text.
5. Business identity, public contact mailbox, and social profiles.
6. Whether Printify availability is synced automatically or managed manually.
7. Who receives order and support notifications.
8. Live Stripe mode and the go-live approval.
9. Resend sender-domain verification.

## 10. Definition of done

- Each roadmap task in `master_plan.md` is checked only when every acceptance criterion has evidence, following the rules in `AUTONOMOUS_EXECUTION_PLAN.md`.
- A real test purchase and webhook round-trip are verified in a controlled environment, with the owner's approval.
- M21 launch verification is complete and signed off by the owner.

## 11. Known gaps and assumptions in this draft

- This draft describes the **custom Next.js store in this repository**. The owner confirmed this is their own custom site (not Shopify), using Stripe for payments.
- The roadmap status (about 67 checklist items done and 74 open at the time of reading) comes from the repository's September 2026 audits. It has not been re-verified against the current `main` or production.
- Printify is named as the fulfilment provider, but the repository contains no Printify API integration; R15 defines it as new work.

## 12. Decision log

| Date | Decision |
|---|---|
| 2026-11-10 | PRD adopted for build. The owner's draft stays the source of truth; `master_plan.md` remains the roadmap and is not duplicated in `.taskmaster/tasks/tasks.json`, which only groups work and cites roadmap ids. |
| 2026-11-10 | master-harness v1.3.1 installed. Work happens on topic branches and PRs; `main` is production on Vercel and is never committed to directly. |
| 2026-11-10 | Setup defaults: npm kept; deployment is Vercel (`tsuyanouchi.com`); Stripe only, USD only, Adaptive Pricing off; agent permissions open with the execution-plan hard stops denied in `.claude/settings.json`. |
| 2026-11-10 | R15 (Printify order submission) added to the plan as new work in phase 3. Printify availability sync vs manual toggle is still an owner decision (section 9, item 6). |
| 2026-11-11 | Owner: lean Black Friday launch. New phase 8 (tasks 47-51: payment-path review, single under-construction setting, policy scaffolding with [OWNER TO SUPPLY] placeholders, email render + configurable sender, docs/LAUNCH_RUNBOOK.md) runs ahead of phases 1-7, together with R15 tasks 16/18/19 and task 46. R15 ships behind PRINTIFY_ORDERS_ENABLED, off by default, mock-tested only; ledger task 10 is no longer a prerequisite for 18 (idempotency via a unique printify_orders row per Stripe session). Goals and non-goals unchanged; hard stops unchanged. |
| 2026-11-11 | R15 design written from Printify's official docs: `docs/PRINTIFY_FULFILLMENT.md`. Stripe Checkout Session id is the Printify order `external_id` (409 = already submitted, treated as success); submission only after the signature-verified Stripe webhook; status via signed Printify webhook (`X-Pfy-Signature`, HMAC-SHA256) plus polling fallback; mapping stored in the existing JSONB sizes; behind a flag. Owner items stay TBD (approval mode, availability sync, alert recipient, account setup). |
| 2026-11-13 | Owner approved the PRD (task 3). R15 wording updated to reflect the flag-gated submission code. Launch destinations deferred: decide later (task 41); R6 regional docs are not a commitment. |
| 2026-11-13 | Owner: agent permissions loosened for build work. `.claude/settings.json` no longer denies or asks for `scripts/migrate.mjs` (--apply, --adopt-baseline, --init-empty); Neon CLI/API commands are not blocked. Standing rule: before any migration or other change to a production Neon branch, create a restore-point branch from production and log its name on the task (see `.claude/rules/rules.md`). Other hard stops (force push, reset --hard, push to main, vercel prod/env, reading .env) stay denied. |

## 13. Open questions (TBD)

- TBD: launch destinations (owner deferred, 2026-11-13; task 41).
- TBD: Printify availability: automatic sync or manual toggle (task 17).
- TBD: whether M3-005, M6-006, M14-004 and M14-005 apply to a made-to-order model (task 27).
- TBD: error-monitoring provider (task 36).

- 2026-11-11 (task 2): master_plan.md re-counted against main (134 commits, PRs through #55): 67 `[x]` done / 74 `[ ]` open, so the snapshot above was correct. No boxes were ticked: every open item with merged work (M8-004 #18, M9-005 #22, M9-006 #45, M17-004 #17/#46, M18-003 #42/#43, M18-005 #38/#44, M3-006/M11-002..004 #47) already carries a "Partial evidence" note listing the unmet criterion. Details in the task 2 log.
