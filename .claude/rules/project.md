# Project rules (TsuyaNoUchi). These override rules.md and the deliver skill where they conflict.

## Neon restore point (owner rule, 2026-11-13)
Before any migration or other change to a production Neon branch, create a Neon branch from production as a
restore point (`neon branches create --project-id holy-wave-33455099 --parent production --name
restore-<yyyymmdd-hhmm>-<reason>`), then log its name with `tasks.py log <id>`. Never print connection strings.

## Delivery (owner rule: the owner merges PRs)
- Never push to or merge into main; `gh pr merge` (including `--auto`) is a hard stop. Don't auto-merge.
- Push the topic branch and open a PR only when the human says so; otherwise commit and report.
- The `deliver` skill's merge step does not apply here: stop after the PR is open and CI status is reported.
