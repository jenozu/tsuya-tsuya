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
