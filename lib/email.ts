import { Resend } from 'resend'
import { Order } from './supabase-helpers'
import { renderOrderConfirmationHtml } from './email-templates/order-confirmation'

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set - email functionality will be disabled')
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Tsuyanouchi <orders@tsuyanouchi.com>'
const ADMIN_EMAIL = process.env.ORDER_NOTIFICATION_EMAIL || 'admin@tsuyanouchi.com'

export async function sendOrderConfirmation(
  customerEmail: string,
  orderId: string,
  order: Order
): Promise<boolean> {
  if (!resend) {
    console.warn('Resend not configured - skipping order confirmation email')
    return false
  }

  try {
    const html = renderOrderConfirmationHtml(orderId, order)

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Order Confirmation — ${orderId}`,
      html,
    })

    if (error) {
      console.error('Error sending order confirmation email:', error)
      return false
    }

    console.log('Order confirmation email sent to:', customerEmail)
    return true
  } catch (error) {
    console.error('Error sending order confirmation email:', error)
    return false
  }
}

export async function sendOrderNotification(
  orderId: string,
  order: Order
): Promise<boolean> {
  if (!resend) {
    console.warn('Resend not configured - skipping admin notification email')
    return false
  }

  try {
    const itemsList = order.items
      .map(
        (item) =>
          `<li style="padding: 8px 0; border-bottom: 1px solid #E5E0D8; color: #2D2A26;">
            <span style="font-weight: 600;">${item.productName}</span> 
            <span style="color: #786B59;">(Qty: ${item.quantity})</span> — 
            <span style="font-weight: 600;">$${(item.price * item.quantity).toFixed(2)}</span>
          </li>`
      )
      .join('')

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order - ${orderId}</title>
</head>
<body style="font-family: Georgia, Cambria, 'Times New Roman', Times, serif; line-height: 1.7; color: #2D2A26; max-width: 600px; margin: 0 auto; padding: 0; background: #F2EFE9;">
  <div style="background: #2D2A26; color: #F9F8F4; padding: 40px 30px; text-align: center;">
    <h1 style="margin: 0; font-size: 28px; font-weight: 400;">New Order Received</h1>
    <p style="margin: 12px 0 0; opacity: 0.85; font-size: 14px;">Order ${orderId}</p>
  </div>
  
  <div style="background: #F9F8F4; padding: 40px 30px;">
    <div style="background: white; padding: 24px; margin: 0 0 30px; border-left: 3px solid #5C7C66;">
      <h3 style="margin-top: 0; color: #2D2A26; font-size: 18px; font-weight: 400;">Customer Information</h3>
      <p style="margin: 12px 0 0; color: #4A4036;"><strong>Email:</strong> ${order.email}</p>
      <p style="margin: 8px 0 0; color: #4A4036;"><strong>Name:</strong> ${order.shipping_address.firstName} ${order.shipping_address.lastName}</p>
      <p style="margin: 12px 0 0; color: #4A4036;"><strong>Address:</strong></p>
      <p style="margin: 4px 0 0; color: #786B59;">
        ${order.shipping_address.address}<br>
        ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postalCode}<br>
        ${order.shipping_address.country}
      </p>
    </div>
    
    <div style="background: white; padding: 24px; margin: 0 0 30px;">
      <h3 style="margin-top: 0; color: #2D2A26; font-size: 18px; font-weight: 400;">Order Items</h3>
      <ul style="list-style-type: none; padding: 0; margin: 12px 0 0;">
        ${itemsList}
      </ul>
    </div>
    
    <div style="background: #2D2A26; color: #F9F8F4; padding: 30px; text-align: center;">
      <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 400;">Order Summary</h3>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; opacity: 0.8;">
        <span>Subtotal</span>
        <span>$${order.subtotal.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; opacity: 0.8;">
        <span>Shipping</span>
        <span>$${order.shipping.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; opacity: 0.8;">
        <span>Tax</span>
        <span>$${order.taxes.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 16px 0 0; font-size: 24px; font-weight: 600; border-top: 1px solid rgba(249, 248, 244, 0.2); margin-top: 8px;">
        <span>Total</span>
        <span>$${order.total.toFixed(2)}</span>
      </div>
    </div>
    
    <div style="background: #F2EFE9; padding: 24px; text-align: center; margin-top: 30px;">
      <p style="margin: 0; color: #786B59; font-style: italic;">View and manage this order in your admin dashboard</p>
    </div>
  </div>
</body>
</html>
`

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New Order — ${orderId}`,
      html,
    })

    if (error) {
      console.error('Error sending admin notification email:', error)
      return false
    }

    console.log('Admin notification email sent')
    return true
  } catch (error) {
    console.error('Error sending admin notification email:', error)
    return false
  }
}
