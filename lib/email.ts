import { Resend } from 'resend'
import { Order } from './types'
import { renderOrderConfirmationHtml } from './email-templates/order-confirmation'
import { renderOwnerNotificationHtml } from './email-templates/order-notification'
import { getConfiguredEmailDelivery } from './email-config'
import { reportServerError, reportServerInfo, reportServerWarn } from './safe-server-log'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendOrderConfirmation(
  customerEmail: string,
  orderId: string,
  order: Order
): Promise<boolean> {
  const delivery = getConfiguredEmailDelivery()
  if (!resend || !delivery) {
    reportServerWarn('email.order_confirmation.configuration_incomplete')
    return false
  }

  try {
    const html = renderOrderConfirmationHtml(orderId, order)

    const { error } = await resend.emails.send({
      from: delivery.from,
      to: customerEmail,
      subject: `Order Confirmation — ${orderId}`,
      html,
    })

    if (error) {
      reportServerError('email.order_confirmation.send_failed')
      return false
    }

    reportServerInfo('email.order_confirmation.sent')
    return true
  } catch {
    reportServerError('email.order_confirmation.send_failed')
    return false
  }
}

export async function sendOrderNotification(
  orderId: string,
  order: Order
): Promise<boolean> {
  const delivery = getConfiguredEmailDelivery()
  if (!resend || !delivery?.owner) {
    reportServerWarn('email.owner_notification.configuration_incomplete')
    return false
  }

  try {
    const html = renderOwnerNotificationHtml(orderId, order)

    const { error } = await resend.emails.send({
      from: delivery.from,
      to: delivery.owner,
      subject: `New Order — ${orderId}`,
      html,
    })

    if (error) {
      reportServerError('email.owner_notification.send_failed')
      return false
    }

    reportServerInfo('email.owner_notification.sent')
    return true
  } catch {
    reportServerError('email.owner_notification.send_failed')
    return false
  }
}
