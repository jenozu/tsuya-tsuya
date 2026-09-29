import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GET, dynamic, runtime } from '../app/api/release/route.ts'

const SHA = 'abcdef0123456789abcdef0123456789abcdef01'

test('release route publishes a strictly validated no-store Git SHA, never provider configuration', async () => {
  const previousSha = process.env.VERCEL_GIT_COMMIT_SHA
  const previousSecret = process.env.STRIPE_SECRET_KEY
  try {
    process.env.VERCEL_GIT_COMMIT_SHA = SHA.toUpperCase()
    process.env.STRIPE_SECRET_KEY = 'sk_test_SENSITIVE_SYNTHETIC_VALUE'
    const response = await GET()
    assert.equal(response.status,200)
    assert.deepEqual(await response.json(),{service:'tsuya',release:SHA})
    assert.match(response.headers.get('cache-control'),/no-store/)
    assert.equal(response.headers.get('x-content-type-options'),'nosniff')
    assert.equal(runtime,'nodejs')
    assert.equal(dynamic,'force-dynamic')
    assert.doesNotMatch(JSON.stringify(Object.fromEntries(response.headers)),/SENSITIVE_SYNTHETIC_VALUE/)
  } finally {
    if (previousSha === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA
    else process.env.VERCEL_GIT_COMMIT_SHA = previousSha
    if (previousSecret === undefined) delete process.env.STRIPE_SECRET_KEY
    else process.env.STRIPE_SECRET_KEY = previousSecret
  }
})

test('missing or malformed Vercel SHA fails closed with a non-cached, redacted 503', async () => {
  const previous = process.env.VERCEL_GIT_COMMIT_SHA
  try {
    for (const value of ['', 'garbage', '0123456789abcdef']) {
      process.env.VERCEL_GIT_COMMIT_SHA=value
      const response=await GET()
      assert.equal(response.status,503)
      assert.deepEqual(await response.json(),{service:'tsuya',release:null})
      assert.match(response.headers.get('cache-control'),/no-store/)
    }
  } finally {
    if (previous === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA
    else process.env.VERCEL_GIT_COMMIT_SHA = previous
  }
})
