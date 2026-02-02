import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllQuotes, getQuoteById, saveQuote, deleteQuote } from '@/lib/api-client'
import type { Quote } from '@/lib/types'

const toErrorResult = (error: unknown) => ({
  success: false as const,
  error: error instanceof Error ? error.message : 'Request failed',
})

/**
 * Hook to fetch all quotes
 */
export function useQuotes() {
  return useQuery({
    queryKey: ['quotes'],
    queryFn: getAllQuotes,
  })
}

/**
 * Hook to fetch a single quote by ID
 */
export function useQuote(id: string | null) {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: () => id ? getQuoteById(id) : null,
    enabled: !!id,
  })
}

/**
 * Hook to create a new quote
 */
export function useCreateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Quote) => {
      try {
        await saveQuote(data)
        return { success: true as const }
      } catch (error) {
        return toErrorResult(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
    },
  })
}

/**
 * Hook to update an existing quote
 */
export function useUpdateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Quote> }) => {
      try {
        await saveQuote({ id, ...data })
        return { success: true as const }
      } catch (error) {
        return toErrorResult(error)
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['quotes', variables.id] })
    },
  })
}

/**
 * Hook to delete a quote
 */
export function useDeleteQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await deleteQuote(id)
        return { success: true as const }
      } catch (error) {
        return toErrorResult(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
    },
  })
}
