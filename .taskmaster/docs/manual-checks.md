# Manual checks

The phase-runner adds checks here instead of stopping mid-phase. Each item: `### Task <id> - <title> (<date>)`
with numbered steps and the expected result.

- **Agent-checkable:** provable with a running dev server and curl, a script or a query.
  Run them with `/manual-checks run`.
- **Eyes-on:** need a human looking at a screen, a phone, a real device or server. Do them, then tell the lead
  what passed and failed (`/manual-checks results ...`).

## Agent-checkable

## Eyes-on

### Task 47 - Payment path review (2026-11-11)
(Eyes-on) 1. With Stripe CLI in TEST mode, send a signed and an unsigned webhook; expect 200 and 400. 2. Confirm Stripe dashboard webhook endpoint API version matches apiVersion pinned in lib/stripe.ts.

## Task 19 (Printify submission) - eyes-on
- Before setting PRINTIFY_ORDERS_ENABLED=true in any environment: human applies migration 004 (forward JSON) to that DB, otherwise the Stripe webhook returns 500 and Stripe retries.
- Integration suite command needs the loader: node --experimental-strip-types --experimental-loader ./tests/fixtures/admin-route-loader.mjs --test tests/printify-webhook.integration.mjs

### Task 49 - Policy page scaffolding (2026-11-11) - Eyes-on
1. Open /returns, /privacy, /terms: Navbar, Footer and "[OWNER TO SUPPLY]" placeholder render; view source shows meta robots noindex.
2. Footer shows Returns, Privacy, Terms links.

### Task 5.2 - Admin throttle and session ledger cutover (2026-11-13) - Eyes-on
1. Take a Neon restore-point branch, apply migration 005, set ADMIN_AUTH_STORE_ENABLED=true (owner step; existing admin cookies are invalidated).
2. Log in, log out, log in again: all succeed; old cookie after logout is rejected.
3. Submit 6 wrong passwords: the 6th returns 429 with Retry-After.

### Task 6 - Upload limits and key ownership (2026-11-13) - Eyes-on
1. Upload limit (30 per 10 min per IP) is only live once ADMIN_AUTH_STORE_ENABLED=true (see task 5.2 cutover); with the flag off no upload limit applies.
2. Legacy non-uuid product keys (e.g. from scripts/bulk-upload-images.js) cannot be deleted via the admin API; remove them via a separate owner-approved task if needed.

### Task 8 - Branch protection (2026-11-13) - Eyes-on
1. Owner: GitHub Settings > Branches, protect main; require checks verify, baseline-build, candidate-build, browser-e2e, PR required, no force pushes (see docs/CI_QUALITY_GATES.md).
2. Confirm the CI run on the PR is green.

### Task 55 - CSP report-only (2026-11-13)
1. Open storefront home, a product page and checkout cancel/return in Chrome with DevTools Console open. Expected: no "Content Security Policy" report-only violations (record any).
2. Repeat on admin login and admin pages. Expected: same.
3. Confirm R2 and images.unsplash.com images load. Expected: yes.

### Task 53 - Playwright 1.65.1, browser-e2e on ubuntu-latest (2026-11-13)
1. On the PR, confirm infra-guard browser-e2e installs Chromium and passes on ubuntu-latest. Expected: green.
2. Confirm storefront-admin.spec.ts:46 and :91 pass in CI (both fail locally on Windows after admin synthetic login; if :91 fails in CI it is a real regression, possibly Playwright 1.65 behaviour).

### Task 12 - Duplicate checkout, expiry, returning shoppers (2026-11-16)
(Section: Eyes-on) 1. In Stripe test mode, double-click Pay: expect one session. 2. Cancel and retry: expect attempt reused. 3. Let a session expire, retry: expect a fresh session. 4. Complete an order, buy same cart again: expect no CHECKOUT_ALREADY_COMPLETED. Tick TSU-M9-006 only after this.

### Task 10 - Payment-event and email ledger (2026-11-16)
(Section: Agent-checkable once owner supplies disposable Neon DB) 1. Apply migration 003 to the disposable DB only. 2. `npm run test:disposable-db`: expect pass. 3. Before applying 003 to production, create the Neon restore-point branch and seed sent rows for existing orders (see parking-lot 2026-11-16). Roadmap boxes M3-006/M11-002..004 stay unticked until then.

### Task 11 - Order line items (2026-11-16)
(Section: Agent-checkable once owner supplies disposable Neon DB) 1. Apply migration 006 to a disposable branch only. 2. `npm run test:disposable-db`: expect order-line-items integration passes. 3. One test-mode paid checkout: order_line_items has a row per product plus shipping and tax. Before production: restore-point branch first. Leave TSU-M10-005 unticked until then.

### Task 14 - Reconciliation procedure (2026-11-16)
(Section: Eyes-on) 1. Read the "Stripe-to-Neon reconciliation" section of docs/DAILY_ORDER_RECOVERY.md; expect a runnable read-only procedure. 2. Decide schedule, reviewer and refund recording (listed as pending in the doc).

### Task 20 - Printify status/tracking webhook and admin display (2026-11-16)
1. On a non-production DB with migration 007 applied (restore-point branch first for prod) and PRINTIFY_ORDERS_ENABLED on, POST a signed order:shipment:created fixture to /api/webhooks/printify. Expected: 200, one shipped email to a safe recipient.
2. Open /admin > Orders. Expected: "Printify: shipped · carrier · number · track" with a working link.
3. Confirm the real Printify payload fields (carrier, tracking_number, tracking_url) against a simulated event.

### Task 21 - Printify availability sync (2026-11-16)
1. With admin login and Printify sandbox credentials, open the Unavailable modal and click "Sync availability from Printify". Expected: warning list fills; a turned-off size shows unavailable on /shop/<id>; no counts visible to customers.

### Task 23 - Admin order details and fulfilment states (2026-11-16)
1. Log in at /admin, Orders tab, click an order id. Expected: payment, ship-to, items, totals shown.
2. A processing order shows only "Mark shipped"; a shipped order only "Mark delivered"; no cancel button; refund note visible.
