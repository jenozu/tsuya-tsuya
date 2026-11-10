---
paths:
  - "app/**"
  - "components/**"
  - "next.config.*"
---

# Next.js rules

- App Router conventions: server components by default; add `"use client"` only where state, effects or browser
  APIs are needed, as low in the tree as possible.
- Data fetching and secrets stay on the server (server components, route handlers, server actions). Never import
  server-only modules or env vars without `NEXT_PUBLIC_` into client components.
- Validate every server action and route handler input; check auth inside each one, not only in middleware.
- Use `next/image` and `next/link`. Set metadata per route.
- Before reporting done: `npm run lint`, `npx tsc --noEmit`, `npm test` and `npm run build` (runs `verify:infra`
  first; Next 16 `build` does not lint) must pass.
