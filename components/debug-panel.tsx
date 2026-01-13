'use client'

import { useState, useEffect } from 'react'
import { X, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { checkApiHealth } from '@/lib/api-client'

interface DebugInfo {
  serverStatus: 'healthy' | 'unhealthy' | 'checking' | 'unknown'
  lastError: string | null
  navigationHistory: Array<{ timestamp: string; from: string; to: string; label: string }>
  rendererInfo: {
    userAgent: string
    platform: string
    language: string
  }
}

export function DebugPanel({ onClose }: { onClose: () => void }) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    serverStatus: 'unknown',
    lastError: null,
    navigationHistory: [],
    rendererInfo: {
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
      platform: typeof window !== 'undefined' ? window.navigator.platform : 'N/A',
      language: typeof window !== 'undefined' ? window.navigator.language : 'N/A',
    },
  })

  useEffect(() => {
    // Check server health
    const checkHealth = async () => {
      setDebugInfo(prev => ({ ...prev, serverStatus: 'checking' }))
      try {
        const isHealthy = await checkApiHealth()
        setDebugInfo(prev => ({
          ...prev,
          serverStatus: isHealthy ? 'healthy' : 'unhealthy',
        }))
      } catch (error) {
        setDebugInfo(prev => ({
          ...prev,
          serverStatus: 'unhealthy',
        }))
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Listen for navigation events (stored in sessionStorage or memory)
  useEffect(() => {
    const storedHistory = sessionStorage.getItem('navigationHistory')
    if (storedHistory) {
      try {
        const history = JSON.parse(storedHistory)
        setDebugInfo(prev => ({
          ...prev,
          navigationHistory: history.slice(-10), // Last 10 navigations
        }))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Listen for errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setDebugInfo(prev => ({
        ...prev,
        lastError: `${event.message} (${event.filename}:${event.lineno})`,
      }))
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setDebugInfo(prev => ({
        ...prev,
        lastError: `Unhandled Promise Rejection: ${event.reason}`,
      }))
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const getStatusIcon = () => {
    switch (debugInfo.serverStatus) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'checking':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (debugInfo.serverStatus) {
      case 'healthy':
        return 'Server is healthy'
      case 'unhealthy':
        return 'Server is not responding'
      case 'checking':
        return 'Checking server status...'
      default:
        return 'Unknown status'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Debug Panel</CardTitle>
              <CardDescription>System diagnostics and error information</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Server Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">API Server Status</h3>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm">{getStatusText()}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setDebugInfo(prev => ({ ...prev, serverStatus: 'checking' }))
                  try {
                    const isHealthy = await checkApiHealth()
                    setDebugInfo(prev => ({
                      ...prev,
                      serverStatus: isHealthy ? 'healthy' : 'unhealthy',
                    }))
                  } catch {
                    setDebugInfo(prev => ({ ...prev, serverStatus: 'unhealthy' }))
                  }
                }}
                className="ml-auto"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Last Error */}
          {debugInfo.lastError && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Last Error</h3>
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs font-mono">
                {debugInfo.lastError}
              </div>
            </div>
          )}

          {/* Navigation History */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Recent Navigation</h3>
            {debugInfo.navigationHistory.length > 0 ? (
              <div className="space-y-1">
                {debugInfo.navigationHistory.map((nav, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-muted rounded text-xs flex items-center justify-between"
                  >
                    <span>
                      {nav.from} → {nav.to}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {new Date(nav.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No navigation history available</p>
            )}
          </div>

          {/* Renderer Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Renderer Information</h3>
            <div className="p-2 bg-muted rounded text-xs space-y-1">
              <div>
                <span className="font-semibold">Platform:</span> {debugInfo.rendererInfo.platform}
              </div>
              <div>
                <span className="font-semibold">Language:</span> {debugInfo.rendererInfo.language}
              </div>
              <div className="break-all">
                <span className="font-semibold">User Agent:</span>{' '}
                {debugInfo.rendererInfo.userAgent}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload()
                }
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook to open debug panel with keyboard shortcut
export function useDebugPanel() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+D to open debug panel
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault()
        setIsOpen(true)
      }
      // Escape to close
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }
}





