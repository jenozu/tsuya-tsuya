#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

function read(path) { return readFileSync(path, 'utf8') }
function requireMarker(path, marker, description) {
  assert.ok(read(path).includes(marker), description + ' was removed from ' + path)
}
const config = read('next.config.ts')
assert.ok(!config.includes('ignoreBuildErrors'), 'TypeScript errors must fail Next builds')
assert.ok(!config.includes("hostname: '**'"), 'Image optimization cannot use wildcard hosts')
requireMarker('lib/same-origin.ts', 'isSameOriginMutation', 'Origin check')
requireMarker('app/api/products/route.ts', 'isSameOriginMutation(request)', 'Product mutation CSRF guard')
requireMarker('app/api/admin/product-images/route.ts', 'inspectImageUpload', 'Image byte validation')
requireMarker('app/api/admin/product-images/route.ts', 'hasAdminSession(request)', 'Admin upload authorization')
requireMarker('app/api/checkout/create-session/route.ts', 'priceCheckoutBasket', 'Server-side catalog repricing')
requireMarker('app/api/webhooks/stripe/route.ts', 'verifyWebhookSignature(body, signature)', 'Signed webhook verification')
for (const route of ['create-intent', 'update-intent']) {
  requireMarker('app/api/payments/' + route + '/route.ts', 'status: 410', 'Retired client-trusted amount endpoint')
}
console.log('Security regression guard passed')
