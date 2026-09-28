#!/usr/bin/env node
import fs from 'node:fs'
import { ciWorkflowViolations } from '../lib/ci-guard-policy.mjs'

const workflow = fs.readFileSync('.github/workflows/infra-guard.yml', 'utf8')
const problems = ciWorkflowViolations(workflow)
if (problems.length) {
  console.error('CI workflow policy failed:')
  for (const item of problems) console.error('- ' + item)
  process.exitCode = 1
} else {
  console.log('CI workflow policy passed')
}
