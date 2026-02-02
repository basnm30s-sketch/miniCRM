import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllCustomers, saveCustomer, deleteCustomer } from '@/lib/api-client'
import type { Customer, NewCustomer } from '@/lib/types'

const toErrorResult = (error: unknown) => ({
  success: false as const,
  error: error instanceof Error ? error.message : 'Request failed',
})

/**
 * Hook to fetch all customers
 */
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: getAllCustomers,
  })
}

/**
 * Hook to create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: NewCustomer) => {
      try {
        await saveCustomer(data, false)
        return { success: true as const }
      } catch (error) {
        return toErrorResult(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

/**
 * Hook to update an existing customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      try {
        await saveCustomer({ id, ...data }, true)
        return { success: true as const }
      } catch (error) {
        return toErrorResult(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

/**
 * Hook to delete a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await deleteCustomer(id)
        return { success: true as const }
      } catch (error) {
        return toErrorResult(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
