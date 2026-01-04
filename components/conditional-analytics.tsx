'use client'

import { Analytics } from '@vercel/analytics/next'

export function ConditionalAnalytics() {
  // Only render Analytics when NOT in Electron
  // In Electron, window.electronAPI is exposed by preload script
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined

  if (isElectron) {
    return null
  }

  return <Analytics />
}

