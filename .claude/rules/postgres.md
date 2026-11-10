---
paths:
  - "**/*.sql"
  - "**/migrations/**"
---

# Postgres rules

- Schema changes only as a new `migrations/forward/NNN_name.json` run by `scripts/migrate.mjs` (`db-migration`
  skill). Never edit an applied or checksummed migration; never replay `migrations/00*.sql`.
- Tests use an isolated Neon database the owner supplies (`npm run test:disposable-db`). Connection strings come
  from env vars; never run mutations against the production database.
- Add indexes for columns used in WHERE/JOIN/ORDER BY on tables that will grow; check with `EXPLAIN ANALYZE` when a
  query matters.
- Bound parameters only. No string-built SQL from user input.
- Destructive statements (`DROP`, `TRUNCATE`, `DELETE` without WHERE) only against local dev/test databases.
- Timestamps as `timestamptz`; money as integer cents or `numeric`, never float.
