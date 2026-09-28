/**
 * Dependency-free CI/source invariants. This complements functional tests; it
 * cannot prove runtime authorization or verify third-party service settings.
 * Keep the checks independent of database, Stripe, R2 and Vercel access.
 */

export function ciWorkflowViolations(workflow) {
  const errors = []
  const expect = (condition, issue) => { if (!condition) errors.push(issue) }
  const has = (snippet, message) => expect(workflow.includes(snippet), message)

  expect(/^on:\s*\n\s+pull_request:/m.test(workflow),
    'CI must execute on pull requests')
  expect(/^permissions:\s*\n\s+contents:\s*read/m.test(workflow),
    'CI needs explicit read-only default permissions')
  expect(/^concurrency:/m.test(workflow) && /cancel-in-progress:\s*true/.test(workflow),
    'Stale PR checks should be cancelled')
  expect(!/^\s+(?:contents|id-token):\s*write\b/m.test(workflow),
    'CI must not request write-scoped tokens')

  const baseline = workflow.split(/^  baseline-build:\s*$/m)[1]?.split(/^  candidate-build:\s*$/m)[0]
  const candidate = workflow.split(/^  candidate-build:\s*$/m)[1]
  expect(Boolean(baseline), 'Independent default-branch baseline job is missing')
  expect(Boolean(candidate), 'PR merge-candidate job is missing')
  if (baseline) {
    expect(/ref:\s*main/.test(baseline), 'Baseline must check out main')
    has('name: Retain verification logs even on failure', 'Baseline logs must be retained')
    expect(baseline.includes('npm ci') && baseline.includes('npm run build'),
      'Baseline must install locked dependencies and compile')
    expect(baseline.includes('if: always()'),
      'Baseline failure logs must be retained')
  }
  if (!candidate) return errors

  const requiredSteps = [
    ['npm ci', 'Locked dependency installation'],
    ['npm run ci:check', 'CI self-verification'],
    ['npm run verify:infra', 'Infrastructure guard'],
    ['git diff --check', 'Changed-file formatting'],
    ['npm run format:check', 'Changed-file content and JSON validation'],
    ['npm run verify:security', 'Security guard'],
    ['npm run lint', 'Lint'],
    ['npm run migrations:check', 'Offline migration plan'],
    ['npm test', 'Unit regression tests'],
    ['tests/route-authorization.integration.mjs', 'Authorized route tests'],
    ['tests/api-error-privacy.integration.mjs', 'API privacy tests'],
    ['tsc --noEmit', 'Independent typecheck'],
    ['npm run build', 'Production build'],
    ['npm audit --omit=dev --audit-level=high', 'Dependency advisory report'],
    ['npm audit --omit=dev --audit-level=critical', 'Required critical vulnerability gate'],
  ]
  for (const [needle, name] of requiredSteps) {
    expect(candidate.includes(needle), name + ' step is missing')
  }

  expect(/timeout-minutes:\s*\d+/.test(candidate), 'Candidate job needs a timeout')
  expect(candidate.includes('name: Retain candidate verification logs even on failure') &&
    candidate.includes('if: always()') &&
    candidate.includes('actions/upload-artifact@v4'),
    'Candidate must retain test/build/security logs even on failure')
  // Advisory failures may be non-blocking, but the critical-level gate must
  // remain mandatory. Do not silently turn off vulnerability enforcement.
  const criticalStep = candidate.split('name: Block critical production dependency advisories')[1]
    ?.split(/^      - name:/m)[0]
  expect(Boolean(criticalStep) && !/continue-on-error:\s*true/.test(criticalStep),
    'Critical dependency audit must remain mandatory')
  const securityStep = candidate.split('name: Gate critical security regressions')[1]
    ?.split(/^      - name:/m)[0]
  expect(Boolean(securityStep) && !/continue-on-error:\s*true/.test(securityStep),
    'Security guard must remain mandatory')
  return errors
}

export function securitySourceViolations(read) {
  const errors = []
  const expect = (ok, message) => { if (!ok) errors.push(message) }
  const source = path => read(path)

  const nextConfig = source('next.config.ts')
  expect(!/ignoreBuildErrors\s*:\s*true/.test(nextConfig),
    'Next TypeScript compilation must never be bypassed')
  expect(nextConfig.includes('trustedImagePatterns(process.env.R2_PUBLIC_URL)') &&
    !/hostname:\s*['"]\*\*['"]/.test(nextConfig),
    'Next must use the trusted R2 image host policy')

  const images = source('lib/trusted-image-patterns.ts')
  expect(images.includes("parsed.protocol !== 'https:'") &&
    images.includes("parsed.hostname.includes('*')"),
    'Remote images must remain restricted to exact HTTPS origins')

  const sameOrigin = source('lib/same-origin.ts')
  expect(sameOrigin.includes('origin.origin === url.origin') &&
    sameOrigin.includes("fetchSite === 'same-origin'"),
    'Cross-origin mutations must fail closed')

  for (const path of [
    'app/api/products/route.ts',
    'app/api/products/[id]/route.ts',
    'app/api/products/import/route.ts',
    'app/api/products/bulk-delete/route.ts',
    'app/api/admin/product-images/route.ts',
    'app/api/orders/route.ts',
  ]) {
    const route = source(path)
    expect(route.includes('isSameOriginMutation(request)') &&
      route.includes('hasAdminSession(request)'),
      path + ': admin/session and same-origin guards are mandatory')
  }
  for (const path of [
    'app/api/admin/auth/route.ts',
    'app/api/preview-access/route.ts',
    'app/api/checkout/create-session/route.ts',
    'app/api/waitlist/route.ts',
  ]) {
    expect(source(path).includes('isSameOriginMutation(request)'),
      path + ': same-origin validation is mandatory')
  }

  const checkout = source('app/api/checkout/create-session/route.ts')
  expect(checkout.includes('priceCheckoutBasket(items, getProduct)'),
    'Stripe checkout must be repriced from database inventory')
  expect(checkout.includes('trustedCheckoutReturnUrls(orderId,'),
    'Stripe redirect destinations must be server-authoritative')
  expect(!/\b(?:successUrl|cancelUrl)\s*(?:,|\}|=)/.test(checkout),
    'Checkout must not accept caller-supplied success/cancel destinations')

  const webhook = source('app/api/webhooks/stripe/route.ts')
  expect(webhook.includes('verifyWebhookSignature(body, signature)'),
    'Stripe webhooks require validated signatures')
  const logger = source('lib/safe-server-log.ts')
  expect(logger.includes('ALLOWED_SERVER_EVENTS.has(event)'),
    'Structured logging must use approved event names')

  for (const routeName of ['create-intent', 'update-intent']) {
    expect(/status:\s*410/.test(source('app/api/payments/' + routeName + '/route.ts')),
      'Legacy user-priced PaymentIntent endpoint must remain disabled: ' + routeName)
  }

  const apiRoutes = [
    'app/api/admin/auth/route.ts',
    'app/api/admin/product-images/route.ts',
    'app/api/checkout/create-session/route.ts',
    'app/api/orders/route.ts',
    'app/api/preview-access/route.ts',
    'app/api/products/route.ts',
    'app/api/products/[id]/route.ts',
    'app/api/products/import/route.ts',
    'app/api/products/bulk-delete/route.ts',
    'app/api/shipping/rate/route.ts',
    'app/api/shipping/rates/route.ts',
    'app/api/waitlist/route.ts',
    'app/api/webhooks/stripe/route.ts',
  ]
  for (const path of apiRoutes) {
    const route = source(path)
    expect(!/console\.(?:log|warn|info|error|debug)\s*\(/.test(route),
      path + ': do not log unstructured customer/provider content')
    // Narrowly permit fixed, locally authored validation messages after an
    // explicit instanceof check. All other raw exception reflection is unsafe.
    const reflections = [...route.matchAll(/error:\s*(?:error|err|e)\.(?:message|stack)/g)]
    const safeType = path === 'app/api/admin/product-images/route.ts'
      ? 'InvalidImageError'
      : path === 'app/api/checkout/create-session/route.ts'
        ? 'CheckoutBasketError' : null
    const safeSingleValidation = reflections.length === 1 && safeType !== null &&
      route.includes('if (error instanceof ' + safeType + ')') &&
      reflections[0][0] === 'error: error.message'
    expect(reflections.length === 0 || safeSingleValidation,
      path + ': do not send unapproved exception details to clients')
    expect(!/\b(?:sk_live|whsec)_[A-Za-z0-9]{16,}/.test(route),
      path + ': avoid embedding provider credentials')
  }
  return errors
}

export function knownConfigurationWarnings(read) {
  const warnings = []
  if (/process\.env\.ADMIN_SESSION_SECRET\s*\|\|\s*process\.env\.ADMIN_PASSWORD/
    .test(read('lib/admin-session.ts'))) {
    warnings.push('Existing admin signing-secret fallback awaits verified environment migration (TSU-M7-004); do not remove blindly')
  }
  return warnings
}
