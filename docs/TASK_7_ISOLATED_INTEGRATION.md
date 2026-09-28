# Task 7 — isolated image-route and database verification

This checkpoint extends earlier route-handler tests without making requests to production Neon or Cloudflare R2.

## Automated, credential-free route coverage

The test-only ESM loader redirects `@/lib/r2` to `tests/fixtures/mock-r2.mjs` in the isolated route-test process. It does not change app/runtime modules or production imports.

`tests/product-images.integration.mjs` exercises the **real** Next.js image upload and deletion handlers with generated synthetic PNG bytes, and asserts:

- No upload/deletion without a signed admin cookie and same-origin request.
- Missing, empty, >10 MB and MIME-spoofed uploads are rejected **before** the mocked R2 boundary is called.
- An authorized genuine PNG produces one write containing original bytes and a product-scoped generated key.
- Missing, cross-host or non-product deletion targets are rejected without a delete.
- Storage failures return redacted generic responses, never raw provider details.

The existing product CRUD/CSV route tests remain in the same CI job. No external storage credentials are supplied.

**Run locally** after `npm ci`:

```sh
node --experimental-strip-types --experimental-loader ./tests/fixtures/admin-route-loader.mjs --test tests/route-authorization.integration.mjs tests/api-error-privacy.integration.mjs tests/admin-authentication.integration.mjs tests/product-mutations.integration.mjs tests/product-images.integration.mjs
```

PR CI also runs lint, baseline/security/migration checks, unit tests, typecheck, production build and Chromium tests. These are separate from actual live storage verification.

## Optional real Neon test — separate empty disposable database ONLY

The repository includes `scripts/test-disposable-neon.mjs` to exercise the real baseline migration and basic PostgreSQL CRUD/constraints **only when an operator supplies a brand-new, empty, isolated Neon database/branch**. It is intentionally excluded from automatic PR CI and refuses to run without explicit acknowledgement. This script never reads production connection details from Vercel, and its synthetic records are removed on completion. The disposable schema and migration ledger intentionally remain for inspection; delete the whole test branch/database after reviewing it.

1. Privately create a **new empty** Neon test branch/database. Verify its project/branch identity in the provider console, backup/restore expectations, and that it has no production traffic, copies of customer data, or shared apps.
2. Set `TEST_DATABASE_URL` privately for that **new test database**, not `DATABASE_URL`; unset `VERCEL_ENV` and never paste connection URLs into chat, source or CI logs.
3. Set `TSU_DISPOSABLE_DB_ACK=CREATE_ON_EMPTY_TEST_DATABASE` in the same private shell and run `npm run test:disposable-db`.
4. Inspect the private test branch and destroy it when no longer needed. Do not rerun against an initialized database: the script will refuse it.

This creates the baseline and verifies the migration ledger, product insert/read/update/delete, database enforcement of nonnegative stock, and unique order IDs. It is a database/schema smoke test, **not** proof that the actual application route successfully persisted an order or that the production schema is synchronized. A separately approved disposable-database application integration test and production-like upgrade/no-loss rehearsal are still needed to fully finish TSU-M18-003 and TSU-M3-004.

**Never** point this script at production or a database containing real customer records. It is not a production migration command.

## Remaining external verification

- Actual upload, public URL rendering and authorized deletion in a disposable R2 bucket (M8-003).
- Distributed upload limits and historical object ownership safeguards (M8-004).
- Real isolated DB-backed app order/CRUD integration, actual R2 integration, and full migration upgrade without data loss (M18-003/M3-004).
- Review current deployment SHA before claiming any live behavior has been tested.
