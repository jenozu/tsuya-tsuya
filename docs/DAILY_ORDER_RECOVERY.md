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

## Hand-off / operational records

Use a restricted private operations tracker with: UTC review time, redacted order reference, verified settled amount/currency, product and size count, fulfillment status, shipping handoff reference, exception owner and last verified reconciliation time. Do not commit this tracker, addresses, financial reports or customer communications to this repository.

Daily/weekly cadence, support response windows, packing vendors and recovery approval contacts await owner confirmation. This runbook documents safe processing and escalation **today**, not fully implemented tracking, refunds or live provider verification.
