# Task 12 — safe release-fingerprint checks and owner verification handoff

Task 12 creates a **read-only** release verification capability so reviewed GitHub changes are not mistaken for the version actually serving customers on Vercel. It does **not** deploy, modify providers, run migrations, send emails, authorize admin, charge cards, or certify end-to-end commerce functionality.

## What the release endpoint establishes

`GET /api/release` returns a non-cached JSON object containing `service: "tsuya"` and the exact **Vercel Git commit SHA** (`VERCEL_GIT_COMMIT_SHA`) when configured. Its status is HTTP 200 when the SHA is a valid 40-character Git fingerprint; otherwise it returns a redacted HTTP 503 with `release: null`. It does **not** expose database status, secret names or values, emails, customer details, environment-variable inventories or checkout state. It reads no external provider. A 200 means the route and its build provenance are available, not that a real order can be fulfilled.

If this endpoint returns 503 in a READY deployment, verify in the connected Vercel project that its system-provided Git commit variable is enabled for that deployment and the correct Git repository/ref was deployed. Adjust Vercel's **system environment-variable exposure** only after reviewing existing configuration and then redeploy. Do not synthesize a fallback SHA from an unverified operator-supplied public setting, a hard-coded commit or a runtime secret.

## After an approved production deployment

In a fresh local checkout of the exact reviewed GitHub `main` commit, use `git fetch origin main` and inspect the commit with `git rev-parse origin/main`. Do not assume the most recent merged commit automatically reached Vercel. Pass the full reviewed **40-character** SHA:

```powershell
npm run verify:release -- --sha <FULL-REVIEWED-MAIN-COMMIT> --origin https://tsuyanouchi.com --secondary https://www.tsuyanouchi.com --require-hsts
```

The verifier sends only **GET** requests to `/api/release` and `/` on the two explicitly named public hosts. It refuses incorrect SHAs, unavailable fingerprints, unauthorized redirects to other hosts, unexpected HTTP statuses, missing anti-framing/MIME protections and production HSTS problems. A redirect from `www` to the apex is allowed when both hosts were supplied. A 200 HTML response on `/` can still be the password/under-construction storefront: the script prints this limitation. It never opens checkout sessions or probes private APIs.

If a hosting preview intentionally lacks production HSTS, omit `--require-hsts` and supply only the preview's reviewed HTTPS origin. Use `--no-home` if its homepage is intentionally not accessible during release diagnosis; this **reduces** coverage and must be noted in the review evidence.

The command fails with a nonzero exit code on mismatches. This is an operator-run smoke check, **not** GitHub CI attempting to access real live credentials. GitHub CI separately covers the endpoint and verification logic using synthetic requests with no network connections. Never commit a test or CI job that embeds live credentials or runs a production write.

## What remains to be verified separately

See `docs/PENDING_LIVE_VERIFICATION.md` for the owner's deferred checklist covering populated product pages, checkout/cart, real authenticated admin and R2/Neon interaction, Stripe **test-mode** signed webhook replay/duplicate settlement and emails, shipping/tax/destination decisions, domain behavior, production deployment tracking and launch approval. Task 11's `003_payment_delivery_foundation` is **staged and unapplied**; do not use an additional deployment to imply payment/email idempotency is operational. Confirm isolated migration/bootstrap/upgrade and backup/restore separately, then obtain production migration approval.

## Evidence for this repository-only task

`tests/release-verification.test.mjs` exercises allowed domains, www-to-apex redirect, good/stale SHA, missing/invalid headers, unavailable releases, inaccessible homepages and malformed inputs using zero-network synthetic fetches. `tests/release-route.integration.mjs` imports the actual Next.js route with the existing isolated route loader; it checks only sanitized SHA/no-store behavior. The full existing GitHub candidate build, unit/API integration, infrastructure/security checks and browser tests must pass before merging.

**Canonical roadmap:** provides partial readiness/observability tooling for `TSU-M20-002` and extends the existing `TSU-M1-007` verification procedure. Monitoring, live host checks, external-provider tests and automated production rollout remain separate, unchecked where applicable.
