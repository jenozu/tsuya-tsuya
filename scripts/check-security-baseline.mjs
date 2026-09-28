#!/usr/bin/env node
import fs from 'node:fs'
import {
  securitySourceViolations,
  knownConfigurationWarnings,
} from '../lib/ci-guard-policy.mjs'

const source = path => fs.readFileSync(path, 'utf8')
let problems
try {
  problems = securitySourceViolations(source)
} catch {
  console.error('Security policy could not inspect all required source files')
  process.exit(1)
}
if (problems.length) {
  console.error('Security regression guard failed:')
  for (const issue of problems) console.error('- ' + issue)
  process.exitCode = 1
} else {
  console.log('Security regression guard passed')
}
// A known pre-existing fallback requires a coordinated owner-side environment
// check before deletion. This warning is not evidence of verified configuration.
for (const warning of knownConfigurationWarnings(source)) {
  console.warn('Known release risk: ' + warning)
}
