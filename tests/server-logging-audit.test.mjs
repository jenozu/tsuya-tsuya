import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const serverModules = [
  'lib/data.ts',
  'lib/stripe.ts',
  'services/gemini.ts',
  'app/api/orders/route.ts',
  'app/api/waitlist/route.ts',
  'app/api/webhooks/stripe/route.ts',
  'app/api/products/route.ts',
  'app/api/products/[id]/route.ts',
  'app/api/products/bulk-delete/route.ts',
  'app/api/shipping/rate/route.ts',
  'app/api/shipping/rates/route.ts',
  'app/api/admin/auth/route.ts',
  'app/api/admin/product-images/route.ts',
  'app/api/checkout/create-session/route.ts',
]
test('audited server modules do not dump exceptions or identifiers into logs', () => {
  for (const path of serverModules) {
    const source = readFileSync(path, 'utf8')
    assert.doesNotMatch(source, /console\.(?:log|info|warn|error)\([^\n]*,\s*(?:error|err|orderData|orderId|paymentIntent\.id)\s*\)/,
      'Potentially sensitive console payload: ' + path)
  }
})

test('admin order API returns a fixed public error, not an underlying provider message', () => {
  const source = readFileSync('app/api/orders/route.ts', 'utf8')
  assert.doesNotMatch(source, /error:\s*message|error:\s*error\.message/)
  assert.match(source, /Unable to create order/)
})
