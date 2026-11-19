import { escapeHtml } from '../html-escape.ts'

// Wording is a draft: TBD: owner to approve copy (task 24).
function page(title: string, orderId: string, lines: string[]): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)} - ${escapeHtml(orderId)}</title>
</head>
<body style="font-family: Georgia, serif; color: #2B2B2B;">
  <h1>${escapeHtml(title)}</h1>
  <p>Order ${escapeHtml(orderId)}</p>
${lines.map((l) => `  <p>${l}</p>`).join('\n')}
</body>
</html>`
}

export function renderOrderCanceledHtml(orderId: string, reason?: string): string {
  return page('Your order has been canceled', orderId, [
    'Your order has been canceled and will not be produced or shipped.',
    ...(reason ? [`Reason: ${escapeHtml(reason)}`] : []),
  ])
}

export function renderOrderRefundedHtml(orderId: string, amountLabel?: string): string {
  return page('Your order has been refunded', orderId, [
    `A refund${amountLabel ? ` of ${escapeHtml(amountLabel)}` : ''} has been issued to your original payment method. Timing depends on your bank.`,
  ])
}

export function renderPaymentFailedHtml(orderId: string, retryUrl?: string): string {
  const url = retryUrl && /^https?:\/\//i.test(retryUrl) ? retryUrl : null
  return page('Your payment did not go through', orderId, [
    'We could not process your payment, so your order has not been placed.',
    ...(url ? [`<a href="${escapeHtml(url)}">Try again</a>`] : []),
  ])
}
