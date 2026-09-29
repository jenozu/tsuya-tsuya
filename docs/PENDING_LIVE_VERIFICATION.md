# Production verification checkpoint — return to this before launch

**Recorded 2026-09-29.** The connected Vercel deployment record for `tsuyanouchi.com` was `READY`, environment `production`, deployment `dpl_AmptDTU8oCVNpnq3VAUnVY5toe3N`, GitHub `main` commit `03192d1c972e81c8fbfaf56d7bcde288b6999f5f`. The live alias list included the apex and `www` domains. This verified deployment metadata for the release containing independently developed Tasks 7–9, **not** live functionality.

The Vercel connection denied requests to the live pages, so the storefront could not be independently opened through the connector. Before launch, complete and record the following in a separate, authorized production/test-mode verification session:

- [ ] Reconfirm current **production** deployment is READY, both domains resolve to the intended deployment, and the deployed SHA matches the reviewed release SHA. The SHA above is only a historical checkpoint.
- [ ] Open homepage, populated product listing, product detail, cart, checkout, and mobile navigation in a real browser. Verify production API/product storage and image rendering without creating an actual paid order.
- [ ] Confirm authenticated admin login, logout, product/image controls and security/error handling with an authorized test account and disposable content; avoid deleting live customer records.
- [ ] Exercise Stripe **test-mode** checkout creation, retry/idempotency, expired/canceled return, signed webhook processing, order persistence and customer/owner email with safe test recipients. Do not mistake mocked CI tests for live integrations.
- [ ] Independently verify the intended **live-mode** Stripe credentials and webhook destination, shipping/tax business policy and allowed checkout countries before accepting real money; controlled live purchase/refund needs owner approval.
- [ ] Verify Vercel/GitHub production auto-deploy integration for future merges. The Tasks 7–9 merged SHA required a manual production deployment, even though preview builds existed.
- [ ] Record evidence (timestamps, sanitized screenshot/test run IDs, deployment SHA), responsible reviewer and remaining issues. Never store private API keys, customer details, payment metadata or unredacted logs in this file.

**After Task 10:** repeat current SHA/deployment verification. A successful CI run or READY preview is not equivalent to a production release, and a manual production promotion must not be initiated without the owner's instruction.

## Checkpoint after the original 12 independent development tasks

The initial production deployment snapshot above is **historical**, not proof that later Tasks 10–12 are live. Task 12 adds `/api/release` and a read-only two-domain verifier; see `docs/TASK_12_RELEASE_VERIFICATION.md` for the Windows-compatible command to run against the next **approved production deployment**.

- [ ] After Task 12 merges and the appropriate approved production promotion, run the verifier with the exact reviewed new `main` SHA on apex and `www`; record the sanitized result and confirm Vercel's deployment record agrees.
- [ ] Inspect the production security headers and test actual release URL and homepage separately; a READY deployment and successful release verifier **do not** validate populated catalog, checkout, admin, database or external provider delivery.
- [ ] Check Task 11's staged, un-applied payment/email migration and delayed-webhook retry design against an isolated Neon test database and real Stripe test mode **before** approving any production migration or asserting durable duplicate prevention.
- [ ] Confirm whether the Vercel Git integration builds and promotes future `main` merges automatically. The user previously had to manually deploy the release that contained Tasks 7–9.
- [ ] Keep the rest of the original checklist above open until the named provider-connected checks have actually been completed and independently documented.

No provider API keys, real customer data or production migration results belong in this public repository checklist.
