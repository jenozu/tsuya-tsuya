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

## Admin refund runbook (added 2026-11-16, task 26.3)

Status: procedure for the existing `/admin` refund control. **TBD: owner policy for every item in this section** (refund window, who approves, partial-refund rules, customer wording). Until the owner fills these in, do not issue refunds beyond a single, owner-approved case.

### Procedure

1. **Test mode first.** Reproduce any new refund path in Stripe test mode against the disposable database before using it live. TBD: confirm the owner's sign-off that test-mode rehearsal is required for each refund type.
2. **Approval.** TBD: who approves a refund and where that approval is recorded (ticket reference only, no customer PII).
3. In `/admin`, open the order under **Orders** and click **Refund...** (shown only for orders whose payment status is `paid` or `partially_refunded`).
4. In the dialog, leave the amount blank for a full refund of the remaining balance, or enter a partial amount in major units (USD). TBD: partial-refund rules and maximum amounts.
5. Type the **order id** exactly into the confirmation field. The **Confirm refund** button stays disabled until it matches.
6. Click **Confirm refund** once and wait for the result message.

### Token and retry behaviour

- The dialog generates one idempotency token (`rf_...`) when it opens. Every retry from the same open dialog reuses that token, so a retry after a lost response replays the same Stripe refund while a refundable balance remains. Once the first attempt has used up the balance, the retry is rejected with `409` before reaching Stripe.
- Closing the dialog and reopening it creates a **new** token. A new token is a new refund intent: do not reopen the dialog to retry a refund whose outcome is unknown.
- Responses map as follows:
  - `400` (not confirmed, invalid amount, missing token): nothing was sent to Stripe; correct the input and retry.
  - `401`/`403` (no admin session or wrong origin) and `404` (order not found): nothing was sent to Stripe.
  - `409` (`not_refundable`, `exceeds_remaining`): on a first attempt nothing was refunded (the order is not paid or the amount exceeds what is left). On a **retry** it may mean the first attempt succeeded. Check Stripe on any `409` or `502` before acting.
  - `502` (`stripe_error`) or any `500`: the outcome is **unknown**. **Check Stripe before retrying** (Payments and Refunds for the order's payment intent, in the matching mode), and confirm the refund's status there first.
- Payment status in Neon updates only after Stripe confirms through the signed `charge.refunded` webhook. The admin success message ("Refund issued. Payment status updates when Stripe confirms.") is not proof that Neon is up to date. Reconcile per the section above if the status has not changed after a reasonable wait. TBD: how long to wait.
- Never re-send the webhook or edit the order's payment status by hand to force a match.

### Damaged or lost item handling

Physical fulfilment is made to order through Printify. Shipping carrier or Printify decisions are owner decisions. TBD: the reship, replacement, and refund policy for damaged items; the lost-in-transit window before a refund or reship; and whether Printify's reprint is preferred over a refund.

Before deciding, collect the following evidence and store it in the private ticket only:

- Order id (the internal reference, not the Stripe session or payment intent id in the public message).
- Photos of the damaged item and packaging from the customer, shared through the support channel. TBD: retention period and who may view them.
- Printify order state and the tracking status, copied as status words and dates only (for example, "shipped, delivered-not-scanned"). Do not paste carrier or address details.
- Refund or reship intent, the approver, and the decision date.

Do **not** include customer PII (names, email addresses, street addresses, phone numbers, card details, payment metadata, or unredacted provider error objects) in tickets, logs, screenshots or chat. Refer to the customer by order id only.

### Refund email behaviour

- The customer receives **one** refund email per order, sent when Stripe's `charge.refunded` webhook is processed. A partial refund sends that one email; later refunds on the same order send none.
- A failed email makes the webhook fail so Stripe redelivers, and the send is claimed so it is not sent twice.
- The email is generic and does not state a refund amount. It does not change fulfilment status. TBD: owner decision on whether to add amount or bank-timing wording.
- TBD: the approved wording of the refund email and any owner-approved follow-up message for damaged or lost items.
- A refund email that was not received is checked against the email delivery record for the order before anything is re-sent. Do not manually re-send a refund email without owner approval.
