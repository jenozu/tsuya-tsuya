import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifiedSupportAddress, publicBusinessLocation, verifiedSocialUrl } from '../lib/public-business-details.ts'
test('missing config omits unverified business and social links', () => {
  assert.equal(verifiedSupportAddress(), null)
  assert.equal(publicBusinessLocation(), null)
  assert.equal(verifiedSocialUrl('x'), null)
})
test('validated contacts reject injection or malicious URL origins', () => {
  assert.equal(verifiedSupportAddress('help@legitimatebusiness.ca'), 'help@legitimatebusiness.ca')
  assert.equal(verifiedSupportAddress('help@example.test'), null)
  assert.equal(verifiedSupportAddress('owner@your-verified-domain.example'), null)
  assert.equal(verifiedSupportAddress('help<script>@example.test'), null)
  assert.equal(publicBusinessLocation('Toronto, Canada'), 'Toronto, Canada')
  assert.equal(publicBusinessLocation('Tokyo<script>'), null)
  assert.equal(verifiedSocialUrl('x', 'https://x.com/VerifiedAccount'), 'https://x.com/VerifiedAccount')
  assert.equal(verifiedSocialUrl('x', 'https://x.com.evil.example/account'), null)
  assert.equal(verifiedSocialUrl('pinterest', 'http://www.pinterest.com/name'), null)
  assert.equal(verifiedSocialUrl('tumblr', 'https://artist.tumblr.com/'), 'https://artist.tumblr.com/')
})
