# Canonical shipping profile

The storefront's shipping source of truth is `config/shipping-profile.json`.

The profile was approved by the store owner from the existing Etsy destination/delivery settings, while preserving the previously established Tsuya first-item prices. Paid destinations use **USD $2.99 for each additional item**. United States shipping remains free.

## Runtime behavior

- `lib/shipping.ts` reads the JSON profile and exposes only the named destinations configured there.
- `/api/shipping/profile` supplies checkout with country names and delivery windows.
- `/api/shipping/rate` calculates the quote for the selected destination and quantity.
- `/api/checkout/create-session` recalculates shipping server-side and rejects unsupported destination codes before creating a Stripe Checkout Session.
- The checkout page never trusts a browser-submitted shipping amount as charge authority.
- The old Neon `shipping_rates` table remains historical/schema compatibility data but is **not** the checkout pricing source of truth.
- The admin Shipping tab points maintainers to the version-controlled JSON file rather than implying that Neon rates control checkout.

## Editing rates

Make shipping changes in a reviewed branch by editing `config/shipping-profile.json`. Do not make a matching manual change in `lib/shipping.ts`; that module derives rates from the config.

Each named destination references one of the reusable rate groups under `rates`. A rate group defines:

- first-item shipping in USD;
- additional-item shipping in USD;
- minimum/maximum estimated business days.

After a change, verify at minimum:

1. US free shipping.
2. Canada single- and multiple-item totals.
3. UK, EU/EFTA, Australia and rest-of-profile examples.
4. an unsupported country code is rejected rather than receiving a fabricated fallback.
5. checkout displays the same quote the server uses to create Stripe Checkout.

The `everywhereElse` entry is retained as a reference to the source Etsy profile, but `enabled` is currently false. Customers can select only explicitly named destinations. Expanding to unrestricted rest-of-world checkout requires a reviewed country list and fulfillment confirmation rather than silently accepting any two-letter code.

## Current formula

For paid destinations:

`first item + (quantity - 1) × $2.99`

For the United States, both first and additional item shipping are $0.

Delivery windows are estimates copied from the owner's Etsy configuration and are not carrier guarantees. PO-box handling, tracking expectations, lost-parcel policy, customs requirements and provider rate-change procedures remain separate launch tasks.
