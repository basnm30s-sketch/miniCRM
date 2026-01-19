import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice } from '@/actions/invoices'
import type { Invoice } from '@/lib/types'

/**
 * Hook to fetch all invoices
 */
export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: getAllInvoices,
    retry: 1, // Retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    // Return empty array on error instead of throwing
    throwOnError: false,
    // Provide default value to prevent undefined errors
    placeholderData: [],
  })
}

/**
 * Hook to fetch a single invoice by ID
 */
export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => id ? getInvoiceById(id) : null,
    enabled: !!id,
  })
}

/**
 * Hook to create a new invoice
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

/**
 * Hook to update an existing invoice
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Invoice> }) =>
      updateInvoice(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', variables.id] })
    },
  })
}

/**
 * Hook to delete an invoice
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
