// No Resend SDK, email traffic, or customer data leaves the isolated suite.
export const emailSends = []
let shouldFail = false
export function resetMockEmail() { emailSends.length = 0; shouldFail = false }
export function failMockEmail(value) { shouldFail = value }
export async function sendOrderConfirmation(_email, orderId) {
  emailSends.push({ kind: 'customer', orderId })
  return !shouldFail
}
export async function sendOrderNotification(orderId) {
  emailSends.push({ kind: 'owner', orderId })
  return !shouldFail
}
