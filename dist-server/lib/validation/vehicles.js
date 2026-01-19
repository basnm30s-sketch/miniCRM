"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehicleSchema = void 0;
const zod_1 = require("zod");
exports.vehicleSchema = zod_1.z.object({
    vehicleNumber: zod_1.z.string().min(1, 'Vehicle number is required'),
    vehicleType: zod_1.z.string().optional().nullable(),
    make: zod_1.z.string().optional().nullable(),
    model: zod_1.z.string().optional().nullable(),
    year: zod_1.z.number().int().positive().optional().nullable(),
    color: zod_1.z.string().optional().nullable(),
    purchasePrice: zod_1.z.number().nonnegative().optional().nullable(),
    purchaseDate: zod_1.z.string().optional().nullable(),
    currentValue: zod_1.z.number().nonnegative().optional().nullable(),
    insuranceCostMonthly: zod_1.z.number().nonnegative().optional().nullable(),
    financingCostMonthly: zod_1.z.number().nonnegative().optional().nullable(),
    odometerReading: zod_1.z.number().nonnegative().optional().nullable(),
    lastServiceDate: zod_1.z.string().optional().nullable(),
    nextServiceDue: zod_1.z.string().optional().nullable(),
    fuelType: zod_1.z.enum(['petrol', 'diesel', 'electric', 'hybrid']).optional().nullable(),
    status: zod_1.z.enum(['active', 'maintenance', 'sold', 'retired']).optional().nullable(),
    registrationExpiry: zod_1.z.string().optional().nullable(),
    insuranceExpiry: zod_1.z.string().optional().nullable(),
    description: zod_1.z.string().optional().nullable(),
    basePrice: zod_1.z.number().nonnegative().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
