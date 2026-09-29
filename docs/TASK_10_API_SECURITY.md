# Task 10 — API input boundaries, response headers and abuse-protection handoff

Task 10 independently hardens selected high-risk entry points without changing production credentials, provider policies or payment settlement. Code changes require passing the full PR CI gate before merge.

**Implemented:** a shared streaming JSON parser enforces an actual decoded-byte limit instead of trusting Content-Length. Admin login, preview access and public waitlist accept at most 2 KiB of JSON; checkout session initiation accepts at most 32 KiB. Unsupported content types (HTTP 415), malformed bodies (400), and oversized input (413) fail before any DB/payment/email work. Admin cookies and auth responses remain server-side and sensitive auth responses are no-store. Image upload now rejects a declared multipart size above 10 MiB plus a small multipart allowance before attempting parsing; decoded image validation and existing file-byte checks still apply.

Global Next.js response headers include anti-framing, MIME-sniffing protection, reduced referrer disclosure, and disabling camera/microphone/geolocation. HTTPS production gets six-month HSTS **without** subdomain/preload directives. This change deliberately does not set a strict Content-Security-Policy without verifying all first/third-party scripts, Stripe checkout workflows, image hosts and admin tools. Security headers must be checked on the actual Vercel response in a separate release check.

**Evidence:** `tests/api-bounds-headers.test.mjs` covers actual chunked and forged-length requests and header selection. `tests/api-abuse.integration.mjs` drives actual admin, checkout, waitlist and image routes with deliberately malicious synthetic requests and zero real provider calls. Existing origin/session, validation, redaction and full browser tests remain in CI.

**Not completed automatically:** project-wide distributed login/preview/upload/waitlist rate limiting, WAF rules and IP policy, a strict site-compatible CSP, object ownership proof for historical R2 keys, removing the admin-password fallback to the signing key (requires explicit secret-rotation verification), and real-traffic abuse/availability testing. A per-process counter would not enforce a global limit on Vercel serverless instances and is intentionally not presented as rate limiting. A confirmed shared limiter/WAF and measured policies approved by the owner are still required before checking the full `TSU-M17-004` or `TSU-M8-004` roadmap acceptance criteria.

## Later, separate live verification

See `docs/PENDING_LIVE_VERIFICATION.md`. It records the prior production deployment SHA and tracks the requested later verification of live storefront, Stripe test-mode, database, emails, auto-deploy and live domain behavior. After merging Task 10, compare current production deployed SHA with reviewed `main` and check the real headers with an authorized browser or request; do not assume GitHub merge itself deploys the change.
