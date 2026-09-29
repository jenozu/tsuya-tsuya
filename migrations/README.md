# Database migration system

**Canonical baseline:** `migrations/002_neon_r2_schema.sql` defines the present Neon/R2 schema. Historical `001_add_product_type_and_update_sizes.sql` predates that consolidated baseline; **never replay 001 after 002**. Existing production data must not be reseeded by baseline replay.

**New forward-only migration format:** add a reviewed JSON file `migrations/forward/003_descriptive_name.json`, then `004_...`, with contents such as:
```json
{
  "id": "003_example",
  "statements": ["ALTER TABLE products ADD COLUMN IF NOT EXISTS example TEXT"]
}
```
Replace the example with a genuine, approved additive change. Each `statements` array element is **one complete PostgreSQL statement**; avoid embedding multiple statements in an element. The runner computes SHA-256 over the entire file; never edit/rename/reorder a previously recorded file or the frozen legacy baseline. Write a new forward migration for corrections.

The runner records `version`, SHA-256 `checksum`, and `applied_at` in `public.schema_migrations`, rejecting missing/altered history and gaps. Migrations apply in lexical numeric-prefix order. The ledger insert and migration statements run in a single Neon HTTP transaction; unique version insertion is first, so concurrent repeat runners fail/roll back rather than running the change twice.

## Safe commands

```sh
npm run migrations:check                   # offline static manifest/hash verification
DATABASE_URL=<private test URL> node scripts/migrate.mjs --status
DATABASE_URL=<private isolated empty URL> node scripts/migrate.mjs --init-empty --confirm-reviewed-backup
DATABASE_URL=<private existing URL> node scripts/migrate.mjs --adopt-baseline --confirm-reviewed-backup
DATABASE_URL=<private reviewed URL> node scripts/migrate.mjs --apply --confirm-reviewed-backup
```
Supply `DATABASE_URL` through a **private environment/secret manager**, not committed scripts or CI logs. Where `VERCEL_ENV=production`, every mutation additionally requires `--confirm-production-change`. This flag is a deliberate operator acknowledgement, **not** proof of a backup or a substitute for owner approval.

**Empty isolated DB:** `--init-empty` refuses if any baseline table exists. It applies the existing 002 SQL and records its checksum in one transaction, preserving the seed's original rate rows. Those seed rates may differ from live application policy and are **not approved shipping fees**.

**Existing DB:** `--adopt-baseline` is an explicit one-time operator action. It checks that all five required base tables expose key columns, then writes the ledger **without running baseline SQL**. This is a minimum compatibility check, **not** proof that indexes, types, constraints or live data match the canonical schema. Independently compare full schema, confirm a recent backup and restore in an isolated DB, obtain appropriate production approval, and retain private evidence before adoption.

**Forward migrations:** after baseline adoption, `--status` reports applied IDs and new unapplied JSON migrations. `--apply` refuses uninitialized databases, verifies every applied file's checksum, then applies remaining transactions in order. Prefer additive/expand-contract migrations so older deployments and delayed webhook workers remain compatible. If a statement fails, its entire migration transaction (including ledger insert) rolls back. If an operation fails, inspect private Neon logs without pasting connection URLs or row data in PR comments.

**Rollback:** There is deliberately **no automatic down-migration**; deploy-compatible schema changes should be restored forward after review. Snapshot restoration, production schema adoption, realistic upgrade/no-loss tests and provider backup verification remain independently unchecked tasks (M3-004/M20-003). Neither a successful offline manifest check nor code review constitutes a verified production migration.

## Task 11: staged payment-event and email-delivery foundation

`forward/003_payment_delivery_foundation.json` is **additive and NOT applied by a GitHub merge, build or deployment**. It creates:
- `stripe_payment_events` keyed on the verified Stripe `event_id`, with event/session/payment references, bounded state, attempt count, recovery lease and timestamps.
- `order_email_deliveries` keyed on `(order_id, recipient_kind)` with state, attempts, lease and optional provider result identifier. It references an existing order by its unique business key.

This schema enables future *transactional* event claims and retry-safe email processing. It is not used by the current webhook route until disposable database/upgrade and outbox delivery tests have passed. **Never** mistake these table definitions for already-active deduplication, recovery queues or exactly-once emails. Existing orders are unchanged by the migration; no uniqueness constraint is added on pre-existing `orders.payment_intent_id` until actual existing data is checked for conflicts.

The operator-only `scripts/test-disposable-neon.mjs` now bootstraps the canonical baseline in a new explicitly acknowledged empty disposable database, applies new forward migrations, checks the schema ledger and tests concurrent event/email claim statements, uniqueness, product CRUD and order constraints. It has **not** been run by CI: no `TEST_DATABASE_URL` is provided there. Run it only following `docs/TASK_7_ISOLATED_INTEGRATION.md` on a genuinely disposable branch, then perform a separate non-destructive production-like upgrade test and backup restore verification before any production apply. The script leaves the disposable schema intact but cleans synthetic test rows.
