// How Stripe echoes our Checkout create params back as line items on an expanded, paid session (no network).
export function stripeEcho(params) {
  return params.map(li => ({
    quantity: li.quantity,
    amount_total: li.price_data.unit_amount * li.quantity,
    currency: li.price_data.currency,
    description: li.price_data.product_data.name,
    price: {
      unit_amount: li.price_data.unit_amount,
      currency: li.price_data.currency,
      product: { name: li.price_data.product_data.name, metadata: li.price_data.product_data.metadata ?? {} },
    },
  }))
}
