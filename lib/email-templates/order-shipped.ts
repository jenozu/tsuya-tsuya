import { escapeHtml } from '../html-escape.ts'

/** Shipping notification (customer-facing). Tracking link only for http(s) URLs. */
export function renderOrderShippedHtml(
  orderId: string,
  tracking: { carrier?: string; number?: string; url?: string } = {}
): string {
  const url = tracking.url && /^https?:\/\//i.test(tracking.url) ? tracking.url : null
  const ref = [tracking.carrier, tracking.number].filter(Boolean).map((v) => escapeHtml(v)).join(' ')
  const link = url ? `<p><a href="${escapeHtml(url)}">Track your package</a></p>` : ''
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your order has shipped - ${escapeHtml(orderId)}</title>
</head>
<body style="font-family: Georgia, serif; color: #2B2B2B;">
  <h1>Your order has shipped</h1>
  <p>Order ${escapeHtml(orderId)} is on its way.</p>
  ${ref ? `<p>${ref}</p>` : ''}
  ${link}
</body>
</html>`
}
