/**
 * Structured, deliberately non-identifying server diagnostics.
 * Never pass provider exception objects, emails, addresses, order IDs, SQL,
 * Stripe metadata or arbitrary user strings into application log output.
 */
type SafeLevel = 'info' | 'warn' | 'error'

// Strict operational event vocabulary: a user-provided order reference, email,
// provider token, or error message must never become a log event, even if it
// contains only harmless-looking letters, digits, dots or hyphens.
export const ALLOWED_SERVER_EVENTS: ReadonlySet<string> = new Set([
  'api.admin_auth.failure',
  'api.preview_access.failure',
  'api.admin_product_images.failure',
  'api.checkout_create_session.failure',
  'api.orders.persist_failed',
  'api.orders.create_failure',
  'db.orders.create',
  'db.updating_order_status',
  'api.products_id_.failure',
  'api.products_bulk_delete.failure',
  'api.product_import.item_failure',
  'api.product_import.request_failure',
  'api.products.failure',
  'api.shipping_rate.failure',
  'api.shipping_rates.failure',
  'api.waitlist.notification_failure',
  'api.waitlist.notification_configuration_incomplete',
  'api.waitlist.request_failure',
  'stripe.checkout.deferred_pending_payment',
  'stripe.checkout.already_processed',
  'stripe.checkout.processing_complete',
  'stripe.checkout.processing_complete_email_incomplete',
  'stripe.webhook.signature_missing',
  'stripe.webhook.request_read_failure',
  'stripe.webhook.invalid_signature',
  'stripe.webhook.received',
  'stripe.webhook.order_marked_paid',
  'stripe.webhook.checkout_session_missing',
  'stripe.webhook.settled_order_preserved',
  'stripe.webhook.unmatched_unpaid_order',
  'stripe.webhook.unattributed_payment_ignored',
  'stripe.webhook.failed_payment_order_reference_missing',
  'stripe.webhook.event_ignored',
  'stripe.webhook.processing_failure',
  'stripe.creating_payment_intent',
  'stripe.updating_payment_intent',
  'stripe.webhook_signature_verification_failed',
  'stripe.retrieving_payment_intent',
  'stripe.canceling_payment_intent',
  'email.order_confirmation.configuration_incomplete',
  'email.order_confirmation.send_failed',
  'email.order_confirmation.sent',
  'email.owner_notification.configuration_incomplete',
  'email.owner_notification.send_failed',
  'email.owner_notification.sent',
])

function emit(level: SafeLevel, event: string): void {
  const safeEvent = ALLOWED_SERVER_EVENTS.has(event) ? event : 'unknown'
  const line = JSON.stringify({
    level,
    event: safeEvent,
    timestamp: new Date().toISOString(),
  })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)
}

export function reportServerInfo(event: string): void {
  emit('info', event)
}

export function reportServerWarn(event: string): void {
  emit('warn', event)
}

export function reportServerError(event: string): void {
  emit('error', event)
}
