import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/actions/customers'
import type { Customer, NewCustomer } from '@/lib/types'

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
    mutationFn: createCustomer,
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
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      updateCustomer(id, data),
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
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
