# Stripe payment incident response and settlement checks

Version: repository procedure, 2026-09-28. Designed for the existing signed Stripe Checkout webhook and Neon order store; **not evidence of a successful live Stripe connection, completed refund or safe automatic event replay**.

## Incident triggers and immediate handling

An incident includes a confirmed paid Stripe Checkout Session with no corresponding Neon order, mismatched totals, duplicate emails/charges, delayed/failed webhooks, refund disputes, server-side pricing discrepancies, or unexpected payment-method/currency configuration. The store owner (payment account owner) controls any live Stripe action; an authorized technical operator handles code logs and non-destructive database checks.

1. Capture the GitHub/Vercel **deployed SHA**, incident UTC start/end, affected **reference IDs only**, Stripe environment (test vs live), and whether checkout is actively receiving payments. Never paste payment metadata, customer addresses, card information, API keys or unredacted provider error objects into tickets.
2. If new transactions could be incorrectly priced, double-charged, or lose order records, have the owner **pause checkout** while preserving access to already-paid orders and provider evidence.
3. Check Vercel deployment health, recent database errors, configured provider variable **names/scopes only**, redacted app logs and the relevant Stripe dashboard/webhook event delivery status for the **matching mode**. A READY Vercel build does not prove provider connectivity.
4. Do not issue a manual refund, re-send live webhook, alter order totals, rotate credentials or migrate production schema without the owner's authorization and a verified recovery point.

## Manual Stripe → Neon settlement reconciliation

For an approved bounded time window, have the owner export Stripe Checkout Sessions and their related PaymentIntents/settled payment amounts *privately* from the appropriate Stripe mode. A restricted database operator independently obtains Neon order references and persisted amounts without exposing customer data in diagnostics. Compare these columns: provider session/payment reference, intended order ID, currency, amount in integer minor units, payment state, Neon row count/status, stored line subtotals, shipping and tax, and fulfillment/email state. Order references must be unique in each dataset.

Investigate mismatches without changing either side:
- **Stripe paid, Neon absent:** webhook may have failed, not arrived, or order persistence may have failed. Verify signature delivery attempt/response; quarantine fulfillment until an authorized, idempotent recovery mechanism is proven.
- **Neon paid, Stripe not settled:** never ship or mark paid based only on a database state; verify matching provider mode and settlement state.
- **Multiple Neon orders or mismatched totals:** stop fulfillment and investigate session/event identity and duplicate processing. Do not delete rows to hide discrepancies.
- **Successful order, missing email:** avoid blindly re-sending checkout events; existing handler returns early for already-paid orders and does not recover missing notifications. Use a future durable delivery-outbox workflow after tested implementation (M11-003/M15-003).
- **Refund, cancellation, delayed payment, dispute:** reconcile the **provider's latest event state** against Neon and review physical fulfillment before making manual adjustments.

A signed-off reconciliation record should include period, redacted order/session references, discrepancies, owner-approved action, verifier and follow-up status. It should contain **no customer PII**.

## Reprocessing failed or out-of-order events

Check Stripe's recorded event type, ID and delivery attempts before replay. Current code may attempt order creation from both `checkout.session.completed` and `payment_intent.succeeded`; the existing `createOrder` uses an upsert and previously processed paid orders skip notification. This is **not** an exactly-once event ledger. Until M11-002/003/004 and their concurrency tests are implemented and production schema upgraded:

1. Do not automatically resend the same live event to the current webhook to repair a missing email/order.
2. In an isolated test database and Stripe sandbox, reproduce the event order, determine whether email/stock/order operations are idempotent, and review the planned repair.
3. Add a unique event/session/payment ledger, durable email outbox, state-precedence guard and transactional processing; verify duplicate/concurrent/out-of-order/retry tests **before** authorizing production replays.
4. With owner approval and an auditable private ticket, reprocess **one** event and reconcile the resulting order and email. Check for duplicate fulfillment and customer messages before broadening recovery.
5. If a live paid order lacks a row and no safe replay mechanism is available, preserve evidence, stop automated retries and escalate to an owner-approved manual repair procedure; do not fabricate `paid` state through the public admin endpoint.

## Deployment and provider rollback

Record the last deployment SHA shown to have a compatible schema and successful **non-charging** provider health checks. Use Vercel's supported rollback mechanism described in `AUTONOMOUS_EXECUTION_PLAN.md` under an authorized operator. A code rollback does not undo a Stripe payment, external email, database migration, R2 deletion or DNS change. Keep provider key rotations and backup/restoration as distinct, owner-authorized operations and rerun redacted reconciliation after recovery.

## Settlement and closeout checklist

Close an incident only when an authorized owner confirms Stripe and Neon totals reconcile for the affected interval, no duplicate fulfillment/notifications remain, missed events have an approved recovery disposition, provider delivery errors are resolved, post-rollback deployment SHA is documented, and private follow-up/monitoring ownership is assigned. Routine cadence and specific response SLAs are *owner decisions*; do not invent them here.

Supporting tasks still unchecked until implementation/prod verification: M11-002/003/004/005/006, M15-003 and M21-002/003.
