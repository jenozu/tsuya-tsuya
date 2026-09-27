# Tsuya — Service Ownership and Credential Runbook

Scope: GitHub, Vercel, Neon PostgreSQL, Cloudflare R2, Stripe, Resend, domain/DNS, and app admin/preview access. **No credentials, account IDs, owner contact addresses, customer records or recovery codes belong in this repository.**

This document assigns *roles*, not verified account holders. Privileged account ownership and backup contact names must be recorded privately by the store owner before launch; this repository must not be mistaken for a live access audit.

## Responsibility matrix

| Area | Accountable role | Operational responsibilities | Minimum permissions |
| --- | --- | --- | --- |
| Store, pricing, legal/privacy, launch | Store owner | Approve prices, countries, policies, content licensing, live payment changes and launch | Provider account ownership retained by the owner |
| GitHub and deployments | Technical maintainer | Review PR checks, deploy/rollback, monitor errors, maintain CI | Repo write for reviewed changes; deployment permissions only where essential |
| Database and backups | Store owner + designated DB operator | Restricted read/write migrations, encrypted backups, isolated restoration and rollback plan | Separate production vs test credentials; prefer per-environment scoped accounts |
| Images | Design/content operator + technical maintainer | Licensed content, R2 uploads/asset retention and safe recovery | Scoped bucket access instead of broad Cloudflare account access |
| Payments and financial records | Store owner | Approve Stripe live settings, refunds, tax treatment and financial reconciliation | Read-only access for audits; write access only for authorized merchant actions |
| Transactional email and support | Store owner + support operator | Verify sender domain, monitor delivery and handle customer communications | Restricted sending/log access; separate test and production |
| Domain and DNS | Store owner + delegated DNS operator | Renewals, DNS/HTTPS verification and incident recovery | Registrar ownership stays with owner; DNS changes reviewed |

If one person fills several roles, keep the permissions and secrets separate by environment; do not create an additional shared superuser for convenience.

## Normal access and least privilege

1. Use individual accounts and multifactor authentication wherever offered. The store owner retains billing, registrar and recovery ownership and stores emergency instructions in a private password manager.
2. GitHub: require review and passing CI for production branches once branch protection is enabled; never embed deploy tokens in workflow code or allow untrusted PRs to receive production secrets.
3. Vercel: only environment-variable **names/scopes** are included in audit notes. Maintain separate Preview/Production variables and restricted team access; do not copy live values into preview.
4. Neon: never expose `DATABASE_URL` to the browser. Use a distinct isolated test database and credentials; production migrations require a backup, reviewed SQL, compatibility plan and post-migration verification.
5. R2: scope API access to the needed bucket/operations. The public asset URL is not a secret; object-storage access keys are. Avoid publicly listing the bucket and validate upload types.
6. Stripe: use test-mode or sandbox authorization for development. A live **read-only** connector is sufficient to inspect settings; live charges, refunds and mutations need separate explicit approval. Never mix test/live webhook-signing secrets or publish restricted keys.
7. Resend: verify the permitted sender domain; separately configure `RESEND_FROM_EMAIL` and `ORDER_NOTIFICATION_EMAIL`. Missing values must fail closed instead of sending to sample fallback addresses.
8. Admin: use separate strong `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` and `PREVIEW_PASSWORD` values. No `NEXT_PUBLIC_*` secret variables. Rotate preview/admin secrets after access changes; a preview cookie must be signed.

## Routine secret rotation

Perform promptly after an exposure, employee/contractor access change, suspicious use or provider notice; schedule routine review at least quarterly. Record rotation dates and last four non-sensitive key-ID characters **privately**, never key material.

For each affected provider:
1. Identify owners, dependent services, relevant environment, rollback point and a recovery contact. Capture the current **variable names and scopes only**.
2. Issue a new least-privileged credential in the provider dashboard. Install it in the appropriate Vercel target environment without printing it to build logs; keep previous credential temporarily if overlap is supported.
3. Deploy a preview/test build first and verify only the needed operations with isolated test resources. For live production, coordinate a brief change window and follow the approved payment/database release procedure.
4. Revoke the former credential in the original provider; confirm it is no longer usable by viewing provider status and audit logs without exposing values.
5. Record a redacted change ticket, who verified access and which deployments depend on it. If verification fails, stop and follow the provider-specific recovery steps rather than pasting credentials into GitHub issues.

For `ADMIN_SESSION_SECRET` or `PREVIEW_PASSWORD` rotation, old sessions will be invalidated; coordinate admin access and confirm fresh authentication. Stripe key or webhook-secret rotation also requires verification of the matching endpoint and **sandbox-first** event tests.

## Incident revocation

- Freeze unnecessary deploys and preserve redacted GitHub/provider audit evidence; immediately revoke known leaked keys/tokens at the issuing provider. Do not delete evidence or customer records.
- Identify the compromised environment and dependencies, rotate credentials, and inspect access, Stripe event history, Neon changes, R2 object operations and email deliveries as applicable.
- Restrict compromised admin/preview accounts and revoke their active sessions through secret rotation while maintaining a known-good recovery owner.
- If payment totals or customer data may be affected, the store owner handles legal/provider notifications, reconciles orders and decides whether to pause checkout. Do not trigger live refunds or modify records without approval.
- For deployment regressions, use `AUTONOMOUS_EXECUTION_PLAN.md` for deployment rollback. A Vercel rollback does **not** reverse database changes, payments or outgoing email.

## Safe environment checklist

Before approving a production release, review **presence, environment scope and restrictions without revealing values**:
- Core: `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.
- Site/admin: `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`; `PREVIEW_PASSWORD` and `NEXT_PUBLIC_UNDER_CONSTRUCTION` only when needed.
- Payment: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` must all refer to the same intended live or sandbox mode. Only the publishable key may be public.
- Mail: `RESEND_API_KEY`, `ORDER_NOTIFICATION_EMAIL`, `RESEND_FROM_EMAIL` must be real verified business destinations.
- Optional: `GEMINI_API_KEY` only if that service is enabled.
- Confirm there are no placeholder destination addresses, hardcoded secrets, mis-scoped preview credentials or missing webhook-secret variables.
- Verify CI, production deployment SHA, preview isolation, redacted logs, backup availability, live endpoint security, test-transaction evidence and rollback contacts separately before launch.

**Evidence distinction:** This runbook defines procedures. Checking it in is not evidence that provider accounts have correct privileges, keys are rotated, backups actually restore, taxes are approved, or a live payment/refund succeeds. Those remain separate unchecked roadmap items.
