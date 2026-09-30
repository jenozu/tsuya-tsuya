import { z } from 'zod'
import { STANDARD_PRINT_SIZES } from './print-sizes.ts'

const currency = z.number().finite().nonnegative().max(1_000_000)
  .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
    'Prices must use at most two decimal places')
const positiveCurrency = currency.refine(value => value >= 0.01, 'Size price must be positive')
const text = (max: number) => z.string().trim().min(1).max(max)

const supportedLabels = new Set<string>(STANDARD_PRINT_SIZES)
export const productSizesSchema = z.array(z.object({
  label: z.string().refine(value => supportedLabels.has(value), 'Unsupported print size'),
  price: positiveCurrency,
  cost: currency.optional(),
  available: z.boolean().optional(),
}).strict()).max(STANDARD_PRINT_SIZES.length).superRefine((sizes, ctx) => {
  const seen = new Set<string>()
  for (const [index, size] of sizes.entries()) {
    if (seen.has(size.label)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate print size', path: [index, 'label'] })
    }
    seen.add(size.label)
  }
})

function safeImageUrl(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

export function validProductImageField(value: string): boolean {
  if (!value || value.length > 32_000) return false
  if (!value.startsWith('[')) return value.length <= 2_048 && safeImageUrl(value)

  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) && parsed.length > 0 && parsed.length <= 20 &&
      parsed.every(item => typeof item === 'string' && item.length <= 2_048 && safeImageUrl(item))
  } catch {
    return false
  }
}

const fields = z.object({
  name: text(200).optional(),
  description: z.string().max(10_000).optional(),
  price: currency.optional(),
  cost: currency.nullish(),
  category: text(120).optional(),
  image_url: z.string().refine(validProductImageField, 'Invalid product image source').optional(),
  imageUrl: z.string().refine(validProductImageField, 'Invalid product image source').optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  product_type: z.enum(['1-piece', '2-piece', '3-piece']).nullish(),
  sizes: productSizesSchema.optional(),
}).strict()

export const createProductSchema = fields.extend({
  name: text(200),
  category: text(120),
  price: currency,
}).superRefine((product, ctx) => {
  if (product.price === 0 && (!product.sizes || product.sizes.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide a positive base price or priced sizes', path: ['price'] })
  }
  if (product.image_url && product.imageUrl && product.image_url !== product.imageUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Conflicting image sources', path: ['image_url'] })
  }
})

export const updateProductSchema = fields.superRefine((input, ctx) => {
  if (!Object.values(input).some(value => value !== undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'No fields were supplied' })
  }
  if (input.image_url && input.imageUrl && input.image_url !== input.imageUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Conflicting image sources', path: ['image_url'] })
  }
})

export function normalizedProductFields<T extends {
  image_url?: string
  imageUrl?: string
}>(fields: T): Omit<T, 'imageUrl'> {
  const { imageUrl, ...clean } = fields
  return { ...clean, ...(clean.image_url === undefined && imageUrl !== undefined ? { image_url: imageUrl } : {}) }
}
