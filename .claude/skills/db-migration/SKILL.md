---
name: db-migration
description: Create, review and test a Neon Postgres schema change in this repo (forward JSON migrations run by scripts/migrate.mjs). Use whenever a task adds or changes a table, column or index.
---

# Database migration procedure (forward-only, additive)

1. Read `migrations/README.md`. Baseline is `migrations/002_neon_r2_schema.sql`; new changes are
   `migrations/forward/NNN_name.json` (`{"id": "...", "statements": ["one complete statement", ...]}`), numbered
   with no gaps. There is no down-migration: restore forward.
2. Additive only: new tables, nullable or defaulted columns, `IF NOT EXISTS`. No drops, renames or type changes
   without an owner-approved plan (`review: true` + a backup step in the task).
3. Money as integer cents or `numeric`, timestamps `timestamptz`, bound parameters only.
4. Update the code and types in the same change; keep old code paths working until the migration is applied in
   production (a merge or deploy never applies it).
5. Verify: `npm run migrations:check` (offline manifest and checksum), then `npm test`, then
   `npm run test:disposable-db` against an isolated database the owner supplied (blank bootstrap + upgrade).
6. Never run `--apply`, `--adopt-baseline` or any mutation against a production or unknown `DATABASE_URL`.
   Production application is a `human` task: write the exact commands and the backup requirement in the task.
7. Update `migrations/README.md` and the relevant `docs/TASK_*.md` instead of creating a parallel doc.
