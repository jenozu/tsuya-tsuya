# Daily order processing, escalation and missing-order recovery

Operational procedure for the current single-admin storefront. There is **no verified automated shipment, per-SKU inventory, distributed email outbox or safe self-service Stripe replay yet**. Use this runbook only with authorized private tools and owner-approved fulfillment/customer policies.

## Daily intake (when the owner chooses the operating schedule)

1. Open the protected admin dashboard and identify new processing/paid orders since the last documented intake. Match each order reference and stored USD total to a corresponding **settled** Stripe Checkout Session in the same mode before treating it as paid. Verify **date range and time zone** of both systems. Missing records become exceptions, not silently fulfilled.
2. Check each authorized order's product ID, selected size if supplied, quantity, catalog artwork/version and available product-wide stock. Retrieve full delivery details only inside the authorized dashboard/provider; do not paste them into issue reports, build logs, public spreadsheets or GitHub.
3. Create a private pack/print checklist referencing order ID and chosen size. Check artwork approval/rights and output size against the settled order; perform print quality and physical-packaging review. The actual printer, shipping services, delivery estimates and packaging standards require the owner's approved fulfillment model.
4. After physically handing off a shipment, privately record carrier, authorized tracking reference, dispatch time and any partial/backordered lines. Current application does not fully support the order-state/shipment transitions required to automate this (M14-003).
5. Reconcile today's settled payments, open orders and shipped quantity. Do not decrement stock manually if an automated webhook or another operator has already changed that count. Flag inventory discrepancies for the process in `CATALOG_PRICE_INVENTORY.md`.

## Exceptions and customer escalation

- **Absent/incorrect address or size:** hold fulfillment, obtain authorized clarification through the owner-approved support channel, document corrections privately. Do not guess sizes or overwrite the immutable historical payment amount.
- **Paid but unavailable, damaged, misprinted, late or lost:** preserve order and product evidence; escalate to the owner for the actual reprint, cancellation, replacement, carrier claim or refund decision. Do not invent eligibility cutoffs or promise a shipment date.
- **Payment pending/failed/canceled or under dispute:** do not ship solely because an order row exists; inspect settled provider state in the appropriate mode.
- **Duplicate order references, unexpected totals, database downtime or missing outbound confirmation:** stop potentially duplicated work; follow `PAYMENT_INCIDENT_RESPONSE.md`.

Customer contact and response-time commitments must use the published, owner-approved store policies. Current sample marketing and shipping copy is not a substitute.

## Safe paid-without-order investigation

1. Obtain the **provider event/session ID** from the correct Stripe mode and confirm it represents a settled payment. Privately record associated payment reference, currency, settled integer-minor-unit amount, captured items/shipping/tax and intent/order metadata. Limit access to authorized staff.
2. Search Neon by recorded order ID and payment reference using an authorized **read-only** query; distinguish no row, a partially persisted row and a row whose customer email failed. Compare existing paid rows before any insert to avoid duplicating an order.
3. Review redacted Vercel webhook logs and Stripe event deliveries. If the payment reference is missing or conflicting, halt repair and escalate rather than guessing an order ID.
4. **Do not resend production Stripe events blindly or directly INSERT a fabricated paid order.** The current implementation lacks a persistent event ledger, a transactional notification outbox and tested exactly-once concurrency guarantees.
5. Reproduce the missing-order condition using Stripe sandbox plus an isolated test database. Once M11-002/003/004 implement and verify transactional replay, obtain explicit owner authorization to reprocess the specific event. Reconcile result and send only missing notifications.
6. Close the exception only after the authorized operator and owner agree that the provider and database amounts match, the customer message is not duplicated and one fulfillment record exists. Store the resolution in a private tracker with **redacted references only**.

## Late, repeated and out-of-order Stripe events

- Each Stripe event id is claimed once (`stripe_payment_events`, staged migration 003). A repeat of a processed event is acknowledged without work; a run in flight answers 409 so Stripe redelivers; a crashed run is retaken after its 2-minute lease. Without the table the webhook falls back to the earlier idempotent per-order guards.
- A paid-intent event that arrives before `checkout.session.completed` recovers the order from the intent's Checkout Session; if that cannot be found it answers 500 so Stripe retries (look for repeated `stripe.webhook.checkout_session_missing`).
- Late `payment_failed`/`canceled` events never change a paid, refunded or shipped order. `checkout.session.expired` and `charge.refunded` are acknowledged with no order change: refunds are NOT recorded in the app yet (refund policy is an owner decision), so after a Stripe refund record it privately and in the admin by hand.
- Recovery: an order that exists without its emails is completed by the next Stripe redelivery (or the owner resending the event from the Stripe dashboard in the correct mode, only after the checks above); each email is sent once.

## Stripe-to-Neon reconciliation (manual, read-only; TSU-M11-005)

Run weekly, after any webhook incident, and before go-live. Authorized staff only; use the Stripe mode that matches the database. No script exists: this is a manual procedure and nothing in it writes to Stripe or Neon.

1. **Pick a window** (UTC, e.g. the last 7 days). Export from the Stripe dashboard (Payments, then Export; or Reports) the succeeded Checkout payments and the refunds in that window: Checkout Session id, PaymentIntent id, amount, refunded amount, currency. Keep the export in the private operations tracker, never in this repository.
2. **Read Neon** with a read-only role or the Neon SQL editor on a branch/replica. Amounts in `orders` are dollars, Stripe's are integer cents, so compare `ROUND(total * 100)`:
   `SELECT order_id, payment_intent_id, payment_status, status, ROUND(total * 100)::int AS total_cents FROM orders WHERE created_at >= $1 AND created_at < $2;`
   Never print or paste emails, addresses or full payment metadata into notes.
3. **Match on `payment_intent_id`** (fall back to Checkout Session id via `printify_orders.stripe_checkout_session_id` or `stripe_payment_events.checkout_session_id` if applied). Classify each Stripe payment:
   - *Matched*: one order, `payment_status` paid, `total_cents` equals Stripe amount, currency USD.
   - *Missing order*: paid in Stripe, no row. Follow "Safe paid-without-order investigation"; check `stripe_payment_events` for a `failed` or stuck `processing` event.
   - *Amount mismatch*: record both figures, halt, escalate to the owner (never edit the order total).
   - *Duplicate*: more than one order for one intent; escalate, do not delete.
   - *Orphan order*: paid order in Neon with no Stripe payment in the window (check the window edges and mode first).
4. **Refunds**: refunds are not recorded by the app yet (see above). For each Stripe refund, confirm the order is flagged by hand in the admin and the private tracker; a refund with no flag is an exception. Compare cumulative refunded cents to the order total.
5. **Totals check**: sum matched Stripe cents and sum matched Neon cents for the window; the difference must be 0 apart from listed exceptions.
6. **Record** in the private tracker: UTC run time, window, counts per class, redacted order references (last 6 characters), exception owner, resolution. Close an exception only per step 6 of the investigation above.

Owner decisions pending: schedule and owner of the review, refund recording, and who approves corrections.

## Printify submission (only when `PRINTIFY_ORDERS_ENABLED=true`; off by default)

Requires migration 004 (`printify_orders`) applied by the owner first. After a signed, paid `checkout.session.completed` webhook stores the order and sends the emails, the server submits one Printify order keyed on the Stripe Checkout Session id (`external_id`); a repeated event never creates a second one.

- **Retry pending** (admin Orders tab, Printify 5xx/429/network): the webhook answers non-2xx so Stripe redelivers it; the redelivery skips the order and emails (already processed) and retries only Printify. After 5 attempts the row becomes needs attention.
- **Needs attention** (code shown in admin): `mapping_missing` (the size has no `printifyProductId`/`printifyVariantId`), `validation` (Printify rejected the address or items), `not_found`, `auth`/`config` (token or shop id), or retries exhausted. Check the Printify dashboard for an order with that session id before doing anything; fix the cause there or in the catalog. There is no resubmit button yet: re-queuing a row is a follow-up.
- Error codes only are stored; Printify's error text can contain the address and is never logged.
- Needs-attention alert recipient: TBD owner (today the admin flag is the only signal).

## Hand-off / operational records

Use a restricted private operations tracker with: UTC review time, redacted order reference, verified settled amount/currency, product and size count, fulfillment status, shipping handoff reference, exception owner and last verified reconciliation time. Do not commit this tracker, addresses, financial reports or customer communications to this repository.

Daily/weekly cadence, support response windows, packing vendors and recovery approval contacts await owner confirmation. This runbook documents safe processing and escalation **today**, not fully implemented tracking, refunds or live provider verification.
