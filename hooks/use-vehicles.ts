import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllVehicles, getVehicleById, saveVehicle, deleteVehicle, getVehicleProfitability, getAllVehicleTransactions, saveVehicleTransaction } from '@/lib/api-client'
import type { Vehicle } from '@/lib/types'

const toErrorResult = (error: unknown) => ({
  success: false as const,
  error: error instanceof Error ? error.message : 'Request failed',
})

/**
 * Hook to fetch all vehicles
 */
export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: getAllVehicles,
  })
}

/**
 * Hook to fetch a single vehicle by ID
 */
export function useVehicle(id: string | null) {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => id ? getVehicleById(id) : null,
    enabled: !!id,
  })
}

/**
 * Hook to fetch vehicle profitability
 */
export function useVehicleProfitability(vehicleId: string | null) {
  return useQuery({
    queryKey: ['vehicles', vehicleId, 'profitability'],
    queryFn: () => vehicleId ? getVehicleProfitability(vehicleId) : null,
    enabled: !!vehicleId,
  })
}

/**
 * Hook to fetch vehicle transactions
 */
export function useVehicleTransactions(vehicleId?: string, month?: string) {
  return useQuery({
    queryKey: ['vehicles', vehicleId, 'transactions', month],
    queryFn: () => getAllVehicleTransactions(vehicleId, month),
  })
}

/**
 * Hook to create a new vehicle
 */
export function useCreateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Vehicle) => {
      try {
        await saveVehicle(data)
        return { success: true as const }
      } catch (error) {
        return toErrorResult(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })
}

/**
 * Hook to update an existing vehicle
 */
export function useUpdateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Vehicle> }) => {
      try {
        await saveVehicle({ id, ...data })
        return { success: true as const }
      } catch (error) {
        return toErrorResult(error)
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', variables.id, 'profitability'] })
    },
  })
}

/**
 * Hook to delete a vehicle
 */
export function useDeleteVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await deleteVehicle(id)
        return { success: true as const }
      } catch (error) {
        return toErrorResult(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })
}

/**
 * Hook to create a vehicle transaction
 */
export function useCreateVehicleTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { vehicleId: string } & Record<string, any>) => {
      try {
        await saveVehicleTransaction(data)
        return { success: true as const }
      } catch (error) {
        return toErrorResult(error)
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', variables.vehicleId, 'transactions'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', variables.vehicleId, 'profitability'] })
    },
  })
}
