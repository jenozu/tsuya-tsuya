# TsuyaNoUchi: Claude Code instructions

@AGENTS.md

## Roles: lead → phase-runner → builders
- **Builder, verifier or reviewer subagent:** follow your agent file; it overrides the AGENTS.md loop (you don't
  mark tasks done, commit or push). Ignore the rest of this section.
- **phase-runner subagent:** follow your agent file and the preloaded `next-task` procedure.
- **Main session = the lead** (run it on Opus). Run `/run-phase` and stay out of the details: don't read task
  logs, diffs or builder reports while a phase runs. Act only on the phase-runner's final report.

| Agent | Model | Role |
|---|---|---|
| phase-runner | sonnet, medium | Runs a whole phase: routes, verifies, escalates, commits, reports once |
| builder-haiku / -sonnet / -opus | haiku / sonnet / opus | Complexity 1-3 / 4-6 / 7+, or after the tier below failed |
| verifier | haiku, read-only | Runs each task's testStrategy independently |
| reviewer | sonnet, read-only | Tasks flagged `review`, or diffs touching Risky paths |

Escalation: haiku → sonnet → opus inside a task; phase-runner → lead when opus fails, scope changes, something is
destructive, or a human-only step comes up. Manual checks never stop a phase; they collect in
`.taskmaster/docs/manual-checks.md`. Nesting is capped by `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=2`.

## Phases
0 Foundation · 1 Hardening · 2 Order integrity · 3 Printify (R15) · 4 Fulfilment ops · 5 Experience quality · 6 Operations · 7 Launch gates (owner) (see `tasks.py phase`)

## Risky paths (reviewer required)
- app/api/** (checkout, webhooks/stripe, admin, products, orders)
- middleware.ts, lib/admin-session.ts, lib/preview-session.ts, lib/same-origin.ts, lib/security-headers.ts
- lib/checkout-*.ts, lib/stripe.ts, lib/tax*.ts, lib/shipping.ts, config/shipping-profile.json, MASTER_TAX_TABLE.md
- lib/r2.ts, lib/image-validation.ts, lib/trusted-image-patterns.ts, next.config.ts, vercel.json
- migrations/**, scripts/migrate.mjs
- .github/workflows/**, lib/ci-guard-policy.mjs, scripts/assert-current-infra.mjs

## Skills
Core: `/run-phase [n|ids]` · `/status` · `/manual-checks run|results` · `/adapt` · `/plan-from-prd add-phase` ·
`dev-servers` · `next-task` (phase-runner; `/next-task <id>` for one task by hand).
Project: `db-migration` · `security-review`

## Keeping cost down
- One phase per launch. The lead's context grows by one report per phase.
- `/clear` between phases: everything needed is in the files.
- memory.md is updated once per phase run; details live in `tasks.py log`.
- Pass task ids and failure notes in prompts, not file contents or task JSON.

<!-- master-harness v1.3.1 -->
