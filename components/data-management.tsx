"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Upload, Trash2 } from "lucide-react"

export default function DataManagement() {
  const [importSuccess, setImportSuccess] = useState(false)
  const [syncTime, setSyncTime] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Set sync time only on client to avoid hydration mismatch
    setSyncTime(new Date().toLocaleString())
  }, [])

  const handleExport = () => {
    // Export all quotes as JSON
    const quotes = localStorage.getItem('quotes') || '[]'
    const dataStr = JSON.stringify({ quotes: JSON.parse(quotes) }, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `almsar-quotes-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = JSON.parse(e.target?.result as string)
        if (data.quotes) {
          localStorage.setItem('quotes', JSON.stringify(data.quotes))
          setImportSuccess(true)
          setTimeout(() => setImportSuccess(false), 3000)
          window.location.reload()
        }
      }
      reader.readAsText(file)
    } catch (err) {
      console.error('Failed to import:', err)
    }
  }

  const handleClear = () => {
    if (window.confirm('Are you sure you want to delete all data? This cannot be undone.')) {
      localStorage.removeItem('quotes')
      localStorage.removeItem('customers')
      localStorage.removeItem('vehicles')
      window.location.reload()
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Storage Statistics</CardTitle>
          <CardDescription>Current data stored locally</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Quotes</p>
              <p className="text-2xl font-bold text-foreground">N/A</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customers</p>
              <p className="text-2xl font-bold text-foreground">N/A</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vehicles</p>
              <p className="text-2xl font-bold text-foreground">N/A</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Size</p>
              <p className="text-2xl font-bold text-foreground">N/A</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Last synced: {syncTime || '-'}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Export, import, or clear your data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Export Data</p>
              <p className="text-xs text-muted-foreground mb-3">Download all your data as a JSON file for backup</p>
              <Button
                onClick={handleExport}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full"
              >
                <Download className="w-4 h-4" />
                Export as JSON
              </Button>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Import Data</p>
              <p className="text-xs text-muted-foreground mb-3">Restore data from a previously exported JSON file</p>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
              <Button
                onClick={handleImportClick}
                variant="outline"
                className="border-border gap-2 w-full bg-transparent"
              >
                <Upload className="w-4 h-4" />
                Import from JSON
              </Button>
              {importSuccess && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">Data imported successfully!</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Clear All Data</p>
              <p className="text-xs text-muted-foreground mb-3">
                Permanently delete all stored data (cannot be undone)
              </p>
              <Button
                onClick={handleClear}
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 gap-2 w-full bg-transparent"
              >
                <Trash2 className="w-4 h-4" />
                Delete All Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
