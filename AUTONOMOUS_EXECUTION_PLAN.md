# Tsuya — Autonomous Execution Plan

Last audited: 2026-09-27. Canonical feature/task status remains `master_plan.md`. This is an execution and evidence plan, **not** another checklist; `MASTER_LIST.md` describes historical deployment claims only.

## Operating rules

1. Read the current default branch, this roadmap, relevant source files, existing tests, GitHub Actions and recent PRs before each group of changes. Do not duplicate capabilities.
2. Work in small, topic-scoped branches and PRs. Do not bypass the existing infrastructure guard or TypeScript build check. For every PR run locked install, infrastructure guard, typecheck, tests where present, and a clean production build against **candidate code**; inspect Vercel preview results if available. Keep build logs and PR evidence.
3. Prioritize defects that could permit unauthorized access, wrong checkout amounts, duplicate charges/orders, or unsafe image uploads before cosmetics. No live charges, refunds, database mutations or deletion of production objects as part of validation.
4. Mark a roadmap task complete only when **all** acceptance criteria have evidence. Partial implementation, staging success, or historical claims do not count as production verification.
5. Never copy secret values into logs, repository, PR comments, or exported reports. Validate names, scopes and deployment states without printing values. Avoid logging customer addresses, emails, payment metadata or full provider errors.
6. Do not silently choose new business policy. Treat pricing, supported countries, tax registration, artwork rights, order/refund terms, notification ownership and launch approval as gates for the store owner or qualified reviewer.
7. After each merge, verify the resulting `main` SHA and production deployment status and record any new defects as unchecked roadmap subtasks.

## Execution order (dependency-aware)

### Wave A — Safe repository work
- **TSU-M1-006 / M18-006 (partial):** replace removed Next.js lint command with a pinned linter, commit a reproducible updated lockfile, enforce lint and tests in the existing CI pipeline. Fix introduced lint errors without mass formatting unrelated code.
- **TSU-M1-007 / M1-008:** read-only deployment SHA/alias verification, rollback and documentation consolidation. Do not confuse a READY deployment with passing end-to-end payments.
- **M18-002 (incremental):** add focused tests for pure shipping, tax, variant, CSV and security helpers. Document coverage gaps rather than claiming complete coverage prematurely.
- **M19-004/005 (incremental):** indexing protection, per-product metadata, robots/sitemap and URL continuity, excluding unapproved marketing copy.
- **M8-006:** remove wildcard/HTTP remote image permissions after deriving trusted image domains from approved deployment configuration; reject malformed domains.

### Wave B — Security and payment correctness in isolated PRs
- **M7-004/005/006 and M17-004:** harden signed sessions, preview access, origin/CSRF checks, payload validation, login limits and image upload. Test unauthorized requests and backward compatibility.
- **M10-004:** retire or secure browser-accessible client-amount PaymentIntent routes after verifying all callers. Existing Checkout Session path remains.
- **M10-003:** allow only approved redirect origins and expected paths. Add tests for cross-origin, malformed, HTTP and excessively long redirects.
- **M10-002 / M9-004 / M9-005 / M12-004:** derive all amounts, variant identity, stock, shipping and destination eligibility server-side; do **not** enable real payments while business pricing, tax and destination policies remain unverified. Include manipulated request tests.
- **M11-002/003/004:** add persistent, transaction-safe payment event processing and retry-safe order/email recording, with additive migrations and concurrency tests against isolated databases.
- **M15-004 / M17-005:** escape all untrusted email HTML; redact customer and provider data from logs and public errors.

### Wave C — Catalog, fulfilment and resilience
- **M3-003/006 (staged), M5-005/006, M6-004/005, M7-006, M8-004/005, M14-003 and M15-006:** implement/test small changes with backwards-compatible schema migrations and mocks. Production migration requires separate backup and safe rollout verification.
- **M17-006, M19-002/003/007, M20-001/002:** static security and accessibility checks, browser/performance audits, redacted telemetry design and non-destructive preview tests. Only mark complete after the actual coverage required by the roadmap is demonstrated.

### Wave D — Explicit owner, provider or legal gates (do not self-approve)
- Product choices: final assortment, licensing, stock/SKU business model, supplier fulfilment method, approved image hosting, launch copy and policies.
- Financial/legal: destination prices and exclusions, tax nexus/treatment, live Stripe mode, actual refunds or charges, verified Resend delivery, shipping/duty liability and privacy/legal policies.
- Live integrations: private provider environment configuration, production database migrations/restore tests, R2 deletes and recovery, DNS promotion or rollback action, final production smoke test and launch signoff. Read-only account inspection may be performed without needing the owner when already authorized.

## Acceptance & reporting

Each PR must state changed task IDs, source SHA, exact checks and outcomes, notable warnings, whether preview/live behavior was exercised, and any incomplete dependency. If a task remains unchecked, explain precisely which evidence is missing. Store engineering evidence with GitHub Actions or redacted repository documentation, never secrets or customer data.

## Verified deployment checkpoint (read-only, 2026-09-27)

The connected Vercel project `tsuya-tsuya` (project ID `prj_xY975XUZMyiou8E0HAA6RAcPqkle`) has a READY production deployment `dpl_HxPEwcKskeRceyE83p6fmvxojTEE` for GitHub `jenozu/tsuya-tsuya`, `main` SHA `818f78fdb5eb31ef6c6703819749808276b13468`. Live deployment metadata lists aliases `tsuyanouchi.com`, `www.tsuyanouchi.com`, and the project's Vercel hostnames. A separate READY preview deployment `dpl_6im68bYtMaXjoE8fT2bTFSspULXs` targets PR #5's branch SHA `846326743e1830343a4321fc8c309ef0c1b34fa6`. Deployment READY proves build/deployment completion, **not** live checkout/database or DNS health. Recheck SHA after every merge.

### Documented rollback runbook

1. Capture the incident's production deployment ID, active GitHub SHA and symptoms. Do not roll back to a deployment that predates a breaking database migration.
2. In Vercel's deployment history identify the last **verified** compatible production deployment and record its ID. Do not assume `isRollbackCandidate` means it has passed payment smoke tests.
3. An authorized operator executes `vercel rollback <previous-deployment-id-or-url>` for the correct linked project, or uses Vercel's supported production rollback interface.
4. Run `vercel rollback status`, inspect production aliases and deployment status, and smoke-test catalog/admin and payment provider connectivity **without creating a live charge**. Restore forward deployment after root cause is fixed.
5. If schema or provider configuration changed, stop and use the separately verified database/provider recovery procedures; a deployment rollback alone does not roll back external state.

Reference: https://vercel.com/docs/deployments/rollback-production-deployment

Owner signoff, live payment smoke tests, backup restore drills and emergency access verification are separate roadmap tasks.
