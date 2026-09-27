import { z } from 'zod'

/**
 * Shared client/server field shape. Business-specific destination allowlists,
 * province/postal verification and final tax rules remain separate approvals.
 */
export const checkoutEmailSchema = z.string().trim().email('Invalid email address').max(254)

export const shippingAddressSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  address: z.string().trim().min(3, 'Street address is too short').max(200),
  addressLine2: z.string().max(100).optional(),
  unitNumber: z.string().max(30).optional(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(3).max(30),
  country: z.string().trim().regex(/^[A-Za-z]{2}$/, 'Use a two-letter country code'),
  phone: z.string().max(30).optional(),
})

export const checkoutRequestSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1).max(100),
    quantity: z.number().int().min(1).max(20),
    sizeLabel: z.string().max(100).optional(),
  })).min(1).max(30),
  subtotal: z.number().finite().nonnegative(),
  shipping: z.number().finite().nonnegative(),
  tax: z.number().finite().nonnegative(),
  email: checkoutEmailSchema,
  shipping_address: shippingAddressSchema,
})
