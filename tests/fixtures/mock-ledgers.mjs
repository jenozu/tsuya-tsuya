// Stands in for staged-migration-003 tables so the webhook route runs without a database:
// the "table missing" legacy path (claim unavailable, emails untracked).
export async function claimPaymentEvent() { return 'unavailable' }
export async function finishPaymentEvent() {}
export async function sendOrderEmailsOnce() { return null }
