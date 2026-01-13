'use client'

import { Sidebar } from './sidebar'
import { ErrorBoundary } from './error-boundary'
import { DebugPanel, useDebugPanel } from './debug-panel'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useDebugPanel()
  
  // Sidebar always visible like in inspiration design
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      {isOpen && <DebugPanel onClose={close} />}
    </div>
  )
}
