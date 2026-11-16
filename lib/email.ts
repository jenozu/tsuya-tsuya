import { Resend } from 'resend'
import { Order } from './types'
import { renderOrderConfirmationHtml } from './email-templates/order-confirmation'
import { renderOrderShippedHtml } from './email-templates/order-shipped'
import { renderOwnerNotificationHtml } from './email-templates/order-notification'
import { renderOrderCanceledHtml, renderOrderRefundedHtml, renderPaymentFailedHtml } from './email-templates/order-lifecycle'
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

export async function sendOrderShipped(
  customerEmail: string,
  orderId: string,
  tracking: { carrier?: string; number?: string; url?: string }
): Promise<boolean> {
  const delivery = getConfiguredEmailDelivery()
  if (!resend || !delivery) {
    reportServerWarn('email.order_shipped.configuration_incomplete')
    return false
  }
  try {
    const { error } = await resend.emails.send({
      from: delivery.from,
      to: customerEmail,
      subject: `Your order has shipped - ${orderId}`,
      html: renderOrderShippedHtml(orderId, tracking),
    })
    if (error) {
      reportServerError('email.order_shipped.send_failed')
      return false
    }
    reportServerInfo('email.order_shipped.sent')
    return true
  } catch {
    reportServerError('email.order_shipped.send_failed')
    return false
  }
}

async function sendLifecycle(to: string, subject: string, html: string): Promise<boolean> {
  const delivery = getConfiguredEmailDelivery()
  if (!resend || !delivery) {
    reportServerWarn('email.lifecycle.configuration_incomplete')
    return false
  }
  try {
    const { error } = await resend.emails.send({ from: delivery.from, to, subject, html })
    if (error) {
      reportServerError('email.lifecycle.send_failed')
      return false
    }
    reportServerInfo('email.lifecycle.sent')
    return true
  } catch {
    reportServerError('email.lifecycle.send_failed')
    return false
  }
}

export const sendOrderCanceled = (to: string, orderId: string, reason?: string) =>
  sendLifecycle(to, `Your order has been canceled - ${orderId}`, renderOrderCanceledHtml(orderId, reason))
export const sendOrderRefunded = (to: string, orderId: string, amountLabel?: string) =>
  sendLifecycle(to, `Your order has been refunded - ${orderId}`, renderOrderRefundedHtml(orderId, amountLabel))
export const sendPaymentFailed = (to: string, orderId: string, retryUrl?: string) =>
  sendLifecycle(to, `Your payment did not go through - ${orderId}`, renderPaymentFailedHtml(orderId, retryUrl))
