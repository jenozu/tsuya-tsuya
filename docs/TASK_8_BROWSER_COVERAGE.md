# Task 8 — broader isolated browser coverage

Playwright runs the real local Next.js application, but the test web-server configuration explicitly strips inherited production database, storage, payment, and email credentials. It uses a dedicated synthetic admin password/signing secret (not suitable for deployment). No real provider transactions are performed.

`e2e/storefront-admin.spec.ts` adds browser-level coverage for:
- Anonymous admin redirect; invalid password rejection; browser login/logout using an intercepted synthetic auth route and a correctly signed cookie consumed by real server middleware.
- Product create UI invalid form prompts before a network mutation, validated outgoing product data for a single print-size price, and visible recovery when an intercepted save fails.
- Empty admin orders and settings navigation.
- Empty storefront search and navigation.
- 375px mobile storefront navigation and horizontal overflow.
- Waitlist failure and success rendered in the browser against intercepted synthetic provider responses.

The admin authentication API handler itself is covered by isolated Node route tests from prior tasks. Browser tests intentionally mock that endpoint because the local development host may be canonicalized differently by Next.js's server-side Origin guard; this does not establish browser-to-real-route login success.\n\nThe existing `e2e/cart-checkout.spec.ts` continues to cover variant/cart persistence, multiple tabs, malformed cached data, mobile checkout repricing and rejected synthetic Checkout Sessions.

Run `npm ci && npx playwright install --with-deps chromium && npm run test:e2e` on a clean isolated dev workstation or use PR CI. CI retains screenshots, traces and the HTML report on failure. Synthetic test environment values must never replace deployment credentials.

This expands but does **not** finish master-plan TSU-M18-005. Populated server-rendered product listings, persisted admin create/edit/delete, image uploads against disposable object storage, actual order-processing UI, outbound email test doubles connected to order state, Safari/Firefox and a real production release smoke-test remain separately unverified. Tests that intercept API operations do not certify the underlying API/provider; related tasks remain unchecked.
