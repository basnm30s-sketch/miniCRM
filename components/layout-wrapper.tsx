'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { ErrorBoundary } from './error-boundary'
import { DebugPanel, useDebugPanel } from './debug-panel'
import { useIsMobile } from '@/components/ui/use-mobile'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useDebugPanel()
  const isMobile = useIsMobile()
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    // Default to expanded on desktop, collapsed on mobile
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768
    }
    return true
  })

  // Update sidebar state when screen size changes
  useEffect(() => {
    if (isMobile) {
      setSidebarExpanded(false)
    } else {
      // On desktop, default to expanded
      setSidebarExpanded(true)
    }
  }, [isMobile])

  // Handle ESC key to collapse sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sidebarExpanded) {
        setSidebarExpanded(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarExpanded])

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => !prev)
  }

  const handleClose = () => {
    if (isMobile) {
      setSidebarExpanded(false)
    }
  }

  return (
    <div className="flex min-h-screen relative">
      {/* Mobile Overlay */}
      {isMobile && sidebarExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        isExpanded={sidebarExpanded} 
        onToggle={toggleSidebar}
        onClose={handleClose}
      />

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarExpanded ? 'ml-64' : 'ml-16'
        }`}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      {isOpen && <DebugPanel onClose={close} />}
    </div>
  )
}
