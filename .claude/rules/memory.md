# TsuyaNoUchi memory (short-term project state)

<!-- Rules files without a `paths:` header load at the start of every Claude Code session, so nothing needs to
     import this. HTML comments like this one are stripped before loading and cost no context. -->

**Why this file exists:** so a new session knows where things stand without re-reading the PRD, task logs or
old chats. Open `.taskmaster/` only for the task you're working on.

**Who edits it:** the phase-runner, **once at the end of each run**, in its own commit. The lead also edits it
after resolving an escalation or when the human gives a fact worth keeping. Everyone else only reads it.
Never update it per task.

**Size rules (the point of the file):**
- Max ~80 lines. Each section has a cap; when it's full, delete the least useful line before adding one.
- Replace, don't append: "Now" is overwritten every time; outdated lines are deleted, not struck through.
- Only add to "Learned" what would save a future session 5+ minutes or prevent a repeat failure.
- Details belong in `tasks.py log <id>`; this file holds one-line pointers ("see 7.3 log").

---

## Now (overwrite each time, max 6 lines)
- 2026-11-13 phase 1 run: tasks 5-9, 46, 52-55 done on branch chore/plan-approval-and-rules (unpushed). Only task 56 left (zod high advisory + resend major) - held for go-ahead.
- Manual checks waiting (eyes-on): 5.2 cutover, 6, 8 branch protection, 55 CSP console, 53 CI browser-e2e on ubuntu-latest. Migration 005 NOT applied to prod.
- Waiting on owner: placeholder pages (task 43); destinations (41); Printify decisions (17); tax (42).
- Local-only e2e fails on Windows after admin synthetic login (specs :46, :91); confirm in CI.
- Next: decide task 56, then /run-phase 2

## Facts (stable, max 15 lines)
- Dev machine: Windows 11 + Git Bash, Node 22, npm 11, Python 3.12.
- Production: Vercel project tsuya-tsuya; tsuyanouchi.com + www; main = production, PRs get previews.
- Roadmap state at bootstrap: master_plan.md 67 done / 74 open (from Sept 2026 audits, not re-verified: task 2).
- Payments: Stripe only, USD only, Adaptive Pricing off. Printify submission code exists (lib/printify*.ts), flag PRINTIFY_ORDERS_ENABLED default off.
- Harness commits go on a topic branch, never main; the owner merges PRs.

## Decisions since the PRD (max 8 lines, newest first; full text in the PRD decision log)
- 2026-11-13: Before any migration/change to production Neon, create + log a restore-point branch. Remaining stops: vercel env, push to main, stripe, gh pr merge (+ AGENTS.md hard stops); migrate.mjs and neon allowed in settings.
- 2026-11-13: PRD approved (task 3); destinations deferred.
- 2026-11-11: Lean Black Friday launch: phase 8 (47-51) + R15 16/18/19 (flag off) + 46 run first.
- 2026-11-10: Built with master-harness v1.3.1: lead (Opus) → phase-runner (Sonnet) → builders
  haiku → sonnet → opus. Manual checks batched per phase.

## Learned / gotchas (max 15 lines, newest first)
- Builders mix CRLF/LF; run `sed -i 's/$//'` on touched files before verify or `git diff --check` fails.
- Integration tests need `--experimental-loader ./tests/fixtures/admin-route-loader.mjs`.
- `next dev` (e2e webServer) appends a Next.js agent-rules block to AGENTS.md; revert it, never commit it.
- Infra Guard runs on PRs only; candidate-build = critical npm audit, then git diff --check + format:check on changed files.
- Repo has CRLF checkouts (autocrlf): tests using 
 string replaces must normalise line endings.
- Running `npm run build` rewrites next-env.d.ts; `git checkout next-env.d.ts` after.

## Model routing record (update counts at each close-out)
| Tier | Done first try | Escalated up | Notes |
|---|---|---|---|
| haiku | 3 | 0 | |
| sonnet | 11 | 0 | tasks 5-9,53-55 etc |
| opus | 1 | 0 | task 19 |
<!-- If one tier escalates on 3 tasks in a row, the phase-runner escalates to the lead, who may raise that tier's
     starting complexity in .claude/skills/next-task/SKILL.md. If haiku passes everything, give it complexity 4 too. -->

## Open questions for the human (max 5; delete once answered)
- Launch destinations: owner deferred (task 41).
- Printify availability: automatic sync or manual toggle? (owner decision 6, task 17)
- Do M14-004/M14-005/M3-005/M6-006 (pick/pack, stock reconciliation, inventory) still apply to made-to-order? (task 27)
- Error-monitoring provider for M20-002? (task 36)
