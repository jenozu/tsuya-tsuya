# Admin access, recovery, and product change control

_Last repository audit: 2026-09-27. This describes currently implemented safeguards and the gaps that remain before launch. It contains no credential values._

## Current authentication and security model

- `/admin/login` uses a single environment-backed `ADMIN_PASSWORD`. On a successful login the API issues an HTTP-only, SameSite=Lax `admin_session` cookie with an HMAC-SHA256 signature. Its maximum lifetime is currently seven days. This is a shared administrator identity, **not** individual staff accounts or role-based access.
- `ADMIN_SESSION_SECRET` should always be distinct from `ADMIN_PASSWORD`. **Outstanding security debt:** the current `lib/admin-session.ts` can fall back to the password as signing key when a separate secret is missing. Never treat this fallback as an acceptable production configuration; removing it safely requires verification of the active production variable scope (TSU-M7-004/M2-003).
- Admin mutations require a valid session. The browser-facing product/image/order routes check same-origin request metadata and Origin before processing writes; Stripe's separate webhook uses signature verification.
- Logout clears only the current browser's cookie. There is currently no server-side global session ledger, per-person audit trail, inactivity timeout, distributed login throttling or selective staff revocation. Those are **not** completed features.

## Authorized administrator recovery

1. Verify identity privately using the store owner's existing recovery process and MFA-protected Vercel/registrar ownership. Do not use a public support issue or email thread to exchange passwords.
2. Before changing anything, identify the actual Vercel production project and environment scopes, the current deploy's GitHub SHA, the owner who can recover the account, and a compatible rollback deploy.
3. If a browser cookie is lost but the administrator knows the password, simply sign in again at `/admin/login`; do not rotate unrelated provider keys.
4. If credentials are lost, shared, possibly compromised, or staff access must be revoked, the authorized owner generates **both** a new strong `ADMIN_PASSWORD` and an independent random `ADMIN_SESSION_SECRET` using a trusted password manager or secrets generator. Changing only `ADMIN_PASSWORD` does **not** revoke already-signed sessions while `ADMIN_SESSION_SECRET` is unchanged.
5. Apply the new values in Vercel's **Production** environment through the private dashboard, without revealing them in screenshots, GitHub, build logs, or support chat. Re-deploy the reviewed code so the new environment takes effect. Preview credentials remain separate. Rotate `PREVIEW_PASSWORD` as well if unauthorized preview access is suspected.
6. Have the authorized owner test a new admin session using a private browser. Check that a previously signed session is rejected on a separate browser and that expected admin mutations work after sign-in. If recovery fails, stop; follow the least-privilege incident runbook and provider recovery process rather than weakening guards.
7. Privately record the approver, rotation date, impacted deployment SHA, evidence of old-session invalidation, and any incident/cross-system remediation in the owner-managed incident tracker. Do not record secret values.

## Staff access and audit limitations

Until per-person accounts/roles are designed and implemented, **do not issue the shared production admin password to staff**. The owner should determine whether delegated roles (for example catalog editor, fulfillment operator or read-only customer-support staff) are genuinely needed before selecting an authentication solution. Future implementation must provide person-specific authentication, least privilege, server-side audit records and session revocation. Current order/admin records do not establish who made a particular change.

For now, GitHub PR history and approved provider audit views can show deployment changes, but they are **not** a substitute for a product-level audit log. If investigating a catalog update, compare a pre-change CSV/catalog export, the affected product's current record and operator-maintained change ticket; do not speculate about the actor from a shared login. Log planned future events as redacted actor ID, action, timestamp, target product/order reference and correlation ID, without embedding customer addresses or payment metadata.

## Catalog, image and order change management

1. Create a ticket specifying the purpose, proposed catalog/image changes, affected product IDs, whether prices and variants change, who approved the business content, and a rollback method. A prior CSV export is useful for review but is **not** a database backup.
2. Validate on preview or an isolated test database first: valid variants/prices, R2 links, checkout price refresh, and accessibility. Production-only preview environment variables must not silently point at production data.
3. Preserve a compatible product/data snapshot via the approved private backup procedure before bulk imports, bulk deletes, migrations, or inventory changes. Current CSV re-imports are not atomic, and the admin's bulk-delete API does not offer a transactional undo; treat these operations as irreversible unless a restore was verified.
4. Require a second review for destructive or price-affecting changes where staffing permits, and coordinate any change affecting unpaid carts or paid orders with the store owner.
5. After a reviewed PR passes locked dependency install, infrastructure guard, lint, tests, typecheck and production build, inspect the target Vercel preview. Once deployed, confirm the deployed SHA, catalog UI, SKU/variant availability and representative cart totals **without making a live charge**. Do not assert that Stripe/Neon/R2/Resend integrations work solely from a successful build.
6. For regressions, stop destructive actions; follow `AUTONOMOUS_EXECUTION_PLAN.md` for a code rollback, and use an independently verified database/R2 recovery procedure for external data. Restoring a previous deployment cannot undo orders, payments, image deletions or a SQL migration.

## Outstanding release gates

- Implement and verify distributed login throttling, truly separate production signing secrets, selective session revocation and an inactivity timeout (TSU-M7-004).
- Verify production admin create/edit/delete/bulk-delete and downstream image/order reference behavior in an authorized non-destructive test (TSU-M7-003).
- Add integration tests proving unauthorized and malformed admin requests never mutate records (TSU-M7-006/M18-003).
- Obtain owner approval for staff permissions and test the recovery process with authorized access. This **document** does not constitute those implementations or a completed provider audit.

See `docs/SERVICE_ACCESS_RUNBOOK.md` for cross-provider credential rotation, incident response and least-privilege responsibility mapping.
