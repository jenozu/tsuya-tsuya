# Black Friday launch runbook (task 51)

Human-run smoke test for the lean Black Friday launch. Agents do not run these steps. Each step names who acts, what to do, and what a pass looks like.

**Markers**
- **[REAL MONEY]**: moves real money (a live Stripe charge or refund, or a Printify order that bills the merchant).
- **[LIVE]**: touches a live provider or production (production database, production deployment, live Stripe, live Printify, live email).

**Hard stops (from the PRD and AGENTS.md)**
- No live charges or refunds without the owner's explicit approval for that specific order.
- No production database changes without the owner's approval and a reviewed rollback plan.
- No `vercel --prod`, rollback, promote, or `vercel env pull`.
- Never paste secret values, customer addresses, emails, or payment metadata into any doc, ticket, or chat. Refer to env var **names** only.

**Owner-only decisions (not made in this runbook)**
- Policy text for `/returns`, `/privacy`, `/terms`.
- The sender address for `RESEND_FROM_EMAIL` and the notification recipient `ORDER_NOTIFICATION_EMAIL`.
- Pricing, shipping, tax, destinations, and whether live Printify orders are approved.
- Printify approval mode (automatic 24 h vs manual). Manual is recommended until the first test order is verified.

## Related documents (read, do not overwrite)

| Document | Use in this runbook |
|---|---|
| [docs/TASK_12_RELEASE_VERIFICATION.md](TASK_12_RELEASE_VERIFICATION.md) | Release SHA check with `npm run verify:release` after each production deployment. |
| [docs/PENDING_LIVE_VERIFICATION.md](PENDING_LIVE_VERIFICATION.md) | Owner's deferred checklist. Tick items there only with evidence. |
| [docs/PRINTIFY_FULFILLMENT.md](PRINTIFY_FULFILLMENT.md) | Printify design, env names, the `PRINTIFY_ORDERS_ENABLED` rule, owner decisions. |
| [docs/PAYMENT_PATH_REVIEW.md](PAYMENT_PATH_REVIEW.md) | Stripe checkout and webhook checks already reviewed (test-mode checks still open). |
| [docs/DAILY_ORDER_RECOVERY.md](DAILY_ORDER_RECOVERY.md) | What to do with a paid order that is missing, or a Printify order that needs attention. |

Environment variable names are listed in [ENV_TEMPLATE.md](../ENV_TEMPLATE.md). Use that file for names only.

## Preflight (before any step below)

| # | Who | [markers] | Action | Expected result |
|---|---|---|---|---|
| P1 | Maintainer | none | On a fresh checkout of the reviewed `main` commit, run `npm ci`, then `npm test --silent`, `npx tsc --noEmit`, `npm run lint --silent`, `npm run build`. | All pass. Build runs `verify:infra` first and passes. |
| P2 | Owner | none | Confirm the PR for this launch is merged and the owner has approved the production deployment. | Owner confirms in writing (private channel). |
| P3 | Owner | [LIVE] | Confirm the production deployment is READY and matches the reviewed SHA: `npm run verify:release -- --sha <FULL-REVIEWED-MAIN-COMMIT> --origin https://tsuyanouchi.com --secondary https://www.tsuyanouchi.com --require-hsts` (see TASK_12 doc). | Exit code 0. A 200 on `/` can still be the under-construction or password page. |

## A. Database migration 004 (Printify orders)

Do this before setting `PRINTIFY_ORDERS_ENABLED=true` anywhere. Without the table, the Stripe webhook returns 500 and Stripe retries. Migration 003 is staged and is **not** part of this step unless the owner approves it separately.

| # | Who | [markers] | Action | Expected result |
|---|---|---|---|---|
| A1 | Owner + DB operator | [LIVE] | Take and verify a Neon backup/branch of the production database and record a rollback plan. | Backup ID recorded privately. |
| A2 | DB operator | [LIVE] | Rehearse first on an isolated Neon test database: `node scripts/migrate.mjs --status`, then `node scripts/migrate.mjs --apply --confirm-reviewed-backup`, using that test `DATABASE_URL` in the operator's terminal. | Migration 004 applied once; a second `--status` shows it applied. No errors. |
| A3 | DB operator | [LIVE] | Run `node scripts/migrate.mjs --status` against production (read-only) and record the output. | Shows 004 pending before the change and nothing unexpected. |
| A4 | Owner + DB operator | [LIVE] | With the owner's explicit approval, run `node scripts/migrate.mjs --apply --confirm-reviewed-backup --confirm-production-change` against production. | 004 applied. Run `--status` again. |
| A5 | DB operator | [LIVE] | Confirm the `printify_orders` table exists using a read-only query (no rows printed). | Table present. |

## B. `PRINTIFY_ORDERS_ENABLED` flag

Default is **off**. Only the exact value `true` enables it. The Printify variables `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID`, and `PRINTIFY_WEBHOOK_SECRET` are server-only and must never be `NEXT_PUBLIC_*`.

| # | Who | [markers] | Action | Expected result |
|---|---|---|---|---|
| B1 | Owner | none | Confirm the flag stays `false` for the launch unless the owner approves live Printify orders (decision in PRINTIFY_FULFILLMENT section 9). | Written decision. |
| B2 | Owner | [LIVE] | Only after A4: set `PRINTIFY_ORDERS_ENABLED=true` in the Vercel Production environment, and the Printify token, shop ID, and webhook secret. Redeploy. | Deployment READY. The flag is server-only. |
| B3 | Maintainer | [LIVE] | Confirm, through the Vercel dashboard only, that the variable names exist and are not exposed as `NEXT_PUBLIC_*`. Do not copy values. | Names present, no values shared. |
| B4 | Owner | [LIVE] | If anything goes wrong, set `PRINTIFY_ORDERS_ENABLED=false` and redeploy. Paid orders still save and emails still send with the flag off. | Flag off; storefront unaffected. |

## C. Under-construction switch

`NEXT_PUBLIC_UNDER_CONSTRUCTION` is the single switch (`lib/under-construction.ts`). Only the exact string `true` turns it on. Unset or any other value means off. It is inlined at build time, so **every change needs a redeploy**.

| # | Who | [markers] | Action | Expected result |
|---|---|---|---|---|
| C1 | Owner | [LIVE] | Decide whether the store opens publicly at launch. Set `NEXT_PUBLIC_UNDER_CONSTRUCTION` to `false` (or unset) in Production, then redeploy. | Deployment READY. |
| C2 | Maintainer | [LIVE] | Open the homepage, then `/under-construction` as a shopper would. With the switch off, the storefront must show. | Storefront loads. Under-construction page is not shown to shoppers. |
| C3 | Maintainer | none | Keep the switch `true` while any step below is still failing. Robots and noindex apply to previews and under-construction environments (SEO_URL_POLICY). | Previews show `noindex`. |

## D. Policy pages (placeholders until owner text is supplied)

`/returns`, `/privacy`, and `/terms` are noindex placeholders showing `[OWNER TO SUPPLY]`. They must not be presented as final legal text.

| # | Who | [markers] | Action | Expected result |
|---|---|---|---|---|
| D1 | Owner | none | Supply final returns, privacy, and terms text (owner-only; PRD section 9). Until then, the placeholders stay. | Owner text approved in writing. |
| D2 | Maintainer | [LIVE] | Open `/returns`, `/privacy`, and `/terms` on the production URL. View source. | Navbar and footer render. `<meta name="robots" content="noindex">` is present. Placeholder text visible. |
| D3 | Maintainer | none | Replace placeholders only after D1 and a reviewed PR. Remove `noindex` only when the owner approves indexing. | Placeholder removed in a reviewed change. |

## E. Transactional emails

Order and shipped emails are sent through Resend. The sender comes **only** from `RESEND_FROM_EMAIL`, and the owner notification comes from `ORDER_NOTIFICATION_EMAIL`. Missing or example/placeholder addresses fail closed; nothing falls back to sample addresses.

| # | Who | [markers] | Action | Expected result |
|---|---|---|---|---|
| E1 | Owner | none | Choose the sender address on a domain verified in Resend (owner decision). Choose the owner notification mailbox. | Written decision. |
| E2 | Owner | [LIVE] | Set `RESEND_FROM_EMAIL`, `ORDER_NOTIFICATION_EMAIL`, and `RESEND_API_KEY` in Production (names in ENV_TEMPLATE.md). Redeploy. | Deployment READY. No values in chat or docs. |
| E3 | Maintainer | [LIVE] | Use the Stripe test-mode order in section F to trigger the order confirmation to the owner's safe test mailbox. | Email arrives from the configured sender. No fallback sender. |
| E4 | Maintainer | [LIVE] | If emails are missing, check the Resend dashboard delivery log (redacted). Do not resend Stripe events blindly (DAILY_ORDER_RECOVERY). | Cause found or escalated to owner. |

## F. Stripe test-mode smoke order (no money)

Checkout is Stripe only, USD only, Adaptive Pricing off. Use **test-mode** keys (`sk_test_`, `pk_test_`, and a test webhook secret).

| # | Who | [markers] | Action | Expected result |
|---|---|---|---|---|
| F1 | Maintainer | [LIVE] | In a Preview or staging deployment with test keys, add a product, go to checkout, and pay with a Stripe test card. | Checkout session created. Totals match the server-side price. |
| F2 | Maintainer | [LIVE] | Using the Stripe CLI in test mode, send a signed webhook to `/api/webhooks/stripe` and an unsigned one. | Signed: 200. Unsigned: 400. Duplicate delivery does not create a second order. |
| F3 | Maintainer | none | Cancel or expire a checkout and return to the store. | No order created; the user is informed. |
| F4 | Owner | [LIVE] | Check the Stripe dashboard webhook API version matches the `apiVersion` pinned in `lib/stripe.ts` (PAYMENT_PATH_REVIEW finding 1). | Versions match. |

## G. Stripe live smoke order [REAL MONEY] [LIVE]

Only with the owner's explicit approval for that single order. This charges a real card. Refund it afterwards.

| # | Who | [markers] | Action | Expected result |
|---|---|---|---|---|
| G1 | Owner | [REAL MONEY] [LIVE] | Approve, in writing, one low-value live order to be placed and refunded by the owner. | Written approval recorded privately. |
| G2 | Owner | [REAL MONEY] [LIVE] | Place the order on the production storefront with the live card, using the owner's own shipping details. | Order saved and confirmation email sent. Stripe shows a paid session. |
| G3 | Owner | [REAL MONEY] [LIVE] | Check the Stripe dashboard shows one payment for the expected amount in USD. Check the admin order has one row. | One payment, one order. |
| G4 | Owner | [REAL MONEY] [LIVE] | Refund the payment in the Stripe dashboard (human action, never automatic). | Refund shows in Stripe; order status updated per admin. |
| G5 | Owner | [LIVE] | If `PRINTIFY_ORDERS_ENABLED=true`, go to section H before refunding, so the Printify order can be cancelled first. | See H. |

## H. Printify test order and cancel [REAL MONEY] [LIVE]

Printify has no sandbox in its docs (PRINTIFY_FULFILLMENT section 10). A Printify order is real and may bill the merchant. Only run this step with the owner's approval and with the flag on in Production. Prefer manual approval in the Printify shop before this step, so nothing reaches production by accident.

| # | Who | [markers] | Action | Expected result |
|---|---|---|---|---|
| H1 | Owner | [REAL MONEY] [LIVE] | Set the Printify shop to **manual approval** in the Printify dashboard. | Manual approval shown. |
| H2 | Owner | [REAL MONEY] [LIVE] | Use the approved live smoke order from G. The webhook submits one Printify order keyed on the Stripe session ID. | Admin shows the Printify submission as submitted (or needs attention, with a code only). |
| H3 | Owner | [LIVE] | In the Printify dashboard, find the order with the Stripe session ID as `external_id`. Confirm there is exactly one. | One order found. |
| H4 | Owner | [REAL MONEY] [LIVE] | Cancel the Printify order in the Printify dashboard before it is sent to production. Do not send to production. | Order canceled. No production or shipping charge. |
| H5 | Owner | [LIVE] | Confirm the redelivered Stripe event does not create a second Printify order (retry the event from the Stripe dashboard only if the owner approves). | Still one Printify order (now canceled). |
| H6 | Owner | [REAL MONEY] [LIVE] | Refund the Stripe payment from G4 after the Printify cancel. | Refund in Stripe. |

If H2 shows **needs attention**, follow DAILY_ORDER_RECOVERY "Printify submission". Do not resubmit or edit the database by hand.

## I. Go / no-go

| # | Who | [markers] | Action | Expected result |
|---|---|---|---|---|
| I1 | Owner | none | Record the release SHA, the migration state, the flag values (names and on/off only), the under-construction state, and the outcomes of F, G, and H in PENDING_LIVE_VERIFICATION with evidence. | Recorded. No secrets, customer data, or payment metadata. |
| I2 | Owner | none | Decide go or no-go for public launch. | Written decision. |

## Rollback quick reference (each change below is a [LIVE] production redeploy)

- Storefront problem: set `NEXT_PUBLIC_UNDER_CONSTRUCTION=true`, redeploy.
- Printify problem: set `PRINTIFY_ORDERS_ENABLED=false`, redeploy. Paid orders and emails are unaffected.
- Payment problem: follow [PAYMENT_INCIDENT_RESPONSE.md](PAYMENT_INCIDENT_RESPONSE.md). Do not replay Stripe events or insert orders by hand.
- Database problem: restore only from the reviewed backup, with owner approval.
