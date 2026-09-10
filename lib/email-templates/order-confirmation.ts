import type { Order } from '@/lib/supabase-helpers'

/**
 * Order confirmation email template (customer-facing).
 * Edit this file to change the look and copy of the confirmation email.
 */
export function renderOrderConfirmationHtml(orderId: string, order: Order): string {
  const itemsList = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 12px 8px; border-bottom: 1px solid #E5E0D8; font-family: 'Tsuyanouchi Serif', Georgia, serif;">${escapeHtml(item.productName)}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #E5E0D8; text-align: center; font-variant-numeric: lining-nums tabular-nums;">${item.quantity}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #E5E0D8; text-align: right; font-variant-numeric: lining-nums tabular-nums;">$${item.price.toFixed(2)}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #E5E0D8; text-align: right; font-weight: 600; font-variant-numeric: lining-nums tabular-nums;">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join('')

  const addr = order.shipping_address
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - ${escapeHtml(orderId)}</title>
  <style>
    @font-face {
      font-family: 'Tsuyanouchi Serif';
      src: url('/fonts/tsuyanouchi-serif.otf') format('opentype'),
           url('/fonts/tsuyanouchi-serif.ttf') format('truetype');
      font-display: swap;
    }
    body { font-variant-numeric: lining-nums tabular-nums; }
  </style>
</head>
<body style="font-family: 'Tsuyanouchi Serif', Georgia, Cambria, 'Times New Roman', Times, serif; line-height: 1.7; color: #2D2A26; max-width: 600px; margin: 0 auto; padding: 0; background: #F2EFE9; font-variant-numeric: lining-nums tabular-nums;">
  <div style="background: #2D2A26; color: #F9F8F4; padding: 40px 30px; text-align: center;">
    <h1 style="margin: 0; font-size: 32px; font-weight: 400; letter-spacing: 0.05em;">Tsuyanouchi</h1>
    <p style="margin: 12px 0 0; opacity: 0.85; font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em;">House of Lustre</p>
  </div>
  
  <div style="background: #F9F8F4; padding: 40px 30px;">
    <h2 style="color: #2D2A26; margin-top: 0; font-size: 24px; font-weight: 400;">Thank you for your order</h2>
    <p style="color: #4A4036; margin: 16px 0;">Your order has been received and is being carefully prepared for shipment.</p>
    
    <div style="background: white; padding: 24px; margin: 30px 0; border-left: 3px solid #786B59;">
      <p style="margin: 0; font-size: 12px; color: #786B59; text-transform: uppercase; letter-spacing: 0.1em;">Order Number</p>
      <p style="margin: 8px 0 0; font-size: 20px; font-weight: 600; color: #2D2A26; letter-spacing: 0.02em; font-variant-numeric: lining-nums tabular-nums;">${escapeHtml(orderId)}</p>
    </div>
    
    <h3 style="color: #2D2A26; margin-top: 40px; font-size: 18px; font-weight: 400; border-bottom: 1px solid #E5E0D8; padding-bottom: 12px;">Order Details</h3>
    <table style="width: 100%; background: white; margin-top: 20px; border-collapse: collapse;">
      <thead>
        <tr style="background: #F2EFE9;">
          <th style="padding: 12px 8px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #786B59; font-weight: 500;">Item</th>
          <th style="padding: 12px 8px; text-align: center; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #786B59; font-weight: 500;">Qty</th>
          <th style="padding: 12px 8px; text-align: right; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #786B59; font-weight: 500;">Price</th>
          <th style="padding: 12px 8px; text-align: right; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #786B59; font-weight: 500;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsList}
      </tbody>
    </table>
    
    <div style="background: white; padding: 24px; margin-top: 20px;">
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F2EFE9; color: #4A4036;">
        <span>Subtotal</span>
        <span style="font-variant-numeric: lining-nums tabular-nums;">$${order.subtotal.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F2EFE9; color: #4A4036;">
        <span>Shipping</span>
        <span style="font-variant-numeric: lining-nums tabular-nums;">$${order.shipping.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F2EFE9; color: #4A4036;">
        <span>Tax</span>
        <span style="font-variant-numeric: lining-nums tabular-nums;">$${order.taxes.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 16px 0 0; font-size: 20px; font-weight: 600; color: #2D2A26;">
        <span>Total</span>
        <span style="font-variant-numeric: lining-nums tabular-nums;">$${order.total.toFixed(2)}</span>
      </div>
    </div>
    
    <h3 style="color: #2D2A26; margin-top: 40px; font-size: 18px; font-weight: 400; border-bottom: 1px solid #E5E0D8; padding-bottom: 12px;">Shipping Address</h3>
    <div style="background: white; padding: 24px; margin-top: 20px;">
      <p style="margin: 0; color: #2D2A26; font-weight: 500;">${escapeHtml(addr.firstName)} ${escapeHtml(addr.lastName)}</p>
      <p style="margin: 8px 0 0; color: #4A4036;">${escapeHtml(addr.address)}</p>
      <p style="margin: 4px 0 0; color: #4A4036;">${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} ${escapeHtml(addr.postalCode)}</p>
      <p style="margin: 4px 0 0; color: #4A4036;">${escapeHtml(addr.country)}</p>
    </div>
    
    <div style="margin-top: 40px; padding: 30px; background: #F2EFE9; border-top: 2px solid #E5E0D8; text-align: center;">
      <p style="margin: 0; color: #786B59; font-size: 14px; font-style: italic;">You will receive a shipping confirmation once your order is dispatched.</p>
      <p style="margin: 16px 0 0; color: #786B59; font-size: 14px;">For inquiries: <a href="mailto:support@tsuyanouchi.com" style="color: #5C7C66; text-decoration: none;">support@tsuyanouchi.com</a></p>
    </div>
  </div>
  
  <div style="text-align: center; padding: 30px; color: #786B59; font-size: 11px; background: #E5E0D8;">
    <p style="margin: 0; text-transform: uppercase; letter-spacing: 0.15em;">Tsuyanouchi — House of Lustre</p>
    <p style="margin: 8px 0 0;">© ${year} All rights reserved</p>
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
