// The one place that decides whether the storefront is in under-construction mode.
// Only the exact string 'true' turns it on; unset or anything else means off (current production default).
// Literal process.env access is kept so Next inlines NEXT_PUBLIC_ vars in middleware.
export function underConstructionEnabled(value: string | undefined = process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION): boolean {
  return value === 'true'
}
