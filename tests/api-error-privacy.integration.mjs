import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GET as getProducts } from '../app/api/products/route.ts'
import { POST as adminLogin } from '../app/api/admin/auth/route.ts'
import { POST as previewLogin } from '../app/api/preview-access/route.ts'
import { PUBLIC_API_FAILURE } from '../lib/public-api-failure.ts'
import { failCatalogReadsWith } from './fixtures/mock-catalog.mjs'

function loginRequest(path) {
  return new Request('https://tsuyanouchi.com' + path, {
    method: 'POST',
    headers: {
      origin: 'https://tsuyanouchi.com',
      'sec-fetch-site': 'same-origin',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ password: 'incorrect-test-password' }),
  })
}

test('actual public catalog handler redacts private database exceptions in response and logs', async () => {
  const marker = 'PRIVATE_SQL customer.secret@example.test pi_secret_123 address-999'
  const log = []
  const previousError = console.error
  failCatalogReadsWith(marker)
  try {
    console.error = message => log.push(message)
    const response = await getProducts()
    const payload = await response.json()
    assert.equal(response.status, 500)
    assert.deepEqual(payload, { error: 'Failed to fetch products' })
    assert.equal(log.length, 1)
    assert.equal(JSON.parse(log[0]).event, 'api.products.failure')
    assert.ok(!JSON.stringify(payload).includes(marker))
    assert.ok(!log.join(' ').includes(marker))
  } finally {
    console.error = previousError
    failCatalogReadsWith(null)
  }
})

test('actual admin login does not expose unconfigured internal secret names', async () => {
  const previous = process.env.ADMIN_PASSWORD
  const previousLog = console.error
  const logs = []
  try {
    delete process.env.ADMIN_PASSWORD
    console.error = message => logs.push(message)
    const response = await adminLogin(loginRequest('/api/admin/auth'))
    const payload = await response.json()
    assert.equal(response.status, 500)
    assert.deepEqual(payload, { error: PUBLIC_API_FAILURE.authentication })
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.ok(!JSON.stringify(payload).includes('ADMIN_PASSWORD'))
    assert.equal(JSON.parse(logs[0]).event, 'api.admin_auth.failure')
  } finally {
    console.error = previousLog
    if (previous === undefined) delete process.env.ADMIN_PASSWORD
    else process.env.ADMIN_PASSWORD = previous
  }
})

test('actual preview login does not reveal secret configuration state', async () => {
  const previous = process.env.ADMIN_SESSION_SECRET
  const previousLog = console.error
  const logs = []
  try {
    delete process.env.ADMIN_SESSION_SECRET
    console.error = message => logs.push(message)
    const response = await previewLogin(loginRequest('/api/preview-access'))
    const payload = await response.json()
    assert.equal(response.status, 500)
    assert.deepEqual(payload, { error: PUBLIC_API_FAILURE.preview })
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.ok(!JSON.stringify(payload).includes('PREVIEW_PASSWORD'))
    assert.equal(JSON.parse(logs[0]).event, 'api.preview_access.failure')
  } finally {
    console.error = previousLog
    if (previous === undefined) delete process.env.ADMIN_SESSION_SECRET
    else process.env.ADMIN_SESSION_SECRET = previous
  }
})
