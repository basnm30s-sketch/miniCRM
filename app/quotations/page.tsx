'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import QuoteForm from '@/app/quotations/QuoteForm'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Trash2,
  Plus,
  FileText,
  Edit3,
  ChevronDown,
  Share2,
  Download,
  FileSpreadsheet,
  File as FileIcon
} from 'lucide-react'
import { useQuotes, useDeleteQuote } from '@/hooks/use-quotes'
import { getAdminSettings } from '@/lib/storage'
import { useAdminSettings } from '@/hooks/use-admin-settings'
import { ClientSidePDFRenderer } from '@/lib/pdf'
import { excelRenderer } from '@/lib/excel'
import { docxRenderer } from '@/lib/docx'
import type { Quote, AdminSettings } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TwoPaneListHeader } from '@/components/TwoPaneListHeader'
import { ReadOnlyLineItemsTable } from '@/components/doc-generator/ReadOnlyLineItemsTable'
import { DEFAULT_QUOTE_COLUMNS } from '@/lib/doc-generator/line-item-columns'

export default function QuotationsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: quotes = [], isLoading: loading, error: quotesError } = useQuotes()
  const deleteMutation = useDeleteQuote()
  const { data: adminSettings, isLoading: settingsLoading } = useAdminSettings()
  
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [showTerms, setShowTerms] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const useTwoPane = useMemo(() => {
    // Backward-compatible default: true when unset
    return adminSettings?.showQuotationsTwoPane !== false
  }, [adminSettings?.showQuotationsTwoPane])

  useEffect(() => {
    if (!useTwoPane) return
    if (quotes.length === 0) return

    setSelectedQuote((prev) => {
      if (prev && quotes.some((q) => q.id === prev.id)) return prev
      return quotes[0]
    })
  }, [useTwoPane, quotes])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const result = await deleteMutation.mutateAsync(deleteId)
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete quotation',
          variant: 'destructive',
        })
        return
      }
      
      // Clear selection if deleted quote was selected
      const updatedQuotes = quotes.filter((q) => q.id !== deleteId)
      if (selectedQuote?.id === deleteId) {
        setSelectedQuote(updatedQuotes.length > 0 ? updatedQuotes[0] : null)
        setIsEditing(false)
      }
      toast({ title: 'Deleted', description: 'Quotation deleted successfully' })
      setDeleteId(null)
    } catch (error: any) {
      console.error('Error deleting quote:', error)
      toast({ title: 'Error', description: error?.message || 'Failed to delete quotation', variant: 'destructive' })
    }
  }

  const handleDownloadPDF = async (quote: Quote) => {
    try {
      const adminSettings = await getAdminSettings()
      if (!adminSettings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }

      // Load persisted column preferences (per-quote, fallback to global)
      let visibleColumns: Record<string, boolean> | undefined
      if (typeof window !== 'undefined') {
        // Try per-quote setting first
        const perQuoteKey = `quote-visible-columns-${quote.id}`
        let stored = localStorage.getItem(perQuoteKey)

        // Fallback to global if no per-quote setting
        if (!stored) {
          stored = localStorage.getItem('quote-visible-columns-global')
        }

        if (stored) {
          try {
            const parsed = JSON.parse(stored)

            if (!parsed || typeof parsed !== 'object') return null

            const validated: Record<string, boolean> = {}

            for (const [key, val] of Object.entries(parsed)) {
              if (typeof key === 'string' && typeof val === 'boolean') {
                console.warn('Visile column:', key, val)
                validated[key] = val
              }
            }

            if (parsed && typeof parsed === 'object') {
              visibleColumns = parsed
            }
          } catch {
            // ignore invalid stored data
          }
        }
      }


      const pdfRenderer = new ClientSidePDFRenderer()
      const blob = await pdfRenderer.renderQuoteToPdf(quote, adminSettings, { visibleColumns })
      pdfRenderer.downloadPdf(blob, `quote-${quote.number}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' })
    }
  }

  const handleDownloadExcel = async (quote: Quote) => {
    try {
      const adminSettings = await getAdminSettings()
      if (!adminSettings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }

      // Load persisted column preferences (per-quote, fallback to global)
      let visibleColumns: Record<string, boolean> | undefined
      if (typeof window !== 'undefined') {
        const perQuoteKey = `quote-visible-columns-${quote.id}`
        let stored = localStorage.getItem(perQuoteKey)

        if (!stored) {
          stored = localStorage.getItem('quote-visible-columns-global')
        }

        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (parsed && typeof parsed === 'object') {
              visibleColumns = parsed
            }
          } catch {
            // ignore invalid stored data
          }
        }
      }

      const blob = await excelRenderer.renderQuoteToExcel(quote, adminSettings, { visibleColumns })
      excelRenderer.downloadExcel(blob, `quote-${quote.number}.xlsx`)
      toast({ title: 'Success', description: 'Excel file downloaded successfully' })
    } catch (error) {
      console.error('Error generating Excel:', error)
      toast({ title: 'Error', description: 'Failed to generate Excel file', variant: 'destructive' })
    }
  }

  const handleDownloadDocx = async (quote: Quote) => {
    try {
      const adminSettings = await getAdminSettings()
      if (!adminSettings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }

      const blob = await docxRenderer.renderQuoteToDocx(quote, adminSettings)
      docxRenderer.downloadDocx(blob, `quote-${quote.number}.docx`)
      toast({ title: 'Success', description: 'Word document downloaded successfully' })
    } catch (error) {
      console.error('Error generating DOCX:', error)
      toast({ title: 'Error', description: 'Failed to generate Word document', variant: 'destructive' })
    }
  }


  const handleCreateInvoice = (quote: Quote) => {
    try {
      // Validate quote has customer and items
      if (!quote.customer || !quote.customer.id) {
        toast({
          title: 'Error',
          description: 'Quote must have a customer to create an invoice',
          variant: 'destructive',
        })
        return
      }

      if (!quote.items || quote.items.length === 0) {
        toast({
          title: 'Error',
          description: 'Quote must have at least one item to create an invoice',
          variant: 'destructive',
        })
        return
      }

      // Navigate to invoice create page with quoteId
      router.push(`/invoices/create?quoteId=${quote.id}`)
    } catch (error) {
      console.error('Error creating invoice from quote:', error)
      toast({
        title: 'Error',
        description: 'Failed to create invoice from quote',
        variant: 'destructive',
      })
    }
  }

  const handleQuoteSave = (savedQuote: Quote) => {
    setSelectedQuote(savedQuote)
    setIsEditing(false)
    queryClient.invalidateQueries({ queryKey: ['quotes'] })
  }

  // Helper functions for table display
  const getValidUntilStatus = (validUntil?: string) => {
    if (!validUntil) return { status: 'none', label: 'N/A', days: null }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(validUntil)
    expiry.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { status: 'expired', label: 'Expired', days: Math.abs(diffDays) }
    if (diffDays <= 7) return { status: 'expiring', label: `Expires in ${diffDays} days`, days: diffDays }
    return { status: 'valid', label: validUntil, days: diffDays }
  }

  const formatCurrency = (amount: number) => `AED ${amount.toFixed(2)}`

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      expired: 'bg-red-100 text-red-700 border-red-300',
      expiring: 'bg-orange-100 text-orange-700 border-orange-300',
      valid: 'bg-green-100 text-green-700 border-green-300',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300'
  }

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-slate-500 animate-pulse">Loading quotations...</div>
      </div>
    )
  }

  if (quotesError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-red-500">Error loading quotations: {quotesError.message}</div>
      </div>
    )
  }

  // List-only view (table)
  if (!useTwoPane) {
    return (
      <div className="p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Quotations</h1>
            <p className="text-slate-500">Manage and track your customer quotations</p>
          </div>
          <Link href="/quotes/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              New Quotation
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Quotations ({quotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.length > 0 ? (
                    quotes.map((quote) => {
                      const vehicleTypes = quote.items.map((item) => item.vehicleTypeLabel).filter(Boolean)
                      const uniqueVehicles = [...new Set(vehicleTypes)].join(', ')
                      const validUntilStatus = getValidUntilStatus(quote.validUntil)
                      const customerTooltip = [
                        quote.customer?.name || 'N/A',
                        quote.customer?.company && `Company: ${quote.customer.company}`,
                        quote.customer?.email && `Email: ${quote.customer.email}`,
                        quote.customer?.phone && `Phone: ${quote.customer.phone}`,
                        quote.customer?.address && `Address: ${quote.customer.address}`
                      ].filter(Boolean).join('\n')
                      
                      return (
                        <TableRow key={quote.id}>
                          <TableCell className="font-mono text-sm font-medium text-slate-900">
                            {quote.number}
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="max-w-[200px]">
                                    <div className="font-medium text-slate-900 truncate">
                                      {quote.customer?.name || 'Unknown Customer'}
                                    </div>
                                    {quote.customer?.company && (
                                      <div className="text-xs text-slate-500 truncate mt-0.5">
                                        {quote.customer.company}
                                      </div>
                                    )}
                                    {uniqueVehicles && (
                                      <div className="text-xs text-slate-400 mt-1">{uniqueVehicles}</div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="whitespace-pre-line max-w-xs">
                                  {customerTooltip}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-slate-600">{quote.date}</TableCell>
                          <TableCell>
                            {validUntilStatus.status === 'none' ? (
                              <span className="text-slate-400 text-sm">N/A</span>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${getStatusBadgeColor(validUntilStatus.status)}`}
                                    >
                                      {validUntilStatus.label}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {validUntilStatus.status === 'expired' 
                                      ? `Expired ${validUntilStatus.days} days ago`
                                      : validUntilStatus.status === 'expiring'
                                      ? `Expires in ${validUntilStatus.days} days`
                                      : `Valid until ${quote.validUntil}`
                                    }
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {quote.items.length} {quote.items.length === 1 ? 'item' : 'items'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {formatCurrency(quote.subTotal)}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {formatCurrency(quote.totalTax)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-900">
                            {formatCurrency(quote.total)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/quotes/create?id=${quote.id}`)}
                                className="h-8 w-8 p-0"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Download">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleDownloadPDF(quote)}>
                                    <FileText className="w-4 h-4 mr-2 text-red-500" />
                                    PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadExcel(quote)}>
                                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                                    Excel
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadDocx(quote)}>
                                    <FileIcon className="w-4 h-4 mr-2 text-blue-600" />
                                    Word
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(quote.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                        No quotations yet. <Link href="/quotes/create" className="text-blue-600 hover:underline">Create your first quotation</Link>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Quotation?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this quotation? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Quote
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // Two-pane view (existing)
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
          <p className="text-sm text-slate-500">Manage and track your customer quotations</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane - List View */}
        <div className="w-[380px] border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
          <TwoPaneListHeader
            title="All Quotations"
            count={quotes.length}
            action={
              <Link href="/quotes/create">
                <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New Quotation
                </Button>
              </Link>
            }
          />

          <div className="divide-y divide-slate-100">
            {quotes.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p className="text-sm">No quotations found.</p>
                <Link href="/quotes/create" className="text-blue-600 hover:underline mt-2 text-sm inline-block">
                  Create your first quotation
                </Link>
              </div>
            ) : (
              quotes.map((quote) => {
                const vehicleTypes = quote.items.map((item) => item.vehicleTypeLabel).filter(Boolean)
                const uniqueVehicles = [...new Set(vehicleTypes)].join(', ')
                const isSelected = selectedQuote?.id === quote.id

                return (
                  <div
                    key={quote.id}
                    className={`group px-4 py-3 cursor-pointer transition-all duration-200 border-l-[3px] hover:bg-slate-50 ${isSelected
                      ? 'bg-blue-50/60 border-blue-600'
                      : 'border-transparent hover:border-slate-300'
                      }`}
                    onClick={() => {
                      setSelectedQuote(quote)
                      setIsEditing(false)
                    }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-mono text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                        {quote.number}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        AED {quote.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mb-1">
                      <div className="text-sm text-slate-700 font-medium truncate pr-2">
                        {quote.customer?.name || 'Unknown Customer'}
                      </div>
                      <div className="text-xs text-slate-400 whitespace-nowrap">
                        {quote.date}
                      </div>
                    </div>

                    {uniqueVehicles && (
                      <div className="text-xs text-slate-500 truncate mt-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                        {uniqueVehicles}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Pane - Detail View */}
        <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col">
          {selectedQuote ? (
            isEditing ? (
              <div className="h-full overflow-y-auto bg-white">
                <QuoteForm
                  initialData={selectedQuote}
                  onSave={handleQuoteSave}
                  onCancel={() => setIsEditing(false)}
                />
              </div>
            ) : (
              <>
                {/* Header Actions */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-start shadow-sm z-10">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-slate-900">{selectedQuote.number}</h2>
                      <Badge variant="outline" className="text-slate-600 border-slate-300 font-normal">
                        {selectedQuote.date}
                      </Badge>
                    </div>
                    <p className="text-slate-600 mt-1 font-medium">{selectedQuote.customer?.name || 'N/A'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9">
                          <Download className="w-4 h-4 mr-2 text-slate-500" />
                          Download
                          <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleDownloadPDF(selectedQuote)}>
                          <FileText className="w-4 h-4 mr-2 text-red-500" />
                          PDF Document
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadExcel(selectedQuote)}>
                          <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                          Excel Spreadsheet
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadDocx(selectedQuote)}>
                          <FileIcon className="w-4 h-4 mr-2 text-blue-600" />
                          Word Document
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>


                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => handleCreateInvoice(selectedQuote)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Convert to Invoice
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => setDeleteId(selectedQuote.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>


                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                  {/* Customer Details & Summary Group */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Customer Card */}
                    <Card className="col-span-2 shadow-sm border-slate-200">
                      <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Customer Details</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="block text-slate-500 text-xs mb-1">Customer Name</span>
                          <span className="font-medium text-slate-900">{selectedQuote.customer?.name || 'N/A'}</span>
                        </div>
                        {selectedQuote.customer?.company && (
                          <div>
                            <span className="block text-slate-500 text-xs mb-1">Company</span>
                            <span className="font-medium text-slate-900">{selectedQuote.customer.company}</span>
                          </div>
                        )}
                        {selectedQuote.customer?.email && (
                          <div>
                            <span className="block text-slate-500 text-xs mb-1">Email</span>
                            <span className="text-slate-900">{selectedQuote.customer.email}</span>
                          </div>
                        )}
                        {selectedQuote.customer?.phone && (
                          <div>
                            <span className="block text-slate-500 text-xs mb-1">Phone</span>
                            <span className="text-slate-900">{selectedQuote.customer.phone}</span>
                          </div>
                        )}
                        {selectedQuote.customer?.address && (
                          <div className="col-span-2">
                            <span className="block text-slate-500 text-xs mb-1">Details</span>
                            <span className="text-slate-900">{selectedQuote.customer.address}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Financial Summary */}
                    <Card className="shadow-sm border-slate-200 h-fit">
                      <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 space-y-3">
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Subtotal</span>
                          <span>AED {selectedQuote.subTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Tax</span>
                          <span>AED {selectedQuote.totalTax.toFixed(2)}</span>
                        </div>
                        <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-baseline">
                          <span className="font-semibold text-slate-900">Total</span>
                          <span className="text-xl font-bold text-slate-900">AED {selectedQuote.total.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Line Items - Full Width */}
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
                      <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Line Items</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3">
                      <ReadOnlyLineItemsTable
                        variant="quote"
                        items={selectedQuote.items}
                        visibleColumns={DEFAULT_QUOTE_COLUMNS}
                      />
                    </CardContent>
                  </Card>

                  {/* Additional Info (Terms/Notes) */}
                  {(selectedQuote.terms || selectedQuote.notes) && (
                    <div className="grid grid-cols-1 gap-4">
                      {selectedQuote.notes && (
                        <Card className="shadow-sm border-slate-200">
                          <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Notes</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3">
                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedQuote.notes}</p>
                          </CardContent>
                        </Card>
                      )}

                      {selectedQuote.terms && (
                        <Card className="shadow-sm border-slate-200">
                          <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Terms & Conditions</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3">
                            <div className={`prose prose-sm max-w-none text-slate-600 ${!showTerms ? 'line-clamp-4' : ''}`}
                              dangerouslySetInnerHTML={{ __html: selectedQuote.terms }}
                            />
                            {selectedQuote.terms.length > 200 && (
                              <button
                                className="text-blue-600 hover:text-blue-700 text-xs font-medium mt-2 flex items-center"
                                onClick={() => setShowTerms(!showTerms)}
                              >
                                {showTerms ? 'Show Less' : 'Read More'}
                                <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showTerms ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              </>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50">
              <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-lg font-medium text-slate-600">No quotation selected</p>
              <p className="text-sm max-w-xs text-center mt-2">
                Select a quotation from the list to view details or create a new one.
              </p>
              <Link href="/quotes/create" className="mt-6">
                <Button variant="outline">Create New Quotation</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quotation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Quote
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
