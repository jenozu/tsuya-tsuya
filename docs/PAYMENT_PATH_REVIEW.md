# Payment path review (task 47)

Scope: checkout session creation, Stripe webhook, Stripe client. Mocks only; no live keys or calls.

## Confirmed correct
| Requirement | Evidence |
|---|---|
| Price derived server-side | `lib/checkout-pricing.ts:30-108` looks up product and size price from the DB; caller name/price ignored (`checkout-pricing.ts:72`). Route uses `priced.lines` for `unit_amount` (`app/api/checkout/create-session/route.ts:72-86`). |
| Shipping and tax derived server-side | `route.ts:34-41` (`getStandardShippingForCountryAndQuantity`, `computeTaxAmount`). Added as line items `route.ts:87-102`. |
| Client totals never charged | Client `subtotal/shipping/tax` only compared to server values (`route.ts:45-52`); mismatch over 1 cent returns 409. They are never used as `unit_amount`. |
| USD only | `currency: 'usd'` literal on all three line item kinds (`route.ts:74,89,97`). |
| Adaptive Pricing off | `adaptive_pricing: { enabled: false }` (`route.ts:128`); `automatic_tax` off (`route.ts:126`). |
| Webhook uses raw body | `await request.text()` (`app/api/webhooks/stripe/route.ts:176`); no `request.json()`. |
| Missing signature rejected | 400 "No signature" (`webhooks/stripe/route.ts:186-189`). |
| Invalid signature rejected | `verifyWebhookSignature` -> `stripe.webhooks.constructEvent` (`lib/stripe.ts:79-99`); failure returns 400 (`webhooks/stripe/route.ts:200-202`). Unset secret returns 500, never accepts. |
| Orders only on verified, paid events | `payment_status !== 'paid'` is deferred (`webhooks/stripe/route.ts:~60`); idempotent via existing-order checks. |

## Findings (no code change made)
1. `lib/stripe.ts:12-15` pins `apiVersion: '2025-02-24.acacia'`. Fine, but confirm it matches the webhook endpoint version in the Stripe dashboard (owner/human).
2. The webhook trusts Stripe line items and `amount_total` from the retrieved session to build the order; it does not recompute the server price. Acceptable because the session was created by this server with server-derived amounts; a cross-check would be defence in depth only.
3. The 1 cent client/server tolerance (`route.ts:47`) absorbs rounding only; the charged amount is always the server value.
4. `lib/stripe.ts` `createPaymentIntent` has a `currency` parameter defaulting to `'usd'` (`lib/stripe.ts:29`). Grep shows no callers in app/ or lib/; dead code, remove or hard-code usd if ever used.
5. Real signature verification against Stripe still needs a test-mode check with the Stripe CLI (listed in manual checks, not done here).

## Tests added
`tests/payment-path.test.mjs` (runs in `npm test`): signature valid/missing/tampered/wrong secret via SDK `constructEvent`; webhook raw-body and 400 wiring; session params usd + adaptive pricing disabled; tampered client price ignored. Existing disposable-DB tests (`tests/checkout-session.integration.mjs`, `tests/stripe-webhook-safety.integration.mjs`) cover end-to-end mocked route behaviour.

Note: `npm test` has 2 pre-existing failures in `tests/ci-guard-policy.test.mjs` (tests 40, 41), unrelated to this task.
