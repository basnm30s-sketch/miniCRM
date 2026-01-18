import { z } from 'zod'

export const vehicleSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  vehicleType: z.string().optional().nullable(),
  make: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  year: z.number().int().positive().optional().nullable(),
  color: z.string().optional().nullable(),
  purchasePrice: z.number().nonnegative().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  currentValue: z.number().nonnegative().optional().nullable(),
  insuranceCostMonthly: z.number().nonnegative().optional().nullable(),
  financingCostMonthly: z.number().nonnegative().optional().nullable(),
  odometerReading: z.number().nonnegative().optional().nullable(),
  lastServiceDate: z.string().optional().nullable(),
  nextServiceDue: z.string().optional().nullable(),
  fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid']).optional().nullable(),
  status: z.enum(['active', 'maintenance', 'sold', 'retired']).optional().nullable(),
  registrationExpiry: z.string().optional().nullable(),
  insuranceExpiry: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  basePrice: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type VehicleFormValues = z.infer<typeof vehicleSchema>
