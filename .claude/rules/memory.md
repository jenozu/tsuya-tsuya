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
- HANDOFF 2026-11-13. Nothing merged. Merge order: PR #58 (task 52: next 16.4.6 critical advisories + TASKS.md renderer/LF fix) first, then rebase PR #57 (branch chore/plan-approval-and-rules: task 3 PRD approval, task 4 reopen, restore-point rule, doc alignment) onto main; expect tasks.json/TASKS.md/memory.md conflicts.
- Task 3 done (on #57). Task 4 REOPENED: owner must confirm test DB. Task 52 in progress (closes when #58 merges green).
- Test DB: Neon branch test-integration (project holy-wave-33455099) is schema-only (init_source=parent-schema, 0 rows); empty db+role tsuya_test on endpoint ep-wild-surf-a5u3fu6y (prod is ep-cold-dawn-a53nmatg); TEST_DATABASE_URL in Windows user env; 002/003/004 applied there only.
- Owner open items: hide or keep live placeholder pages /returns /terms /privacy (noindexed, in prod since #56); destinations (task 41); task 4 confirm. Deferred: zod major upgrade (high advisory); pre-existing e2e failure (admin synthetic login stays on /admin/login, same on next 16.3.6).
- Next command for owner after /clear: merge #58 when green, then ask the lead "rebase PR #57 onto main", then /run-phase 1.

## Facts (stable, max 15 lines)
- Dev machine: Windows 11 + Git Bash, Node 22, npm 11, Python 3.12.
- Production: Vercel project tsuya-tsuya; tsuyanouchi.com + www; main = production, PRs get previews.
- Roadmap state at bootstrap: master_plan.md 67 done / 74 open (from Sept 2026 audits, not re-verified: task 2).
- Payments: Stripe only, USD only, Adaptive Pricing off. Printify submission code exists (lib/printify*.ts), flag PRINTIFY_ORDERS_ENABLED default off.
- Harness commits go on a topic branch, never main; the owner merges PRs.

## Decisions since the PRD (max 8 lines, newest first; full text in the PRD decision log)
- 2026-11-13: Before any migration/change to production Neon, create + log a restore-point branch. Remaining stops: vercel env, push to main, stripe, gh pr merge (+ AGENTS.md hard stops). On #57.
- 2026-11-11: Lean Black Friday launch: phase 8 (47-51) + R15 16/18/19 (flag off) + 46 run first.
- 2026-11-10: Built with master-harness v1.3.1: lead (Opus) → phase-runner (Sonnet) → builders
  haiku → sonnet → opus. Manual checks batched per phase.

## Learned / gotchas (max 15 lines, newest first)
- `next dev` (e2e webServer) appends a Next.js agent-rules block to AGENTS.md; revert it, never commit it.
- Infra Guard runs on PRs only; candidate-build = critical npm audit, then git diff --check + format:check on changed files.
- Repo has CRLF checkouts (autocrlf): tests using 
 string replaces must normalise line endings.
- Running `npm run build` rewrites next-env.d.ts; `git checkout next-env.d.ts` after.

## Model routing record (update counts at each close-out)
| Tier | Done first try | Escalated up | Notes |
|---|---|---|---|
| haiku | 3 | 0 | |
| sonnet | 3 | 0 | |
| opus | 1 | 0 | task 19 |
<!-- If one tier escalates on 3 tasks in a row, the phase-runner escalates to the lead, who may raise that tier's
     starting complexity in .claude/skills/next-task/SKILL.md. If haiku passes everything, give it complexity 4 too. -->

## Open questions for the human (max 5; delete once answered)
- PRD is DRAFT: owner approval pending (task 3).
- Printify availability: automatic sync or manual toggle? (owner decision 6, task 17)
- Do M14-004/M14-005/M3-005/M6-006 (pick/pack, stock reconciliation, inventory) still apply to made-to-order? (task 27)
- Error-monitoring provider for M20-002? (task 36)
- Is a disposable Neon branch available for integration tests? (task 4)
