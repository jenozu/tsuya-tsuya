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
