---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Node + TypeScript rules

- `strict` TypeScript. No `any` in new code; use `unknown` and narrow. No `// @ts-ignore` without a comment why.
- Validate external input at the boundary (zod or the project's chosen validator), then trust the types inside.
- Use the package manager the repo already uses (lockfile tells you: npm, pnpm, yarn, bun). Never mix them.
- Async: always await or return promises; no floating promises. Handle errors where you can act on them.
- Config from environment variables, read and validated per integration module (see `lib/email-config.ts`);
  never `NEXT_PUBLIC_*` for secrets.
- Tests use `node:test` (`tests/*.test.mjs`, run via `npm test`, no extra test deps). Run `npx tsc --noEmit` and the
  tests before reporting done.
