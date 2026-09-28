# Pull-request verification and release gate boundaries

This document explains the repository checks introduced or confirmed under independent Task 4 (TSU-M18-006). These checks must not be confused with verified production configuration, a successful live purchase or enforced repository branch protection.

## What each pull request must pass

The `.github/workflows/infra-guard.yml` workflow runs on PRs targeting `main` with an explicit read-only GitHub token. A concurrency group cancels obsolete runs for the same PR. Each job has a timeout.

- **verify:** infrastructure references and the workflow's own mandatory-check policy, with no service credentials.
- **baseline-build:** checks out the current `main`, runs locked dependency install, infrastructure verification, standalone TypeScript checking and a production build. This distinguishes pre-existing main-branch failures from a proposed change.
- **candidate-build:** checks out the proposed PR merge result, records its exact commit and runs locked `npm ci`, CI self-verification, dependency audits, infrastructure checks, diff and changed-file format validation, static security checks, lint, offline migration-plan validation, unit regression tests, isolated authorization/API-privacy integration tests, TypeScript checking and a production Next.js build.

Candidates retain verification logs for 14 days, including failures. No test touches production Stripe, Neon, R2 or customer messages.

## Dependency and security auditing

The candidate reports **high and critical production dependency advisories** as a visible but non-blocking audit; an additional **critical** production dependency audit is mandatory. This distinction is intentional: high advisories require triage rather than an unreviewed automatic dependency upgrade. A critical finding, offline registry error or unavailable advisory service blocks that PR until assessed. The static security guard and CI-policy self-check are mandatory as well.

The static guard checks for several high-risk regressions: unsafe Next image/TypeScript settings, disabled same-origin or admin session checks, reopened client-amount-driven payment routes, missing server-authoritative checkout pricing/redirect rules, missing webhook signature verification, and direct API exception logging. Negative unit tests confirm the guard rejects deliberate removals of key protections. These source checks **supplement**, not replace, route integration testing.

**Known exception awaiting owner verification:** `lib/admin-session.ts` can fall back to `ADMIN_PASSWORD` if `ADMIN_SESSION_SECRET` is unset. The guard reports this existing condition as an explicit warning. Removal must be coordinated only after the actual production environment scope is confirmed so the owner does not lose admin access (tracked separately as TSU-M7-004).

## Safe review, artifacts, and merging

1. Open an isolated PR. Review the diff and check that every job completed successfully; investigate any newly reported high dependency advisories.
2. Use each run's retained candidate/baseline artifacts to review exact source commit, dependency install, infrastructure/security policies, lint, unit/integration results, typecheck and build outcome.
3. Check the matching Vercel preview if Vercel capacity allows. A Vercel deployment rate limit **does not** prove a preview is ready; record it as an explicit outstanding verification gap.
4. Do not merge red CI checks. Passing CI alone is **not** equivalent to GitHub branch protection: an owner must configure and verify required status checks, review policy and deploy promotion permissions separately (TSU-M18-007).
5. Never copy provider secrets, production customer data or webhook signing values into CI to force a passing build. Resolve external-production dependencies through their separate acceptance tasks.

## Local verification

- `npm ci` and `npm run ci:check` validate the current workflow independently of credentials.
- `npm run verify:infra` and `npm run verify:security` validate infrastructure/security source invariants.
- `npm test`, `npm run lint`, `npm run migrations:check`, `npx tsc --noEmit` and `npm run build` are reproducible after dependency installation.
- `npm run format:check -- <40-character-merge-base-sha>` checks changed source/config line endings, final newlines and JSON syntax. The workflow also runs `git diff --check` to reject added whitespace mistakes.
