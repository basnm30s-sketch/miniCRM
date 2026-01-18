import { z } from 'zod'

export const quoteLineItemSchema = z.object({
  vehicleTypeId: z.string().min(1, 'Vehicle type is required'),
  vehicleTypeLabel: z.string().min(1, 'Vehicle type label is required'),
  vehicleNumber: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  rentalBasis: z.enum(['hourly', 'monthly']).optional().nullable(),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  taxPercent: z.number().min(0).max(100).default(0),
})

export const quoteSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  items: z.array(quoteLineItemSchema).min(1, 'At least one item is required'),
  validUntil: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type QuoteFormValues = z.infer<typeof quoteSchema>
export type QuoteLineItemFormValues = z.infer<typeof quoteLineItemSchema>
