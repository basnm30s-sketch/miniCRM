"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteSchema = exports.quoteLineItemSchema = void 0;
const zod_1 = require("zod");
exports.quoteLineItemSchema = zod_1.z.object({
    vehicleTypeId: zod_1.z.string().min(1, 'Vehicle type is required'),
    vehicleTypeLabel: zod_1.z.string().min(1, 'Vehicle type label is required'),
    vehicleNumber: zod_1.z.string().optional().nullable(),
    description: zod_1.z.string().optional().nullable(),
    rentalBasis: zod_1.z.enum(['hourly', 'monthly']).optional().nullable(),
    quantity: zod_1.z.number().int().positive('Quantity must be positive'),
    unitPrice: zod_1.z.number().nonnegative('Unit price must be non-negative'),
    taxPercent: zod_1.z.number().min(0).max(100).default(0),
});
exports.quoteSchema = zod_1.z.object({
    customerId: zod_1.z.string().uuid('Invalid customer ID'),
    items: zod_1.z.array(exports.quoteLineItemSchema).min(1, 'At least one item is required'),
    validUntil: zod_1.z.string().optional().nullable(),
    terms: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
