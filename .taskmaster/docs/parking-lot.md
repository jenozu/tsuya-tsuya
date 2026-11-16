# Parking lot

Ideas that are not part of the current plan. One dated line each. Review at the end of each phase:
promote to a task (`tasks.py add` or the `adapt` skill), defer, or delete on purpose.

- 2026-11-11: lint has 33 warnings (18 no-unused-vars, 4 no-explicit-any, 3 no-img-element, rest react-hooks); triage later (from task 1).
- 2026-11-11: audit the other 63 checked [x] items in master_plan.md for evidence (from task 2); Printify R15 has no master_plan id.
- 2026-11-11: remove unused createPaymentIntent/updatePaymentIntent in lib/stripe.ts (from task 47)
- 2026-11-11: task 16 evidence ids (no boxes ticked): TSU-M14-003, TSU-M15-005, TSU-M3-005, TSU-M6-006, TSU-M14-005. Owner decisions listed in docs/PRINTIFY_FULFILLMENT.md s9; Printify auto-approval risk: order may go to production before owner ready.
- 2026-11-11: Printify 409/8503 duplicate response body shape unverified; check against docs/sandbox before go-live (lib/printify.ts tolerant parsing)
- 2026-11-11: lib/printify.ts hardcodes shipping_method:1 and send_shipping_notification:false; confirm against Printify docs / owner before go-live (task 19/20). Also replace 'any' with unknown in printify.ts readJson/providerCodeOf/existingIdOf.
- 2026-11-11: (task 19) Printify submitting-row stuck up to lease if throw after claim + fast Stripe retry; add sweep or non-2xx on not_claimable/submitting.
- 2026-11-11: (task 19) add tests/printify-webhook.integration.mjs to infra-guard.yml integration list; admin resubmit action; admin fields for printifyProductId/VariantId per size; owner alert email on needs_attention; submit admin-created pending orders.
- 2026-11-11: (task 49) after owner text (task 43) remove noindex and add the three pages to sitemap.
- 2026-11-11: (task 50) add sendOrderShipped in lib/email.ts when task 24 wires the shipped notification.
- 2026-11-11: (task 51) confirm 'Printify has no sandbox' against Printify docs; migration 003 not covered in runbook.
- 2026-11-11: (task 46) make lib/ci-guard-policy.mjs regexes tolerate CRLF, or add .gitattributes '*.yml text eol=lf'.
- 2026-11-13: (task 5.2) disposable-db integration test for throttle upsert and admin session store SQL; document ADMIN_AUTH_STORE_ENABLED in ENV_TEMPLATE.md.
- 2026-11-13: (task 8) 20 remaining lint warnings need real refactors (react-hooks set-state-in-effect, no-img-element, no-explicit-any); follow-up cleanup task.
- 2026-11-13: (task 9) R2: bucket policy/CORS/public-access and Vercel preview protection cannot be verified read-only from the repo; owner to confirm in Cloudflare and Vercel dashboards that the bucket allows only the public-read domain, no list, and previews are protected. /api/payments/* are 410 retired stubs, safe to delete.
- 2026-11-13: (task 9 review) stripe webhook: no event-id dedupe until migration 003 applied (check createOrder/Printify idempotency under concurrent delivery); async_payment_succeeded unhandled (fine if cards only).
- 2026-11-13 task 54/shared: client IP uses leftmost x-forwarded-for in preview-access + admin-throttle (safe on Vercel; fix together in one helper if ever served off-platform). Also: real POST test for preview-access route.
- 2026-11-13 task 55 follow-up: add report-uri/report-to endpoint, nonce-based script-src, then enforce CSP (allow analytics origins if added).
2026-11-16: 10.1 reviewer note: finishPaymentEvent throw after success returns 500 (harmless, handlers idempotent); lease 2min vs route maxDuration - check in 10.2.
2026-11-16: 10.2 review: before applying migration 003, seed sent rows for pre-existing orders or old-event redeliveries resend emails; attempts cap for permanently failing sends; payment_intent.succeeded path sends no emails.
2026-11-16: 11 review: clamp/skip zero-qty or negative Stripe lines in orderLineItemsFromStripe (CHECK failure would block order persist); backfill pre-006 orders; tag shipping/tax lines via metadata.
- 2026-11-16: task 20 reviewer note: claimShippedEmail in lib/printify-store.ts does not check state; add AND state IN ('shipped','delivered') if tightening.
