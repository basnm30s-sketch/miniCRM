import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAdminSettings } from '@/lib/storage'
import type { AdminSettings } from '@/lib/types'

const ADMIN_SETTINGS_QUERY_KEY = ['adminSettings'] as const

function toBool(value: unknown, defaultValue: boolean): boolean {
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false
  return defaultValue
}

function normalizeAdminSettings(settings: AdminSettings): AdminSettings {
  return {
    ...settings,
    showQuotationsTwoPane: toBool(settings.showQuotationsTwoPane, true),
    showInvoicesTwoPane: toBool(settings.showInvoicesTwoPane, true),
    showPurchaseOrdersTwoPane: toBool(settings.showPurchaseOrdersTwoPane, true),
  }
}

export function useAdminSettings() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ADMIN_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const settings = await getAdminSettings()
      if (!settings) return null
      return normalizeAdminSettings(settings)
    },
    // If we already have cached settings, use them immediately to avoid UI flicker.
    initialData: () => queryClient.getQueryData<AdminSettings | null>(ADMIN_SETTINGS_QUERY_KEY),
    staleTime: 30_000,
    retry: 1,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleSettingsUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_QUERY_KEY })
    }

    window.addEventListener('adminSettingsUpdated', handleSettingsUpdated)
    return () => window.removeEventListener('adminSettingsUpdated', handleSettingsUpdated)
  }, [queryClient])

  return query
}
