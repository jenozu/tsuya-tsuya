import assert from 'node:assert/strict'
import { test } from 'node:test'
import { handleContact, CONTACT_MAX_PER_WINDOW } from '../lib/contact-form.ts'

process.env.SUPPORT_EMAIL = 'help@tsuyanouchi.com'
process.env.RESEND_FROM_EMAIL = 'TsuyaNoUchi <orders@tsuyanouchi.com>'

function setup() {
  const sent = []
  const counts = new Map()
  const deps = {
    store: { async hit(b, now) { const c = (counts.get(b) ?? 0) + 1; counts.set(b, c); return { count: c, windowStartedAt: now } }, async reset() {} },
    bucket: async () => 'b',
    send: async (m) => { sent.push(m) },
    now: () => 1000,
  }
  return { sent, deps }
}
const req = (body, headers = {}) => new Request('https://tsuyanouchi.com/api/contact', {
  method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://tsuyanouchi.com', ...headers }, body: JSON.stringify(body),
})
const good = { name: 'Aiko', email: 'aiko@buyer.com', message: 'Where is my <b>order</b>? Thanks.' }

test('valid message goes only to SUPPORT_EMAIL, escaped, reply-to user', async () => {
  const { sent, deps } = setup()
  const res = await handleContact(req({ ...good, to: 'evil@x.com' }), deps)
  assert.equal(res.status, 200)
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, 'help@tsuyanouchi.com')
  assert.equal(sent[0].replyTo, 'aiko@buyer.com')
  assert.match(sent[0].html, /&lt;b&gt;order/)
})
test('invalid input is rejected with 400', async () => {
  const { sent, deps } = setup()
  for (const bad of [{ ...good, email: 'nope' }, { ...good, message: 'short' }, { ...good, name: '' }]) {
    assert.equal((await handleContact(req(bad), deps)).status, 400)
  }
  assert.equal(sent.length, 0)
})
test('honeypot gets fake success and sends nothing', async () => {
  const { sent, deps } = setup()
  const res = await handleContact(req({ ...good, website: 'http://spam' }), deps)
  assert.equal(res.status, 200)
  assert.equal(sent.length, 0)
})
test('cross-origin request is forbidden', async () => {
  const { sent, deps } = setup()
  const res = await handleContact(req(good, { origin: 'https://evil.example' }), deps)
  assert.equal(res.status, 403)
  assert.equal(sent.length, 0)
})
test('over the limit returns 429 with Retry-After', async () => {
  const { sent, deps } = setup()
  for (let i = 0; i < CONTACT_MAX_PER_WINDOW; i++) assert.equal((await handleContact(req(good), deps)).status, 200)
  const res = await handleContact(req(good), deps)
  assert.equal(res.status, 429)
  assert.ok(Number(res.headers.get('retry-after')) > 0)
  assert.equal(sent.length, CONTACT_MAX_PER_WINDOW)
})
test('missing SUPPORT_EMAIL fails closed', async () => {
  const { sent, deps } = setup()
  const keep = process.env.SUPPORT_EMAIL
  delete process.env.SUPPORT_EMAIL
  const res = await handleContact(req(good), deps)
  process.env.SUPPORT_EMAIL = keep
  assert.equal(res.status, 503)
  assert.equal(sent.length, 0)
})
