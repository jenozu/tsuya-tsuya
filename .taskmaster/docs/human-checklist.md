# Human checklist

Things only you can do. The agents queue them here and keep working instead of waiting for you.
Tick a box when it's done (`- [x]`). Each item: task id, exact steps, where to run them, what to send back (if anything).

## To do

- [ ] Turn on branch protection for the default branch (require a PR, require checks if there is CI, no force pushes)

## Done
- [ ] **Task 15: Stripe test-mode sandbox cases and webhook round-trip**: On a Vercel PREVIEW with Stripe TEST keys only: apply migrations 003 and 006 to the TEST/disposable Neon DB only (restore-point branch first for anything production); run paid, failed, canceled, duplicate submit, changed price, invalid destination; confirm each orders row, order_line_items rows, payment-event and email-delivery rows, and the Resend email to a safe test recipient; run `npm run test:disposable-db`. Send back sanitized evidence lines (dates, redacted IDs) for docs/PENDING_LIVE_VERIFICATION.md.
