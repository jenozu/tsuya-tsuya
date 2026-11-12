import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// Placeholder policy pages: must stay noindex and keep the owner placeholder until approved.
for (const page of ['returns', 'privacy', 'terms']) {
  test(`policy page ${page}: noindex metadata and owner placeholder`, () => {
    const source = readFileSync(new URL(`../app/${page}/page.tsx`, import.meta.url), 'utf8')
    assert.match(source, /export const metadata: Metadata/)
    assert.match(source, /robots: \{ index: false, follow: false \}/)
    assert.match(source, /\[OWNER TO SUPPLY\]/)
  })
}
