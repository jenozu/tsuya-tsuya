# Human checklist

Things only you can do. The agents queue them here and keep working instead of waiting for you.
Tick a box when it's done (`- [x]`). Each item: task id, exact steps, where to run them, what to send back (if anything).

## To do

- [ ] **Task 17: Printify account, credentials and availability decision**: (1) Decide: automatic Printify availability sync or manual toggle (owner decision 6). (2) Create a Printify API token, note the shop id. (3) Add PRINTIFY_API_TOKEN, PRINTIFY_SHOP_ID, PRINTIFY_WEBHOOK_SECRET to Vercel PREVIEW and local private env as server-only variables; never paste values in chat. (4) Confirm each product/size has a Printify variant. Send back: the decision and that the variable NAMES exist.
- [ ] **Task 22: One controlled real Printify order and cancellation**: After 20 and 21 are merged: Stripe TEST checkout on preview with a Printify test/draft product; confirm the order appears in Printify, cancel it there; confirm tracking sync with a real or simulated webhook. Send back sanitized evidence for docs/PENDING_LIVE_VERIFICATION.md.
- [ ] Turn on branch protection for the default branch (require a PR, require checks if there is CI, no force pushes)

## Done
- [ ] **Task 15: Stripe test-mode sandbox cases and webhook round-trip**: On a Vercel PREVIEW with Stripe TEST keys only: apply migrations 003 and 006 to the TEST/disposable Neon DB only (restore-point branch first for anything production); run paid, failed, canceled, duplicate submit, changed price, invalid destination; confirm each orders row, order_line_items rows, payment-event and email-delivery rows, and the Resend email to a safe test recipient; run `npm run test:disposable-db`. Send back sanitized evidence lines (dates, redacted IDs) for docs/PENDING_LIVE_VERIFICATION.md.
