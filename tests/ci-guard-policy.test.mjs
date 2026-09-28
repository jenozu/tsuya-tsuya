import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import {
  ciWorkflowViolations,
  securitySourceViolations,
  knownConfigurationWarnings,
} from '../lib/ci-guard-policy.mjs'

const source = file => fs.readFileSync(file, 'utf8')
const workflow = source('.github/workflows/infra-guard.yml')
const withChangedFile = (name, change) =>
  file => file === name ? change(source(file)) : source(file)

test('actual workflow runs required gated checks with read-only permissions and retained logs', () => {
  assert.deepEqual(ciWorkflowViolations(workflow), [])
})

test('workflow self-check fails when a security or integration test step is deleted', () => {
  assert.ok(ciWorkflowViolations(workflow.replace('npm run verify:security', 'echo bypass-security'))
    .some(problem => problem.includes('Security guard')))
  assert.ok(ciWorkflowViolations(workflow.replace('tests/api-error-privacy.integration.mjs', 'tests/placeholder.mjs'))
    .some(problem => problem.includes('API privacy')))
  assert.ok(ciWorkflowViolations(workflow.replace('npm run format:check', 'echo formatting-disabled'))
    .some(problem => problem.includes('content and JSON')))
})

test('mandatory critical audit cannot silently be converted to an advisory step', () => {
  const unsafe = workflow.replace(
    'name: Block critical production dependency advisories\n',
    'name: Block critical production dependency advisories\n        continue-on-error: true\n',
  )
  assert.ok(ciWorkflowViolations(unsafe).some(problem => problem.includes('Critical dependency')))
})

test('workflow requires least privilege, candidate timeout and retained diagnostics', () => {
  const noPermissions = workflow.replace('permissions:\n  contents: read\n\n', '')
  assert.ok(ciWorkflowViolations(noPermissions).some(problem => problem.includes('read-only')))
  const write = workflow.replace('  contents: read\n', '  contents: write\n')
  assert.ok(ciWorkflowViolations(write).some(problem => problem.includes('write-scoped')))
  const noArtifact = workflow.replace('name: Retain candidate verification logs even on failure', 'name: Removed')
  // The candidate itself must retain artifacts; baseline artifacts alone cannot qualify.
  assert.ok(ciWorkflowViolations(noArtifact).some(problem => problem.includes('Candidate must retain')))
})

test('actual source tree retains approved security invariants without production connections', () => {
  assert.deepEqual(securitySourceViolations(source), [])
})

test('security self-check fails on reintroduced client-amount payments or missing origin guard', () => {
  assert.ok(securitySourceViolations(withChangedFile(
    'app/api/payments/create-intent/route.ts',
    text => text.replace('status: 410', 'status: 200'),
  )).some(problem => problem.includes('create-intent')))
  assert.ok(securitySourceViolations(withChangedFile(
    'app/api/orders/route.ts',
    text => text.replace('isSameOriginMutation(request)', 'true'),
  )).some(problem => problem.includes('same-origin')))
})

test('security self-check catches unsafe Next/image rules and raw exception logging', () => {
  assert.ok(securitySourceViolations(withChangedFile(
    'next.config.ts',
    text => text.replace('  images:', '  typescript: { ignoreBuildErrors: true },\n  images:'),
  )).some(problem => problem.includes('TypeScript')))
  assert.ok(securitySourceViolations(withChangedFile(
    'lib/safe-server-log.ts',
    text => text.replace('ALLOWED_SERVER_EVENTS.has(event)', "event.startsWith('api.')"),
  )).some(problem => problem.includes('approved event')))
  assert.ok(securitySourceViolations(withChangedFile(
    'app/api/webhooks/stripe/route.ts',
    text => text + '\nconsole.error(customerAddress)\n',
  )).some(problem => problem.includes('unstructured')))
  assert.ok(securitySourceViolations(withChangedFile(
    'app/api/orders/route.ts',
    text => text + '\nfunction leak(error) { return { error: error.message } }\n',
  )).some(problem => problem.includes('exception details')))
})

test('known production secret fallback is reported, not removed before owner verification', () => {
  const warnings = knownConfigurationWarnings(source)
  const hasExistingFallback = source('lib/admin-session.ts').includes(
    'process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD',
  )
  assert.equal(warnings.length > 0, hasExistingFallback)
  if (hasExistingFallback) assert.ok(warnings[0].includes('TSU-M7-004'))
  const mockFixed = withChangedFile(
    'lib/admin-session.ts',
    text => text.replace(
      'process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD',
      'process.env.ADMIN_SESSION_SECRET',
    ),
  )
  assert.deepEqual(knownConfigurationWarnings(mockFixed), [])
})
