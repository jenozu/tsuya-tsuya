#!/usr/bin/env node
/**
 * Non-mutating release audit: explicitly compare reviewed Git SHA with public
 * Vercel responses. Never triggers payment, modifies a deployment, or reads
 * private provider tokens.
 *
 * Example:
 * npm run verify:release -- --sha <reviewed-main-sha> \
 *   --origin https://tsuyanouchi.com --secondary https://www.tsuyanouchi.com
 */
import { verifyRelease } from '../lib/release-verification.mjs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

async function main(args) {
  const options = {}
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]
    if (!['--sha','--origin','--secondary','--no-home','--require-hsts'].includes(name)) {
      throw new Error('Unrecognized release verification option')
    }
    if (options[name] !== undefined) throw new Error('Duplicate release verification option')
    if (name === '--no-home' || name === '--require-hsts') {
      options[name] = true
      index -= 1
    } else {
      if (!args[index + 1]?.length || args[index + 1].startsWith('--')) {
        throw new Error('Release verification option is missing a value')
      }
      options[name] = args[index + 1]
    }
  }
  if (!options['--sha'] || !options['--origin']) {
    throw new Error('Required: --sha <40-char-reviewed-main-SHA> --origin <HTTPS-origin>')
  }
  const result = await verifyRelease({
    expectedSha: options['--sha'],
    origins: [options['--origin'], ...(options['--secondary'] ? [options['--secondary']] : [])],
    checkHome: !options['--no-home'],
    requireHsts: Boolean(options['--require-hsts']),
  })
  console.log('Read-only release verification passed.')
  console.log('Deployed commit:', result.sha)
  console.log('Verified hostnames:', result.checked.join(', '))
  console.log(result.homepageChecked
    ? 'Homepage: HTTP 200 HTML (may still be under construction).'
    : 'Homepage: not checked.')
  console.log('Stripe, database, email and privileged admin actions were NOT tested.')
}

// Imported tests do not make network calls or execute the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    // Explicit operator-provided URLs, provider diagnostics and auth values
    // never appear in CI logs. Internal validators use fixed error messages.
    console.error(error.message)
    process.exitCode = 1
  })
}
