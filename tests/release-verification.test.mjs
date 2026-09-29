import assert from 'node:assert/strict'
import { test } from 'node:test'
import { releaseOrigin, verifyRelease } from '../lib/release-verification.mjs'

const SHA = '0123456789abcdef0123456789abcdef01234567'
const OTHER = 'fedcba9876543210fedcba9876543210fedcba98'
const PRIMARY = 'https://tsuyanouchi.com'
const SECONDARY = 'https://www.tsuyanouchi.com'

function fixture(status, body, url, headerOverrides = {}) {
  const headers = {
    'cache-control': 'no-store, max-age=0',
    'content-type': 'application/json',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'strict-transport-security': 'max-age=15552000',
    ...headerOverrides,
  }
  const response = new Response(body, { status, headers })
  Object.defineProperty(response, 'url', { value: url })
  return response
}

function offlineFetch({ stale = false, failHome = false, redirect = false, wrongHeaders = false } = {}) {
  const seen = []
  const get = async input => {
    seen.push(String(input))
    const requested = new URL(input)
    const resolved = redirect && requested.origin === SECONDARY ? PRIMARY + requested.pathname : input
    if (requested.pathname === '/') {
      return fixture(failHome ? 404 : 200, '<html><body>Under construction</body></html>', resolved,
        { 'content-type': 'text/html; charset=utf-8' })
    }
    return fixture(200, JSON.stringify({ service: 'tsuya', release: stale ? OTHER : SHA }), resolved,
      wrongHeaders ? { 'x-frame-options': 'ALLOWALL' } : {})
  }
  return { seen, get }
}

test('checks explicit hostnames, commit SHA, secure headers and read-only HTML reachability', async () => {
  const fixture = offlineFetch({redirect:true})
  const result = await verifyRelease({
    expectedSha: SHA.toUpperCase(), origins:[PRIMARY,SECONDARY],
    requireHsts: true, fetchImpl: fixture.get,
  })
  assert.equal(result.sha, SHA)
  assert.deepEqual(result.checked,['tsuyanouchi.com','www.tsuyanouchi.com'])
  assert.equal(result.homepageChecked,true)
  assert.deepEqual(fixture.seen,[
    PRIMARY+'/api/release',PRIMARY+'/', SECONDARY+'/api/release',SECONDARY+'/',
  ])
})

test('refuses stale deployments even when homepage is reachable', async () => {
  const fake = offlineFetch({stale:true})
  await assert.rejects(
    verifyRelease({expectedSha:SHA,origins:[PRIMARY],fetchImpl:fake.get}),
    /Deployment SHA mismatch/,
  )
  assert.deepEqual(fake.seen,[PRIMARY+'/api/release'])
})

test('refuses inaccessible HTML without mistaking a fingerprint for a functional storefront', async () => {
  await assert.rejects(verifyRelease({
    expectedSha:SHA, origins:[PRIMARY],fetchImpl:offlineFetch({failHome:true}).get,
  }), /Homepage is not serving/)
})

test('rejects cross-domain redirects, missing browser safeguards and missing HSTS', async () => {
  const foreign = async input => fixture(200,
    JSON.stringify({ service: 'tsuya', release: SHA }),
    'https://attacker.invalid/api/release')
  await assert.rejects(verifyRelease({
    expectedSha:SHA, origins:[PRIMARY],fetchImpl:foreign,
  }), /unapproved origin/)
  await assert.rejects(verifyRelease({
    expectedSha:SHA, origins:[PRIMARY],fetchImpl:offlineFetch({wrongHeaders:true}).get,
  }), /Missing required production security headers/)
  const noHsts = async input => fixture(200,
    JSON.stringify({ service: 'tsuya', release: SHA }), input,
    { 'strict-transport-security':'' })
  await assert.rejects(verifyRelease({
    expectedSha:SHA, origins:[PRIMARY],fetchImpl:noHsts,requireHsts:true,
  }), /missing HSTS/)
})

test('rejects incorrect releases, malformed provider responses and non-HTTPS public targets', async () => {
  for (const origin of ['http://tsuyanouchi.com','https://u:secret@tsuyanouchi.com',
    'https://tsuyanouchi.com/?token=secret', 'https://tsuyanouchi.com/admin']) {
    assert.throws(()=>releaseOrigin(origin), /HTTPS origin/)
  }
  assert.equal(releaseOrigin('http://127.0.0.1:3010'),'http://127.0.0.1:3010')
  await assert.rejects(verifyRelease({expectedSha:'short',origins:[PRIMARY],
    fetchImpl:offlineFetch().get}), /complete 40-character/)
  const missing = async input => fixture(503, '{"service":"tsuya","release":null}',input)
  await assert.rejects(verifyRelease({expectedSha:SHA,origins:[PRIMARY],
    fetchImpl:missing}), /HTTP 503/)
  const invalid = async input => fixture(200, '<!-- unexpected HTML -->',input)
  await assert.rejects(verifyRelease({expectedSha:SHA,origins:[PRIMARY],
    fetchImpl:invalid}), /invalid JSON/)
})

test('a page that requires login cannot be mistaken for public release verification', async () => {
  const locked=async input=>fixture(403, 'Forbidden', input)
  await assert.rejects(verifyRelease({expectedSha:SHA,origins:[PRIMARY],
    fetchImpl:locked}), /HTTP 403/)
})
