import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllQuotes, getQuoteById, createQuote, updateQuote, deleteQuote } from '@/actions/quotes'
import type { Quote } from '@/lib/types'

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
    mutationFn: createQuote,
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
    mutationFn: ({ id, data }: { id: string; data: Partial<Quote> }) =>
      updateQuote(id, data),
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
    mutationFn: deleteQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
    },
  })
}
