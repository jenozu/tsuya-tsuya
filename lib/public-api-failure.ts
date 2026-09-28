/** Fixed 5xx API copy: never expose environment variable names, provider errors,
 * user-submitted text or payment/customer metadata to callers. */
export const PUBLIC_API_FAILURE = Object.freeze({
  authentication: 'Authentication is temporarily unavailable.',
  preview: 'Preview access is temporarily unavailable.',
  webhook: 'Webhook processing is temporarily unavailable.',
  webhookRequest: 'Unable to read webhook request.',
} as const)
