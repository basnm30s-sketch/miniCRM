import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle, getVehicleProfitability, getAllVehicleTransactions, createVehicleTransaction } from '@/actions/vehicles'
import type { Vehicle } from '@/lib/types'

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
    mutationFn: createVehicle,
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
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) =>
      updateVehicle(id, data),
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
    mutationFn: deleteVehicle,
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
    mutationFn: createVehicleTransaction,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', variables.vehicleId, 'transactions'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', variables.vehicleId, 'profitability'] })
    },
  })
}
