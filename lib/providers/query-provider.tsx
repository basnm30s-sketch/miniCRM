'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

function QueryEventBridge({ queryClient }: { queryClient: QueryClient }) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleAdminSettingsUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] })
    }

    const handleDataUpdated = (event: Event) => {
      const e = event as CustomEvent<{ entity?: string }>
      const entity = e?.detail?.entity
      if (!entity) return
      queryClient.invalidateQueries({ queryKey: [entity] })
    }

    window.addEventListener('adminSettingsUpdated', handleAdminSettingsUpdated)
    window.addEventListener('dataUpdated', handleDataUpdated)

    return () => {
      window.removeEventListener('adminSettingsUpdated', handleAdminSettingsUpdated)
      window.removeEventListener('dataUpdated', handleDataUpdated)
    }
  }, [queryClient])

  return null
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <QueryEventBridge queryClient={queryClient} />
      {children}
    </QueryClientProvider>
  )
}
