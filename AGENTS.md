# Instructions for AI coding assistants (Claude Code, Cursor, Codex, Copilot...)

TsuyaNoUchi: existing custom Next.js print store (made-to-order Japanese-inspired art prints via Printify) for shoppers and one store owner; launch is not complete.

This repo is built task by task from a written plan. Follow this loop exactly; it exists to stop the project
drifting away from the plan.

## Where the plan lives
- `.taskmaster/docs/prd.md`: goal, non-goals, success criteria, stack, decision log. Read Goal and Non-goals every session.
- `.taskmaster/tasks/tasks.json`: phases, tasks, subtasks, status, dependencies, test strategy, work log. Source of truth.
- `.taskmaster/docs/parking-lot.md`: ideas that are NOT in the plan.
- `.taskmaster/docs/manual-checks.md`: checks waiting for a human or an agent with a running app.
- `TASKS.md`: generated from tasks.json. Never edit by hand.

Helper (Python stdlib only), from the repo root:
```
python .taskmaster/tasks.py status | phase [n] | next [--phase n] | show <id>
python .taskmaster/tasks.py set-status <id> in-progress|done|deferred|cancelled
python .taskmaster/tasks.py log <id> "plan: ..."     # timestamped note on a task
python .taskmaster/tasks.py add --help               # add a task or subtask
python .taskmaster/tasks.py validate                 # after any manual edit of tasks.json
python .taskmaster/render_tasks_md.py                # refresh TASKS.md
```

## Work loop (one task at a time)
1. `tasks.py next`, then `tasks.py show <id>`. Complexity 7+ without subtasks: split it into 3-5 subtasks first.
2. Read the code the task touches. Log your plan: `tasks.py log <id> "plan: files X, Y; approach ..."`.
3. `tasks.py set-status <id> in-progress`, build it, log what worked and what failed.
4. Run the task's testStrategy for real. Not done until it passes.
5. Drift check, `set-status <id> done`, `render_tasks_md.py`, commit with the id: `task 7.2: <title>`.

## Drift rules
- Only work on the task `next` returned. New ideas → dated line in `parking-lot.md`.
- Changing what's being built → PRD decision log first, then tasks, then code.
- Never reword a `done` task; add a corrective subtask. Cancel tasks, never delete them.

## Project
- Stack: Next.js 16 App Router + React 19 + TypeScript + Tailwind 4 + Zod (app/, components/, lib/), Neon Postgres (migrations/, scripts/migrate.mjs), Cloudflare R2 images, Stripe Checkout (USD only), Resend email, Gemini copy helper, Vercel hosting (tsuyanouchi.com); npm + package-lock.json
- Install: `npm ci`
- Test: `npm test --silent && npx tsc --noEmit`
- Lint: `npm run lint --silent`
- Build: `npm run build (runs verify:infra first, then next build)`
- Dev servers: defined in `.claude/dev-servers.json`; run with `python .claude/scripts/devserver.py start all`.

## Facts that are easy to get wrong
- Existing live-site repo, not greenfield: `master_plan.md` (M1-M21, ids like TSU-M11-002) is the canonical roadmap and `AUTONOMOUS_EXECUTION_PLAN.md` holds the working rules. tasks.json only groups and points at those ids; never copy roadmap text, never merge or overwrite those docs. Tick a roadmap box only with evidence for every acceptance criterion.
- Hard stops (execution plan + PRD): no live charges or refunds, no production object deletes, no live Printify orders, no `vercel --prod`/rollback/promote, no `vercel env pull`. Never print secret values or customer data (addresses, emails, payment metadata, provider errors).
- Owner-only decisions (PRD section 9): pricing, tax, destinations/duties, refund/legal/privacy text, licensing, assortment, business identity, notification recipients, live-mode go-live. Build mechanics, leave the decision as a `human` task or a `TBD`.
- Payments: Stripe only, USD only, Adaptive Pricing off (disabled in app/api/checkout/create-session/route.ts). Shopify is not used. Price, shipping, tax and availability are server-derived; the browser is never trusted.
- Availability is per size and private. Never show stock counts, 'only N left' or invented SKUs. Products are made to order via Printify.
- Printify (R15): order submission is built behind `PRINTIFY_ORDERS_ENABLED` (off by default); status sync, tracking and availability sync are not built. Credentials are server-only env vars (never NEXT_PUBLIC_*); orders are submitted only after a signature-verified Stripe webhook confirms payment, idempotently, never from the browser. Read Printify's official API docs before coding; don't guess endpoints.
- Migrations are forward-only JSON in migrations/forward/ via scripts/migrate.mjs; never replay SQL history. 003 (payment events + email deliveries) is staged and NOT applied to production. Before any migration or other change to production Neon: create a restore-point branch from production (`neon branches create --project-id holy-wave-33455099 --parent production --name restore-<yyyymmdd-hhmm>-<reason>`), log its name with `tasks.py log <id>`, then proceed (owner rule 2026-11-13).
- The build runs `npm run verify:infra`, which fails if references to the retired backend/storage provider reappear. Don't weaken it or the CI guard.
- Git: main is production (Vercel). Work on a topic branch and open PRs; never commit to or push main, never force push. Existing docs (README, SETUP, MASTER_LIST historical, docs/*) belong to the owner: edit by merging, never overwrite.
- Local dev needs private env vars (names in ENV_TEMPLATE.md). Agents can't read .env and shouldn't need to: unit tests and `npm run build` use no secrets. Integration tests need an isolated Neon database the owner supplies.
- Windows + Git Bash dev machine; Node 22 (CI), npm 11. `npm test` runs tests/*.test.mjs; `*.integration.mjs` and e2e run via `npm run test:disposable-db` and `npm run test:e2e`.
