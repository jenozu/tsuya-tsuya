---
paths:
  - "app/api/**"
  - "lib/checkout-*.ts"
  - "lib/stripe.ts"
  - "lib/tax*.ts"
  - "lib/shipping.ts"
  - "lib/email*"
  - "lib/printify*"
  - "migrations/**"
---

# Payments, orders and Printify rules

- Stripe only, USD only. Keep Adaptive Pricing explicitly disabled on every Checkout Session. Never add another
  processor or currency.
- Price, shipping, tax, size and availability are derived on the server from catalog data and
  `config/shipping-profile.json`. Never trust an amount, size or availability value sent by the browser.
- Webhooks: verify the Stripe signature first; process each event id once (idempotent, retry-safe); never rewind a
  paid or refunded order; don't send mail or create an order for an unpaid session.
- Printify (R15, new): call it only from the server, only after a verified Stripe payment, keyed on the Stripe
  session/payment id so a retry never creates a second order. Credentials are server-only env vars. Tests use
  mocks; never call the live Printify API or place a real order.
- Logs and public errors never contain customer addresses, emails, payment metadata or raw provider errors.
- Schema changes are additive forward JSON migrations (`migrations/forward/`); tests use an isolated database; never
  apply anything to production.
- Customer pages never show stock counts or scarcity text.
- Don't pick pricing, tax, destination, refund or legal wording: mark it `TBD:` and leave it for the owner.
