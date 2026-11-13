# TsuyaNoUchi task checklist

Generated from `.taskmaster/tasks/tasks.json` (the source of truth). Never edit by hand; regenerate with
`python .taskmaster/render_tasks_md.py`.

**Progress: 12/51 tasks done.**

## Phase 0 - Foundation

- [x] **1. Run and record baseline quality gates**  
  Know exactly what passes on current main before changing anything.  
  _Test:_ All six commands were run and each result is in the task log (`tasks.py show`); no source file changed (`git status --short` shows only harness files).
- [x] **2. Reconcile master_plan.md and the PRD against current main** _(after 1)_  
  Replace the unverified 67 done / 74 open snapshot with checked facts.  
  _Test:_ `grep -c '^- \[x\]' master_plan.md` and the open count equal the numbers logged; the drift list is in the task log.
- [x] **3. Owner: review and approve the PRD** **[HUMAN]**  
  The PRD is a DRAFT generated from the repo docs; the plan is only as good as it is.  
  _Test:_ PRD Status line no longer says DRAFT and the decision log has a dated 'approved' entry.
- [ ] **4. Owner: provide isolated test resources** **[HUMAN]**  
  Integration tests need a disposable database; agents must never touch production.  
  _Test:_ Owner confirms in chat. Later tasks verify with `npm run test:disposable-db`; until then tasks needing a database stay offline-only.

## Phase 1 - Hardening

- [ ] **5. Harden admin login: throttling, session revocation, inactivity timeout** _(after 1)_  
  Close the open admin-auth gaps without claiming per-instance counters are distributed protection.  
  _Test:_ `npm test --silent` passes with new tests for lockout, revocation and timeout; tests/route-authorization.integration.mjs still passes; `npm run migrations:check` passes.
  - [ ] 5.1 Design the store and write failing tests
  - [ ] 5.2 Implement throttling and revocation
  - [ ] 5.3 Inactivity timeout and docs
- [ ] **6. Upload abuse limits and object ownership** _(after 5)_  
  Finish the image-upload gaps left after the magic-byte checks.  
  _Test:_ tests/image-validation.test.mjs plus new tests cover rate limit and ownership; `npm test --silent` green.
- [ ] **7. Expand isolated integration tests for admin and catalog** _(after 1)_  
  Cover authorized/unauthorized admin actions and catalog mutations.  
  _Test:_ `node --experimental-strip-types --test tests/*.integration.mjs` passes; new cases fail when the guard they test is removed (noted in the log).
- [ ] **8. Enforce checks and a release checklist in CI** _(after 1)_  
  Make lint, typecheck, tests and the migrations check required and documented.  
  _Test:_ `npm run ci:check` passes; the workflow runs lint, tsc, npm test, migrations:check and build; tests/ci-guard-policy.test.mjs updated and green.
- [ ] **9. Review dependencies, R2 exposure and preview access** _(after 1)_  
  Record findings for the remaining security-review items.  
  _Test:_ Report logged with counts by severity; each finding became a task or a parking-lot line.
- [x] **46. Fix 2 failing ci-guard-policy tests (baseline finding from task 1)**  
  npm test fails on tests #40 and #41 in tests/ci-guard-policy.test.mjs on current main.  
  _Test:_ npm test --silent passes with 0 failures

## Phase 2 - Order integrity

- [ ] **10. Persistent payment-event and email ledger with safe retries** _(after 5, 4)_  
  Activate the staged ledger so webhook and email processing is idempotent and recoverable.  
  _Test:_ tests/stripe-webhook-safety.integration.mjs and the new concurrency/duplicate/out-of-order tests pass; `npm run test:disposable-db` passes on the owner's isolated database once the test-resources task is done.
  - [ ] 10.1 Event claim and lease logic with tests
  - [ ] 10.2 Retry-safe order creation and email send state
  - [ ] 10.3 Delayed and out-of-order event handling plus recovery path
- [ ] **11. Persist authoritative order line items** _(after 10)_  
  Store product, size, unit price, currency and shipping/tax breakdown per order.  
  _Test:_ New unit and integration tests assert line items match server-derived pricing (lib/checkout-pricing.ts); migrations:check passes.
- [ ] **12. Duplicate checkout submission, expiry and returning shoppers** _(after 1)_  
  Prevent double sessions and handle cancel/expiry cleanly.  
  _Test:_ tests/checkout-attempt.test.mjs extended and green; `npm run test:e2e` cart-checkout spec still passes.
- [ ] **13. Stripe webhook and tamper test suite** _(after 10)_  
  Cover tampered prices, invalid destinations, retries, duplicates, refunds and out-of-order events with mocks.  
  _Test:_ `npm test --silent` and the integration suite pass with the new cases.
- [ ] **14. Stripe-to-Neon reconciliation procedure** _(after 11)_  
  A documented read-only procedure (and optional read-only script) to compare paid/refunded amounts.  
  _Test:_ Doc reviewed; a script (if any) defaults to dry-run and has a unit test with fixtures.
- [ ] **15. Owner: run Stripe test-mode sandbox cases and the webhook round-trip** **[HUMAN]** _(after 10, 11)_  
  Provider-connected evidence the agents cannot produce.  
  _Test:_ Evidence lines with dates and sanitized IDs added to docs/PENDING_LIVE_VERIFICATION.md.

## Phase 3 - Printify fulfilment (R15)

- [x] **16. R15 design: Printify order submission and status sync** _(after 2)_  
  Write the design from Printify's official API documentation before any code.  
  _Test:_ docs/PRINTIFY_FULFILLMENT.md exists with every section above and cites the doc URLs; PRD decision log updated.
- [ ] **17. Owner: Printify account, credentials and availability decision** **[HUMAN]** _(after 16)_  
  Provide what only the owner can.  
  _Test:_ Owner confirms the decision and that the variables exist by NAME in Vercel preview; the agent records the decision in the PRD log.
- [x] **18. Printify config, schema and client (mock-tested)** _(after 16)_  
  Server-only config, an additive table for Printify orders, and a typed client.  
  _Test:_ New unit tests pass with the mock; `npx tsc --noEmit`; `npm run migrations:check`; `git grep NEXT_PUBLIC_PRINTIFY` finds nothing.
  - [~] 18.1 Config module and env template names
  - [~] 18.2 Additive printify_orders migration
  - [~] 18.3 Typed client with mock and error mapping
  - [x] 18.4 Printify server config, flag and env template names
  - [x] 18.5 Forward migration 004_printify_orders (written and checked, never applied)
  - [x] 18.6 Typed Printify client: createOrder with mock fetch and error mapping
  - [x] 18.7 Client getOrder plus task-level checks
- [x] **19. Submit the order after verified Stripe payment, idempotently** _(after 18)_  
  Create the Printify order from the webhook path only after payment is confirmed; retry safely.  
  _Test:_ New integration tests: paid -> one Printify order; duplicate event -> still one; Printify 5xx -> retry state, then success; unpaid -> none; captured logs contain no customer data.
  - [x] 19.1 Wire submission into the webhook path
  - [x] 19.2 Retry and failure handling with admin visibility
  - [x] 19.3 Idempotency and redaction tests
- [ ] **20. Printify status and tracking sync to the order and customer email** _(after 19)_  
  Receive Printify status/tracking and reflect it on the order and in a shipped email.  
  _Test:_ A signed-event fixture test updates the order and sends exactly one email; an unsigned or tampered event is rejected; tests green.
- [ ] **21. Printify availability sync or admin flag** _(after 17, 18)_  
  Replace the manual size toggle according to the owner's decision.  
  _Test:_ Tests with the mock Printify: an unavailable variant disables the size or raises an admin flag per the decision; customer pages unchanged (no counts).
- [ ] **22. Owner: one controlled real Printify order and cancellation** **[HUMAN]** _(after 20, 21)_  
  Prove the integration end to end; the owner handles any real cost.  
  _Test:_ Sanitized evidence recorded; the owner confirms in chat.

## Phase 4 - Fulfilment ops and comms

- [ ] **23. Admin order details and explicit fulfilment states** _(after 20)_  
  Make order state transitions explicit and authorized.  
  _Test:_ Tests for allowed and rejected transitions and for unauthorized access; `npm test --silent` green.
- [ ] **24. Durable email status and lifecycle templates** _(after 10)_  
  Delivery state, retry, duplicate suppression and the missing templates.  
  _Test:_ tests/email-*.test.mjs extended and green; each template renders with escaped input.
- [ ] **25. Accessible contact form with spam controls** _(after 5)_  
  A server-validated contact form routed to the support inbox.  
  _Test:_ Route tests for valid, invalid, spam and over-limit requests; an e2e smoke test added.
- [ ] **26. Cancellation and refund procedure (guarded, test-only)** _(after 24, 23)_  
  Safe cancel/refund mechanics and docs without any live refund.  
  _Test:_ Mock tests: full and partial refunds update the order and send one email; no code path issues a refund without admin confirmation.
  - [ ] 26.1 Refund service and state sync with mocks
  - [ ] 26.2 Admin confirm step and route checks
  - [ ] 26.3 Runbook and evidence-collection doc
- [ ] **27. Assess made-to-order fit of M3-005, M6-006, M14-004 and M14-005** _(after 2)_  
  Decide with evidence which inventory and pick/pack items still apply under Printify.  
  _Test:_ A recommendation per item is logged and listed under the open questions in memory.md.

## Phase 5 - Experience quality

- [ ] **28. Accessibility audit and fixes** _(after 1)_  
  Keyboard, focus, labels, dialogs, contrast, alt text.  
  _Test:_ `npm run test:e2e` includes the new keyboard/label checks and passes; findings are logged.
- [ ] **29. Mobile layout checks and end-to-end coverage** _(after 1)_  
  Common widths, orientation, touch targets and overflow; e2e for mobile cart, checkout and admin.  
  _Test:_ `npm run test:e2e` passes at 360, 390, 768 and 1280 widths with no horizontal-overflow failures.
- [ ] **30. Performance, remote image patterns and derivatives** _(after 1)_  
  Core Web Vitals, responsive sizes, thumbnails and safe caching.  
  _Test:_ Before/after numbers logged; tests/trusted-image-patterns.test.mjs green; the build passes.
- [ ] **31. Replace placeholder imagery and verify preview behaviour** _(after 1)_  
  Remove random external product images and check the under-construction gating.  
  _Test:_ A test or e2e shows unfinished pages are hidden when the flag is on and reachable when it is off; `git grep` finds no random external image URLs.
- [ ] **32. Verify catalog behaviours and CSV import** _(after 7)_  
  Search, sort and availability labels, and CSV edge cases, against fixtures.  
  _Test:_ New CSV tests (invalid rows, duplicates, filename mapping, transaction safety) pass.
- [ ] **33. Cookie/storage inventory and analytics plan with consent hooks** _(after 1)_  
  Inventory first; implement only with an owner-chosen tool.  
  _Test:_ The inventory lists every cookie/localStorage key found with `git grep`; no analytics script added without a decision.
- [ ] **34. Owner: real browser and device pass** **[HUMAN]** _(after 29, 28)_  
  Chrome, Edge, Firefox, Safari, iOS and Android.  
  _Test:_ The checklist in manual-checks.md is ticked with dates and issues exist as tasks.

## Phase 6 - Operations

- [ ] **35. Structured redacted logging with order correlation** _(after 19)_  
  Correlation ids without personal data.  
  _Test:_ tests/safe-server-log.test.mjs and tests/server-logging-audit.test.mjs extended and green.
- [ ] **36. Owner: choose error monitoring and uptime checks, then wire them** **[HUMAN]**  
  The provider choice is the owner's; the wiring is the agent's.  
  _Test:_ The owner confirmed a provider; the health-route test passes; a synthetic error appears in the provider (owner confirms).
- [ ] **37. Retention, anonymisation, deletion/export and incident procedures (drafts)** _(after 33)_  
  Document the procedures; policy values are owner decisions.  
  _Test:_ The docs exist, cross-link the existing runbooks and contain no invented policy values (`git grep 'TBD:'` finds the placeholders).
- [ ] **38. Owner: backups and restore drills** **[HUMAN]** _(after 10)_  
  Real restores the agents cannot perform.  
  _Test:_ Evidence with dates added to docs/RECOVERY_RUNBOOK.md.
- [ ] **39. Owner: audit variable scopes and rotate secrets** **[HUMAN]**  
  A name-only audit and rotation in the provider dashboards.  
  _Test:_ The owner confirms rotation and that preview uses separate test credentials.

## Phase 7 - Launch gates (owner)

- [ ] **40. Owner decision: assortment, artwork rights and launch copy** **[HUMAN]**  
  Launch gate: owner only.  
  _Test:_ Decision recorded in the PRD decision log with a date.
- [ ] **41. Owner decision: destinations, shipping prices and duties** **[HUMAN]**  
  Launch gate: owner only.  
  _Test:_ Decision recorded in the PRD decision log; shipping tests updated and green after the agent applies it.
- [ ] **42. Owner decision: tax registration and treatment** **[HUMAN]**  
  Launch gate: owner and accountant only.  
  _Test:_ Decision recorded; a follow-up implementation task exists.
- [ ] **43. Owner: policies, business identity and notifications** **[HUMAN]**  
  Launch gate: owner only.  
  _Test:_ Approved text is committed by the agent and linked from the footer; decision recorded.
- [ ] **44. Owner: live Stripe mode, Resend domain and go-live approval** **[HUMAN]** _(after 40, 41, 42, 43)_  
  Launch gate: owner only.  
  _Test:_ The owner records sanitized evidence and explicit approval in the PRD decision log.
- [ ] **45. Launch verification and signed checklist** **[HUMAN]** _(after 44, 34, 38, 36, 39)_  
  Domain, smoke test, UX and rollback readiness.  
  _Test:_ A signed checklist with evidence links is committed under docs/ and the owner approval is recorded.

## Phase 8 - Black Friday lean launch

- [x] **47. BF: payment-path review and fixes** _(after 2)_  
  Review server-side pricing, Stripe webhook signature verification, USD-only Checkout with adaptive_pricing disabled; fix gaps with tests.  
  _Test:_ npm test --silent && npx tsc --noEmit; new tests: tampered client price ignored, bad/missing webhook signature -> 400, session params include currency usd and adaptive_pricing disabled; docs/PAYMENT_PATH_REVIEW.md exists.
- [x] **48. BF: one setting controls under-construction mode** _(after 2)_  
  A single server-side setting decides whether the storefront shows under-construction.  
  _Test:_ npm test --silent && npx tsc --noEmit; new unit test covers on/off/unset; git grep shows every under-construction decision routes through the one helper.
- [x] **49. BF: policy page scaffolding** _(after 2)_  
  Shipping, returns, privacy and terms pages with [OWNER TO SUPPLY] placeholders.  
  _Test:_ npm test --silent && npx tsc --noEmit && npm run lint --silent; each route renders (unit or build check); grep finds no legal wording beyond placeholders.
- [x] **50. BF: order and shipping emails render; sender from config** _(after 2)_  
  Verify order confirmation and shipping email templates render with escaped input; sender address comes from one config value.  
  _Test:_ npm test --silent && npx tsc --noEmit; tests render order + shipping templates with hostile input escaped and assert the from-address comes from config.
- [x] **51. BF: docs/LAUNCH_RUNBOOK.md smoke test** _(after 2)_  
  Step-by-step launch smoke test, marking every step that moves real money.  
  _Test:_ docs/LAUNCH_RUNBOOK.md exists; every Stripe live charge/refund and live Printify step carries the marker (grep check); links resolve to existing files.
