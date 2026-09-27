import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import {
  createPreviewSessionToken,
  hasPreviewSession,
  PREVIEW_SESSION_MAX_AGE,
} from '../lib/preview-session.ts'

const previousSecret = process.env.ADMIN_SESSION_SECRET
before(() => { process.env.ADMIN_SESSION_SECRET = 'test-only-high-entropy-preview-signing-secret' })
after(() => {
  if (previousSecret === undefined) delete process.env.ADMIN_SESSION_SECRET
  else process.env.ADMIN_SESSION_SECRET = previousSecret
})

function requestWithCookie(token) {
  return new Request('https://example.test/', { headers: { cookie: `preview_access=${encodeURIComponent(token)}` } })
}

test('preview never trusts an unsigned legacy or forged cookie', async () => {
  assert.equal(await hasPreviewSession(requestWithCookie('granted')), false)
  assert.equal(await hasPreviewSession(new Request('https://example.test/')), false)
})

test('fresh signed preview cookie is accepted', async () => {
  const token = await createPreviewSessionToken()
  assert.match(token, /^preview-v1\.\d+\.[a-f0-9]{64}$/)
  assert.equal(await hasPreviewSession(requestWithCookie(token)), true)
})

test('tampering the signature or expiration invalidates preview access', async () => {
  const token = await createPreviewSessionToken()
  const pieces = token.split('.')
  const changedSignature = `${pieces[0]}.${pieces[1]}.${pieces[2].replace(/^./, pieces[2][0] === 'a' ? 'b' : 'a')}`
  const changedExpiration = `${pieces[0]}.${Number(pieces[1]) + 60}.${pieces[2]}`
  assert.equal(await hasPreviewSession(requestWithCookie(changedSignature)), false)
  assert.equal(await hasPreviewSession(requestWithCookie(changedExpiration)), false)
})

test('expired preview token is rejected even with a valid signature', async () => {
  const dateNow = Date.now
  try {
    Date.now = () => dateNow() - (PREVIEW_SESSION_MAX_AGE + 3600) * 1000
    const token = await createPreviewSessionToken()
    Date.now = dateNow
    assert.equal(await hasPreviewSession(requestWithCookie(token)), false)
  } finally {
    Date.now = dateNow
  }
})

test('no signing secret fails closed', async () => {
  const token = await createPreviewSessionToken()
  delete process.env.ADMIN_SESSION_SECRET
  try {
    assert.equal(await hasPreviewSession(requestWithCookie(token)), false)
    await assert.rejects(createPreviewSessionToken(), /not configured/)
  } finally {
    process.env.ADMIN_SESSION_SECRET = 'test-only-high-entropy-preview-signing-secret'
  }
})
