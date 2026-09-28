# Store operations cadence

This checklist establishes the recurring operating rhythm for the current Tsuya storefront. It is a review schedule, not an automated provider mutation. Customer data and financial exports remain in private authorized systems, not GitHub.

## Weekly — first business day of each week

### Orders and payments
- Reconcile the prior week's settled Stripe payments against Neon orders by redacted order/payment references, currency and total.
- Investigate paid-without-order, order-without-settled-payment, duplicate references, mismatched totals and unresolved failed/canceled events before fulfillment.
- Review open processing orders, shipment/fulfillment exceptions and customer issues using `docs/DAILY_ORDER_RECOVERY.md`.
- Confirm no refund, chargeback or cancellation is awaiting an owner decision.

### Customer support
- Review unresolved customer contacts and delivery/quality exceptions.
- Escalate damaged, lost, misprint, return/refund or policy exceptions to the owner; do not invent eligibility rules.
- Check transactional-email failures/complaints without exposing customer addresses in shared logs.

### Catalog and inventory
- Reconcile product-wide stock for actively sold products using `docs/CATALOG_PRICE_INVENTORY.md`.
- Review newly out-of-stock products, discontinued variants, recent price edits and CSV imports.
- Confirm representative product pages/cart totals still match server-authoritative checkout prices.

### Backups and recovery readiness
- Verify the most recent expected Neon backup/snapshot status and any R2 backup/retention status through the authorized provider dashboards.
- Confirm the current production deployment SHA and at least one known compatible rollback deployment.
- Review unresolved incidents or recovery actions.

### Reliability and performance
- Review Vercel deployment/error trends, checkout/webhook/email failures and meaningful availability regressions.
- Confirm dependency/security alerts have an owner.
- Record only redacted findings, actions, owner and due date in the private operations tracker.

## Monthly — first business day of each month

### Dependency and security maintenance
- Review npm/Dependabot/provider security advisories and CI audit results; update dependencies through tested PRs rather than directly in production.
- Review admin/preview access, provider memberships and least privilege. Rotate credentials only when due/compromised or required by the private credential policy.
- Re-run static security/lint/type/test/build gates and review unresolved warnings.

### Analytics / SEO
- Review Search Console/indexing status only after the store is approved for indexing.
- Check canonical host/redirects, robots/sitemap, broken product links and representative product metadata.
- Review privacy-conscious ecommerce analytics only if consent/legal requirements and the analytics provider have been approved.

### Pricing, shipping and tax policy
- Compare current application prices/shipping tables/tax configuration to the owner-approved policy and provider/carrier changes.
- Do not change tax treatment, destination eligibility, duties responsibility or published customer policy without owner/qualified review.
- Sample several supported destination/quantity calculations in non-charging checkout.

### Recovery drill
- Pick one scenario (deployment rollback, missing paid order, webhook replay in sandbox, Neon restore in an isolated environment, or R2 asset restore) and exercise the **non-production** procedure where access allows.
- Capture date, participants, target environment, result, recovery time, gaps and follow-up actions privately.
- Never use a live refund/charge or production database destructive operation merely to satisfy a drill.

### Cost / capacity review
- Review Vercel, Neon, R2, Stripe and Resend usage/limits and unexpected cost growth.
- Check storage/database growth, image footprint and email/payment volume for thresholds that could affect service.
- Record any capacity action before limits become an outage risk.

## Evidence and exceptions

Each weekly/monthly review should record the period, reviewer, checklist exceptions and follow-up owner in a private tracker. A quiet week/month still records completion. Provider exports, customer PII, card/payment data, secrets, recovery codes and full database dumps must never be committed to this repository.

If a review finds a material checkout/payment/data-integrity risk, use `docs/RECOVERY_RUNBOOK.md` and pause risky operations until the issue is understood.
