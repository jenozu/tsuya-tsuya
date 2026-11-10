---
name: security-review
description: Focused security pass over the whole app before shipping or after auth, permission or data-handling changes. Produces findings as fix tasks. Use when the human asks for a security review, before the first deploy, or when a phase touched auth.
disable-model-invocation: true
---

# Security review

Dispatch the **reviewer** agent per area below (one area per dispatch, to keep each context small). For each,
it reads the relevant code and reports findings with file:line, a concrete exploit or failure, and the fix.

1. **Secrets:** `git grep -n -I -E "(api[_-]?key|secret|password|token)\s*[:=]" -- ':!package-lock.json'`; committed
   `.env` files (`git ls-files | grep -i env`); secrets in logs, errors or `NEXT_PUBLIC_*`.
2. **Admin auth:** every `app/api/admin/**` and mutating product/order route checks the signed session and
   same-origin; login throttling, session expiry and revocation (M7-004).
3. **Checkout and webhooks:** server-derived amounts, redirects limited to approved origins, Stripe signature
   verified before any work, idempotent event handling, no PII in logs or errors.
4. **Input:** SQL injection (parameterised only), HTML escaping in email, file upload limits and signatures,
   remote image host allowlist, path traversal.
5. **Web:** security headers (`lib/security-headers.ts`), cookie flags, CSRF/origin checks, preview access.
6. **Dependencies:** `npm audit --omit=dev`; note high/critical only.

Each finding → `python .taskmaster/tasks.py add --title "Security: <issue>" --review --complexity <n>
--details "<file:line, exploit, fix>" --test "<how to prove it's fixed>"`. Report counts by severity in 5 lines.
