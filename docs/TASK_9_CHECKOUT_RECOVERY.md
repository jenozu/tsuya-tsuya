# Task 9 — duplicate checkout submission safeguards and return recovery

This change reduces duplicate **Checkout Session creation** without using production credentials. It is not a paid-order idempotency ledger or stock reservation.

## Behavior

- React ref prevents rapid double submissions while a checkout request is pending. A persistent random UUIDv4 attempt ID and SHA-256 digest of the current checkout payload are saved in localStorage. Raw shipping addresses, email and card details are **not** saved in this key. The same payload and browser profile reuse the attempt on retries, refreshes and a canceled Stripe Checkout return; edited checkout details receive a new attempt.
- The server validates the request and recalculates catalog prices, stock, shipping and tax as before. It uses an HMAC of the UUID with the server's Stripe secret to derive a stable opaque order ID and Stripe idempotency key. An invalid UUID is rejected early. If Stripe receives the same key with different parameters, its parameter-mismatch error fails closed instead of opening an additional session.
- The trusted cancellation URL includes a fixed `canceled=1` marker. The page displays the cancellation and preserves the cart and attempt; retrying resumes the same Stripe session rather than creating another open session. An expired Stripe Session returns explicit 409 `CHECKOUT_SESSION_EXPIRED` and then the browser clears its old key so a *separate, explicit click* can create a new session. An already-completed session returns 409 `CHECKOUT_ALREADY_COMPLETED` without suggesting another payment attempt.
- Keys are retained in the client for at most 20 hours. Stripe's idempotency retention is time-limited and cannot guarantee lifetime uniqueness. Client-side storage is unavailable in some privacy modes; in that case the in-flight guard still protects rapid repeated clicks but retry durability degrades.

## Credential-free evidence

- `tests/checkout-attempt.test.mjs` tests local attempt reuse, privacy, payload changes, expiry and blocked storage.
- `tests/checkout-session.integration.mjs` calls the real checkout handler with a network-free Stripe SDK double. It checks repeated requests, distinct attempts, invalid IDs, hostile origins, mismatched totals/payload, expired/completed sessions and trusted cancellation URL. CI runs these route tests with the existing isolated suite and runs all browser tests.
- No real charges, production database writes, real refunds, or live Stripe requests are used.

## Required follow-up (remaining unchecked)

`TSU-M9-006` should remain **unchecked** until real Stripe test-mode recovery (same-key replay, cancellation, and expired sessions) is exercised. Stronger guarantees across devices, genuinely simultaneous distinct attempts, sessions older than Stripe's key-retention window, paid-order webhook duplicates and refund/event ordering require a persistent transactional session/payment-event ledger (`TSU-M11-002/003/004`), a confirmed schema/backup rollout and tests against isolated Neon. Two different attempt IDs can still create two distinct payment sessions, and this code cannot prevent a customer paying both separately. Do not advertise it as eliminating duplicate charges.
