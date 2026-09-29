import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readBoundedJson, RequestBodyError } from '../lib/bounded-json.ts'
import { siteSecurityHeaders } from '../lib/security-headers.ts'

function post(body, headers={}) {
  return new Request('https://tsuyanouchi.com/api/admin/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  })
}
test('bounded parser handles valid JSON with optional UTF-8 content type', async () => {
  assert.deepEqual(await readBoundedJson(post('{"password":"ok"}', {
    'content-type': 'application/json; charset=UTF-8',
  }), 32), { password: 'ok' })
})
test('bounded parser rejects huge stream even without Content-Length', async () => {
  const req = post(JSON.stringify({ password:'x'.repeat(4096) }))
  assert.equal(req.headers.get('content-length'), null)
  await assert.rejects(readBoundedJson(req, 100), error =>
    error instanceof RequestBodyError && error.status === 413)
})
test('bounded parser rejects overstated, malformed and misleading declared lengths', async () => {
  for (const value of ['10000', '-1', 'Infinity', '012', '1.5']) {
    const req=post('{"password":"ok"}', { 'content-length': value })
    await assert.rejects(readBoundedJson(req, 64), error =>
      error instanceof RequestBodyError && error.status === (value === '10000' ? 413 : 400))
  }
})
test('bounded parser rejects unsupported media, malformed JSON and invalid UTF-8', async () => {
  await assert.rejects(readBoundedJson(post('{"x":1}', {
    'content-type':'text/plain',
  }), 64), error => error.status===415)
  await assert.rejects(readBoundedJson(post('{broken'), 64), error => error.status===400)
  await assert.rejects(readBoundedJson(post(new Uint8Array([0xff,0xfe])), 64),
    error => error.status===400)
})
test('bounded parser fails closed without a body or invalid private limit', async () => {
  const empty = new Request('https://tsuyanouchi.com/api/admin/auth', {
    method:'POST', headers:{'content-type':'application/json'},
  })
  await assert.rejects(readBoundedJson(empty, 64), error=>error.status===400)
  await assert.rejects(readBoundedJson(post('{}'), -1), /private request size/)
})
test('global headers reject framing and sniffing, with HSTS only on production', () => {
  const development=Object.fromEntries(siteSecurityHeaders(false).map(h=>[h.key,h.value]))
  const production=Object.fromEntries(siteSecurityHeaders(true).map(h=>[h.key,h.value]))
  assert.equal(development['Strict-Transport-Security'], undefined)
  assert.equal(production['Strict-Transport-Security'],'max-age=15552000')
  assert.equal(production['X-Frame-Options'],'DENY')
  assert.equal(production['X-Content-Type-Options'],'nosniff')
  assert.equal(production['Referrer-Policy'],'strict-origin-when-cross-origin')
  assert.ok(!production['Strict-Transport-Security'].includes('includeSubDomains'))
})
