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
- Plan created 2026-11-10; no phase run yet.
- Next: phase 0. Run `/run-phase 0`.
- In progress: none.
- Manual checks waiting: none.

## Facts (stable, max 15 lines)
- Dev machine: Windows 11 + Git Bash, Node 22, npm 11, Python 3.12.
- Production: Vercel project tsuya-tsuya; tsuyanouchi.com + www; main = production, PRs get previews.
- Roadmap state at bootstrap: master_plan.md 67 done / 74 open (from Sept 2026 audits, not re-verified: task 2).
- Payments: Stripe only, USD only, Adaptive Pricing off. Printify fulfilment code does not exist yet (R15).
- Harness commits go on a topic branch, never main; the owner merges PRs.

## Decisions since the PRD (max 8 lines, newest first; full text in the PRD decision log)
- 2026-11-10: Built with master-harness v1.3.1: lead (Opus) → phase-runner (Sonnet) → builders
  haiku → sonnet → opus. Manual checks batched per phase.

## Learned / gotchas (max 15 lines, newest first)
- (none yet)

## Model routing record (update counts at each close-out)
| Tier | Done first try | Escalated up | Notes |
|---|---|---|---|
| haiku | 0 | 0 | |
| sonnet | 0 | 0 | |
| opus | 0 | 0 | |
<!-- If one tier escalates on 3 tasks in a row, the phase-runner escalates to the lead, who may raise that tier's
     starting complexity in .claude/skills/next-task/SKILL.md. If haiku passes everything, give it complexity 4 too. -->

## Open questions for the human (max 5; delete once answered)
- PRD is DRAFT: owner approval pending (task 3).
- Printify availability: automatic sync or manual toggle? (owner decision 6, task 17)
- Do M14-004/M14-005/M3-005/M6-006 (pick/pack, stock reconciliation, inventory) still apply to made-to-order? (task 27)
- Error-monitoring provider for M20-002? (task 36)
- Is a disposable Neon branch available for integration tests? (task 4)
