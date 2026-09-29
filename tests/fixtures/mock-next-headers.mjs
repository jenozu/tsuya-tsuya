// Set synthetic signature only; the actual Stripe HMAC verification belongs
// in provider-connected integration tests, not a no-network route suite.
let signature = null
export function setSyntheticSignature(value) { signature = value }
export async function headers() {
  return new Headers(signature ? { 'stripe-signature': signature } : {})
}
