# Catalog prices, availability and inventory reconciliation

This operational runbook documents the **current code behavior** and a review workflow; it does not approve particular retail prices, invent a per-size SKU/stock model or replace a tested database backup.

## Current implementation and boundaries

- Products currently store a base USD price, product-wide nonnegative integer stock, and up to eight individually priced print sizes in a JSONB array. The existing admin screen calculates base price from the average of valid per-size prices; individual size prices are charged according to the current **server-side Neon** record.
- Shared `stock` currently applies across all sizes: a change to one size does **not** reserve inventory for that size, and the pre-payment checkout check is not an atomic reservation. Consequently this store cannot yet claim per-size stock or protection from simultaneous last-item purchases (see M6-003/M6-006).
- Product API and CSV import validate allowed sizes, prices to two decimal places, and integer stock; an import matches existing products by **case-insensitive name**. It does not have a transactional batch undo. Pricing, inventory and product-name edits may invalidate shoppers' stored carts; checkout reprices and returns a refresh-required error on mismatches.
- A product with overall stock 0 displays *Out of Stock* on its detail page. Verify UI add-to-cart controls and sold-out sorting in staging before treating the label alone as checkout safety.

## Price or size changes — reviewed sequence

1. Document the affected database product IDs, currently offered size labels and price/cost fields, old/new prices and effective date in a **private** change ticket; obtain actual pricing approval from the store owner. An average base display price is not the same as a variant's checkout charge.
2. Use a preview deployment with isolated data where possible. Validate positive two-decimal prices, duplicate/removed sizes and expected visible base/size prices before changing production.
3. Preserve an independently verified, access-controlled database backup before production edits or large imports. An exported CSV is a useful comparison reference, not a restoration substitute.
4. Apply the smallest reviewed change through the authorized admin. Avoid concurrent CSV imports and manual edits. If changing an existing product's name, remember that later case-insensitive name-matched imports may unintentionally insert a duplicate instead of updating the same product.
5. Verify the listing, product detail, admin detail, mobile view and server-recalculated checkout total with a **non-paying** test cart. A previously selected or discontinued size must be refreshed rather than silently charged at a replacement price.
6. Preserve the approved change ticket, affected IDs and redacted before/after prices. If checks fail, stop new checkout rather than restoring an unverified, potentially incompatible dump.

## Out-of-stock and discontinued sizes

Set product-wide stock to 0 when no units of any size are sellable; do not fabricate per-size quantities from the shared counter. Remove discontinued size choices from the product's `sizes` list only after checking open orders and communicating any already-paid fulfillment implications privately. Old carts must not be considered purchase authority: the server price/stock check should reject removed options. No operator may override a paid order's historical amount simply to match a newly edited catalog price.

## Manual stock reconciliation

1. Obtain today's private product-ID/stock snapshot and the redacted list of **settled** payments, open fulfillments, cancellations and returns for the chosen reconciliation period. Never use customer addresses in shared spreadsheets or GitHub.
2. Identify physical/on-hand units and any outstanding fulfilled/unfulfilled orders for each product ID. **Do not treat the existing product-wide stock field as evidence of how many of each size were printed**; that model needs an owner-approved inventory design.
3. Reconcile product-wide available count with verified physical/on-hand and outstanding commitments. Record any discrepancy with reason, related redacted order IDs, timestamp and approver. Do not decrement twice based on both a webhook and a manual edit.
4. Apply a reviewed manual correction only in the authorized admin and verify subsequent checkout eligibility in preview. Do not back-edit settled amounts or delete orders to fix stock.
5. Escalate overselling, negative reconciliation or corrupted product references to the owner. Pause affected listings until the payment/stock transaction safeguards in M6-006 and webhook idempotency in M11 are operationally verified.

**Approval boundary:** exact prices, SKU/per-size stock policy, whether to oversell/backorder, cutoff times and restocking of returns require owner decisions. This runbook records the maintenance workflow and current safeguards, not those business choices.
