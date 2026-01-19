"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceSchema = exports.invoiceLineItemSchema = void 0;
const zod_1 = require("zod");
exports.invoiceLineItemSchema = zod_1.z.object({
    description: zod_1.z.string().min(1, 'Description is required'),
    quantity: zod_1.z.number().int().positive('Quantity must be positive'),
    unitPrice: zod_1.z.number().nonnegative('Unit price must be non-negative'),
    taxPercent: zod_1.z.number().min(0).max(100).default(0),
    vehicleTypeId: zod_1.z.string().optional().nullable(),
    vehicleTypeLabel: zod_1.z.string().optional().nullable(),
    vehicleNumber: zod_1.z.string().optional().nullable(),
    rentalBasis: zod_1.z.enum(['hourly', 'monthly']).optional().nullable(),
});
exports.invoiceSchema = zod_1.z.object({
    customerId: zod_1.z.string().uuid('Invalid customer ID').optional().nullable(),
    vendorId: zod_1.z.string().uuid('Invalid vendor ID').optional().nullable(),
    date: zod_1.z.string().min(1, 'Date is required'),
    dueDate: zod_1.z.string().optional().nullable(),
    items: zod_1.z.array(exports.invoiceLineItemSchema).min(1, 'At least one item is required'),
    status: zod_1.z.enum(['draft', 'invoice_sent', 'payment_received']).optional(),
    notes: zod_1.z.string().optional().nullable(),
    terms: zod_1.z.string().optional().nullable(),
});
