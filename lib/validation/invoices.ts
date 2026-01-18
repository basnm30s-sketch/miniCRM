import { z } from 'zod'

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  taxPercent: z.number().min(0).max(100).default(0),
  vehicleTypeId: z.string().optional().nullable(),
  vehicleTypeLabel: z.string().optional().nullable(),
  vehicleNumber: z.string().optional().nullable(),
  rentalBasis: z.enum(['hourly', 'monthly']).optional().nullable(),
})

export const invoiceSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional().nullable(),
  vendorId: z.string().uuid('Invalid vendor ID').optional().nullable(),
  date: z.string().min(1, 'Date is required'),
  dueDate: z.string().optional().nullable(),
  items: z.array(invoiceLineItemSchema).min(1, 'At least one item is required'),
  status: z.enum(['draft', 'invoice_sent', 'payment_received']).optional(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
})

export type InvoiceFormValues = z.infer<typeof invoiceSchema>
export type InvoiceLineItemFormValues = z.infer<typeof invoiceLineItemSchema>
