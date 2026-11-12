// Server-only Printify settings. Read at call time so builds and tests need no secrets.
// Never prefix these with NEXT_PUBLIC_.

/** Off unless the value is exactly 'true' (unset, empty, '1', 'TRUE' all mean off). */
export function isPrintifyOrdersEnabled(): boolean {
  return process.env.PRINTIFY_ORDERS_ENABLED === 'true'
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is missing or blank`)
  return value
}

export function getPrintifyConfig(): { apiToken: string; shopId: string } {
  return {
    apiToken: requiredEnv('PRINTIFY_API_TOKEN'),
    shopId: requiredEnv('PRINTIFY_SHOP_ID'),
  }
}

/** Used by the webhook route (task 20). Same rules as the other getters. */
export function getPrintifyWebhookSecret(): string {
  return requiredEnv('PRINTIFY_WEBHOOK_SECRET')
}
