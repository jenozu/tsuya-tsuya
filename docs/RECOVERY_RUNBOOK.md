# Recovery, replay, reconciliation, and outage communications

This runbook covers code/deployment recovery and the safe handoff to provider/database recovery. It does **not** authorize live Stripe mutations, DNS changes, database restores, R2 deletes or customer communications by itself. Use least-privilege provider access and private incident records.

## 1. Deployment rollback

1. Record incident start time, active production deployment ID, GitHub SHA, symptoms and whether checkout is still accepting traffic.
2. Identify the last **verified compatible** production deployment. Confirm that no incompatible database migration or provider configuration change occurred after it.
3. An authorized deployment operator uses Vercel's production rollback interface or `vercel rollback <deployment>`; record the resulting deployment ID/SHA.
4. Verify canonical aliases, HTTPS, storefront/catalog/admin loading and non-charging provider health. A deployment rollback does not undo database writes, payments, email or R2 object changes.
5. If schema compatibility is uncertain, stop and use the independently tested Neon recovery path rather than guessing.

The more detailed deployment procedure and prior verified deployment checkpoint remain in `AUTONOMOUS_EXECUTION_PLAN.md`.

## 2. Domain / DNS recovery

1. Preserve the current registrar/DNS record set privately before changes. Confirm the intended canonical hostname and Vercel project.
2. If the custom domain is misrouted, verify registrar ownership, authoritative nameservers, CNAME/A records, Vercel domain assignment and certificate status. Do not paste registrar recovery codes or DNS API credentials into GitHub.
3. Restore only the last known-good DNS record values from the private provider history/change ticket. Avoid changing both registrar nameservers and individual records simultaneously unless the incident specifically requires it.
4. Verify DNS from independent resolvers, HTTPS certificate validity, canonical redirects, `robots.txt`, sitemap host and Vercel production alias.
5. If DNS propagation is still inconsistent, keep checkout paused rather than sending shoppers to mixed deployments.

## 3. Stripe webhook replay

1. Identify the exact Stripe mode, event ID/type, delivery attempt and endpoint response. Compare against the deployed webhook code SHA.
2. Check whether Neon already contains the associated order/payment state and whether email was sent. Do not replay merely because an HTTP delivery failed.
3. Until persistent event-ledger/outbox work (M11-002/003/004) is deployed and concurrency-tested, production replay is **manual and one-event-at-a-time only**, with owner approval.
4. Reproduce the event in Stripe sandbox against an isolated database first. Confirm duplicate delivery does not create duplicate order/email/fulfillment.
5. Replay only the approved event; immediately reconcile Stripe, Neon and notification state. Stop if any duplicate or conflicting state appears.
6. Keep the Stripe event ID, redacted order reference, UTC replay time and verifier in a private incident record.

## 4. Manual paid-order reconciliation

Use `docs/PAYMENT_INCIDENT_RESPONSE.md` and `docs/DAILY_ORDER_RECOVERY.md`.

For a bounded time window:
- Export Stripe settled Checkout/PaymentIntent references privately.
- Obtain Neon order/payment references with read-only access.
- Compare currency, integer-minor-unit amount, order row count/status, line subtotal, shipping, tax and fulfillment/email state.
- Investigate Stripe-paid/Neon-missing, Neon-paid/Stripe-unsettled, duplicates and mismatched totals before any mutation.
- Never delete rows, fabricate a paid state or alter historical totals to force a match.
- Close only when the owner/authorized verifier confirms one settled provider payment corresponds to one intended order/fulfillment state.

## 5. R2 / image recovery

A Vercel rollback does not restore deleted objects. Before bulk replacement/deletion, preserve object inventory and provider-supported retention/versioning evidence privately. For a missing image incident, stop destructive cleanup, identify product/object key references, restore from the approved asset backup/source and verify the current product record points to the recovered HTTPS object. R2 retention/versioning configuration and restore testing remain separately tracked.

## 6. Outage communication

Classify outages as:
- **Checkout/payment risk:** pause checkout; do not encourage retries if duplicate charging or order loss is possible.
- **Catalog/image degradation:** keep checkout disabled for affected products if price/identity cannot be verified.
- **Email-only degradation:** preserve paid orders; avoid duplicate confirmation sends while delivery state is uncertain.
- **Admin-only degradation:** storefront may remain live only if catalog/payment integrity is unaffected.

Public/status communication should state affected capability, observed start time, whether orders/payments are safe, current workaround (if verified) and next update window. Do not publish technical secrets, customer counts, addresses, payment references or speculative root cause. Customer-specific follow-up belongs in the private support channel.

## 7. Recovery closeout

Before incident closure:
- deployed production SHA and domain aliases are verified;
- payment/order reconciliation for the incident window is complete;
- missed/duplicated webhook and email state has a documented disposition;
- database/R2 recovery actions are independently verified if used;
- any checkout pause is intentionally removed;
- follow-up engineering tasks, owner and due date are recorded privately.

Recovery drills and actual provider restore/replay evidence remain separate verification work; this runbook defines the repeatable procedure.
