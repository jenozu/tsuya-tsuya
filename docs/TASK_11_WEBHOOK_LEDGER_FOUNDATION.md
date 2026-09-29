# Task 11 — webhook payment-transition safety and staged durable ledger

**Scope:** self-contained repository work, no real Stripe traffic and no Neon migration executed. No user-facing financial policy is chosen here.

## What this PR changes immediately

- `payment_intent.payment_failed` and `payment_intent.canceled` call a narrow SQL update that **atomically excludes already-paid or refunded orders** and rejects event/payment-intent mismatches. A stale event can no longer downgrade a paid order between read and write. Missing unpaid orders are recorded using non-identifying event labels; database errors produce HTTP 500 for Stripe retry rather than false success.
- `payment_intent.succeeded` now refuses to rewind already-paid fulfilment, rejects mismatched intent IDs and advances only a pending order matching the signed intent. If Stripe reports payment succeeded but the matching Checkout Session is temporarily absent or still reports an unsettled state, the endpoint returns HTTP 500 so a later Stripe delivery can retry rather than permanently acknowledging an unpersisted paid order.
- A completed Checkout UI session must explicitly report `payment_status='paid'` before it can create an order or send mail. Unpaid/deferred sessions wait for settlement.
- The existing Stripe signature check is unchanged. No raw Stripe data, customer email or provider exceptions are added to application logs.

## Staged schema, not activated

The migration `003_payment_delivery_foundation` defines durable keyed payment-event and order-email-delivery records and indexes for future retry claims. It is intentionally **not wired into the live webhook** until the isolated database/upgrade and concurrency tests are performed and production backups/migration approval are verified. This avoids creating an immediate production dependency on un-applied tables. It does **not** yet prevent multiple concurrently delivered paid completion events from both sending emails, repair a previous paid order with unsent emails or establish exactly-once external email delivery. `createOrder`'s existing upsert and stock reservation also require separate payment-order transaction work.

## Evidence and pending manual checks

- `tests/stripe-webhook-safety.integration.mjs` sends fake signed events into the real webhook handler, replacing only Stripe, database, email and request-context integrations with zero-network synthetic doubles. It covers deferred completion, repeat delivery, out-of-order failure/cancellation, mismatched payment intents, recoverable missing paid sessions and persistence failure. The synthetic signature marker does **not** verify Stripe's real cryptographic HMAC.
- `tests/payment-ledger-migration.test.mjs` and `npm run migrations:check` validate the additive manifest offline and protect its checksum/order. Real SQL uniqueness, concurrent claims and full migrations can be checked by the operator-only `npm run test:disposable-db` on a **new, empty, explicitly acknowledged** isolated Neon branch/database. No disposable database was connected during this PR.
- **Before enabling an outbox**: run a verified isolated blank bootstrap + production-like upgrade, implement and test database-backed event lease takeover and email worker state, provider idempotency and recovery queues, and decide what to do with existing paid orders whose email may have failed. Avoid enabling code that depends on `003` until schema migration and backup/restore are verified.
- **Before live transactions**: run genuine Stripe test-mode signed webhook/payment replay, concurrent duplicates and deferred/expired/refunded event sequences; verify delivery with safe Resend recipients and the Vercel live domain manually.

The original user-requested deferred storefront/admin/Stripe/database/email production smoke checks are recorded in `docs/PENDING_LIVE_VERIFICATION.md`. Check whether Tasks 10–11 have been manually promoted after their merges; READY CI and Vercel preview builds alone cannot establish that production has them.

**Roadmap:** partial groundwork toward TSU-M11-002/003/004, TSU-M3-006 and TSU-M18-004. Keep these unchecked.
