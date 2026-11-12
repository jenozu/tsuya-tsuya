# Printify fulfilment design (R15)

Design only (task 16). No code, no live Printify calls, no credentials were used. Written 2026-11-11 from Printify's official API docs: <https://developers.printify.com/> (single-page reference: Authentication, Orders, Webhooks, Events, rate limits, Common error cases; OpenAPI download is linked from the same page). Anything not stated there is marked **Needs verification**. Owner decisions already made: `docs/PHASE_2_CATALOG_FULFILLMENT_DECISIONS.md` (made to order, per-size private availability, variant identity = product ID + normalized size label).

## 1. Authentication
- Individual-account integration: a Personal Access Token (Printify My Profile > Connections, with scopes; relevant: `orders.read`, `orders.write`, `webhooks.read`, `webhooks.write`). Sent as `Authorization: Bearer <token>`.
- Tokens are shown once and expire after one year: owner must rotate yearly (calendar reminder).
- Every request must send a `User-Agent` header (client type or app name; use `TsuyaNoUchi`).
- Base URL: `https://api.printify.com/v1/`. Order/webhook endpoints need `{shop_id}` (from `GET /v1/shops.json`).
- Env vars, server only, never `NEXT_PUBLIC_*`: `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID`, `PRINTIFY_WEBHOOK_SECRET`, and a feature flag (proposed `PRINTIFY_FULFILLMENT_ENABLED`, default off). The build task adds the names to ENV_TEMPLATE.md.
- OAuth 2.0 is for multi-merchant platforms: not needed.

## 2. Order submission
Trigger: only from the signature-verified Stripe webhook path (payment confirmed) after the order row is persisted. Never from the browser or success-page code.

Endpoint: `POST /v1/shops/{shop_id}/orders.json` (existing products in the shop: line items use `product_id` + `variant_id`).

| Field | Our value |
|---|---|
| `external_id` | Stripe Checkout Session id (`cs_...`). Docs: a reused `external_id` in the same shop returns 409 (code 8503) including the existing order id. This is the idempotency key. Returned as `metadata.shop_order_id`. |
| `label` | our order reference (optional, display only) |
| `line_items[].product_id` | Printify product id from mapping (section 3) |
| `line_items[].variant_id` | Printify numeric variant id from mapping |
| `line_items[].quantity` | from the server-derived order row |
| `line_items[].external_id` | `<order_id>:<line index>` (optional; echoed as `metadata.external_id`) |
| `shipping_method` | 1 standard (default). 2 priority, 3 express, 4 economy exist; owner shipping profile only covers standard. |
| `send_shipping_notification` | `false` (our email sends tracking, TSU-M15-005). Printify-sent instead: TBD owner. |
| `address_to` | `first_name`, `last_name`, `email`, `phone`, `country` (ISO code), `region`, `address1`, `address2`, `city`, `zip` from the Stripe-collected shipping address. Never log it. |

Response: body `{ "id": "<printify order id>" }` (exact HTTP status code **Needs verification**). Store the id on our order.

**Approval gotcha:** new stores default to automatic order approval (24 h); orders are then sent to production automatically. Alternative: set the shop to Manual approval and call `POST /v1/shops/{shop_id}/orders/{order_id}/send_to_production.json` (202 with id; 404 if not found). TBD owner: auto vs manual. Recommendation: manual until the first real test order is verified. Our code must not assume either; it records the status it reads back.

Shipping cost: Printify charges the merchant its own rates (`POST /orders/shipping.json` calculates them). The customer shipping price stays server-derived from `config/shipping-profile.json`; reconciliation against Printify invoices is an ops task. Whether the account is pre-funded or charged at submit: **Needs verification** (status `payment-not-received` exists, section 5).

## 3. Product and variant mapping
- Our identity: product id + normalized size label (`lib/print-sizes.ts`). Printify needs `product_id` (string) and `variant_id` (integer) of a product that already exists in the Printify shop. On-the-fly product creation with an order is discouraged by the docs (slow, timeouts, to be deprecated): do not use it.
- Proposed storage (build task decides; a migration is a Risky path and applying it is a human step): `printify_product_id` per product and `printify_variant_id` per size record inside the existing JSONB `sizes` array. No new table, no customer-facing SKU (matches the Phase 2 decision). Admin enters or imports them.
- A size with no `printify_variant_id` is not fulfillable: reject at checkout only when the flag is on; flag off keeps current behaviour.
- Reading variants/availability: `GET /v1/shops/{shop_id}/products/{product_id}.json`. Variant availability field names **Needs verification** against the Products section before coding.
- Availability sync vs manual toggle (PRD section 9 item 6, task 17): TBD owner. Design supports both: manual toggle today; a later periodic read could flip our private `available` flag.

## 4. Idempotency and flow
1. Stripe webhook confirms payment; order row exists (migration 003 `stripe_payment_events` ledger, staged, not applied to production).
2. Fulfilment record per order (proposed table `printify_orders`: order_id PK, state, printify_order_id, attempts, claim_expires_at, last_error_code, timestamps), created in the same transaction that marks the order paid. State `pending` is the durable intent.
3. A worker step (inline after the webhook plus a retry sweep, reusing the claim/attempts pattern of `order_email_deliveries`) claims the row, POSTs with `external_id = session id`, stores the returned id, sets `submitted`.
4. Safe retry: on timeout or 5xx, repeat the same POST. A 409/8503 means it already exists: read `order.id` from the error body and treat as success. `external_id` prevents duplicates.
5. Stripe webhook redelivery is a no-op once state is past `pending`.

## 5. States, failures, retries
Our states: `pending`, `submitting`, `submitted`, `in_production`, `shipped`, `delivered`, `canceled`, `needs_attention`.

Printify order statuses (docs): `pending`, `on-hold`, `sending-to-production`, `in-production`, `fulfilled`, `partially-fulfilled`, `canceled`, `payment-not-received`, `has-issues`, `cost-calculation`, `unfulfillable`. Line item `status_details` include `out_of_stock`, `discontinued`, `canceled_by_print_provider`, `shipment_undeliverable`, `shipment_delayed`. Unknown statuses map to `needs_attention`.

| Failure | Handling |
|---|---|
| 400 validation (e.g. code 8103 bad zip) | Not retryable: `needs_attention`, owner alert, admin fixes address and resubmits. Error text may contain address data: log the code only. |
| 404 product/variant missing | Not retryable: `needs_attention` (mapping broken). |
| 409 (8503) | Success path (section 4). |
| 422 (express/economy ineligible) | Not retryable; we only use standard. |
| 429 | Retry with backoff; honour `Retry-After` if sent (documented only for support requests: **Needs verification** for orders). |
| 5xx / network | Exponential backoff, capped attempts, then `needs_attention`. |
| `payment-not-received`, `has-issues`, `unfulfillable`, on-hold with `out_of_stock`/`discontinued` | `needs_attention`; owner contacts customer or refunds (refund is a human Stripe action, never automatic). |

`needs_attention` notifies the owner (recipient: TBD owner) and shows in admin.

## 6. Status sync (webhooks and polling)
Webhooks are created with `POST /v1/shops/{shop_id}/webhooks.json` (`topic`, `url`, optional `secret`). Relevant topics: `order:created`, `order:updated` (`resource.data.status`), `order:sent-to-production`, `order:shipment:created` (carrier code, tracking_number, tracking_url, shipped_at, line_item_ids), `order:shipment:delivered`, `order:line-item:canceled`. Envelope: `{ id, type, created_at, resource: { id: <printify order id>, type: "order", data: {...} } }`.

- Proposed route `app/api/webhooks/printify/route.ts` (Risky path, reviewer required). Read the raw body, verify before parsing.
- Signature: header `X-Pfy-Signature: sha256=<hex>`, HMAC-SHA256 of the raw body keyed with the secret we set on the webhook (docs suggest `openssl rand -hex 20`). Compare in constant time (`crypto.timingSafeEqual`). Reject missing/invalid. A secret is mandatory for us.
- Delivery: expected response is 200. On 4xx/5xx Printify retries up to 3 times, then blocks the webhook for 1 hour. So persist the event first (dedupe by event `id`), answer 200 fast, process after; never 5xx for a duplicate or unknown topic.
- Ordering not guaranteed (**Needs verification**): apply only forward transitions; shipment events add tracking regardless of order. Signature replay window: not documented (**Needs verification**); dedupe by event id covers replays.
- Safety net: poll `GET /v1/shops/{shop_id}/orders/{order_id}.json` for orders stuck in `submitted` beyond N hours (webhooks can be blocked for an hour). Response has `status`, `line_items[].status`, `shipments[]` (carrier, number, url, delivered_at, line_item_ids).
- Tracking feeds the customer shipping email (TSU-M15-005) and admin shipment fields (TSU-M14-003).
- Registering the webhook is a one-time human/ops step with the real token. `POST .../webhooks/{id}/simulate` exists for testing (request shape **Needs verification**).

## 7. Rate limits
Global 600 requests/minute per integration (account, not token); Catalog endpoints 100/min separately; exceeding returns 429. Product publishing 200 per 30 min (not relevant). Error responses should stay under 5% of requests. Launch volume is far below this; the retry sweep still backs off on 429 and limits batch size.

## 8. Cancellation and edits (scope note)
Docs list `POST .../orders/{id}/cancel.json` (unpaid orders), line-item cancel, and address change. Out of scope for the first build: cancels or refunds after production starts are manual (Printify dashboard + Stripe). Automation: later task, TBD owner.

## 9. Owner decisions (TBD / BLOCKED, not guessed)
1. Printify account, token, shop id, funding/payment method (BLOCKED: human).
2. Automatic (24 h) vs manual order approval.
3. Availability sync vs manual toggle (task 17).
4. Who receives needs-attention alerts.
5. Whether Printify or we email shipping notifications.
6. Print provider/blueprint choices, Printify product listings and artwork (assortment).
7. Applying any new migration to production.

## 10. Needs verification (summary)
- Order-create success HTTP status and full response body.
- Product/variant availability field names.
- `Retry-After` on 429 for order endpoints; webhook event ordering; signature replay window.
- Simulate-webhook request shape; behaviour of orders on manual approval (`pending`/`on-hold`).
- Allowed length/characters of `external_id` (for `cs_...` ids).
- Whether a 409 still fires after the original order was canceled on Printify.
- No sandbox is mentioned in the docs: the first real order is a human, owner-approved step (hard stop: agents never place live Printify orders).

## 11. Roadmap ids this design is evidence for (no boxes ticked)
TSU-M14-003 (fulfilment states, shipment tracking), TSU-M15-005 (shipping/cancellation notifications), TSU-M3-005 and TSU-M6-006 (variant/availability model for made-to-order), TSU-M14-005 (reconciliation scope, see task 27). Evidence only: a design doc meets no acceptance criterion.
