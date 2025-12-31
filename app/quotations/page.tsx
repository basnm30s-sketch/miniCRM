'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
// top-of-page alerts replaced by toast notifications
import { toast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Eye, Trash2, Plus, FileText, Sheet, FileType } from 'lucide-react'
import { Edit3 } from 'lucide-react'
import { getAllQuotes, deleteQuote, getAdminSettings, convertQuoteToInvoice } from '@/lib/storage'
import { ClientSidePDFRenderer } from '@/lib/pdf'
import { excelRenderer } from '@/lib/excel'
import { docxRenderer } from '@/lib/docx'
import type { Quote } from '@/lib/types'

export default function QuotationsPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null)
  const [previewShowTerms, setPreviewShowTerms] = useState(false)
  // notifications now use toasts

  useEffect(() => {
    const loadQuotes = async () => {
      try {
        const allQuotes = await getAllQuotes()
        setQuotes(allQuotes)
      } catch (error) {
        console.error('Error loading quotes:', error)
        toast({ title: 'Error', description: 'Failed to load quotations', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    loadQuotes()
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteQuote(deleteId)
      setQuotes(quotes.filter((q) => q.id !== deleteId))
      toast({ title: 'Deleted', description: 'Quotation deleted successfully' })
      setDeleteId(null)
    } catch (error) {
      console.error('Error deleting quote:', error)
      toast({ title: 'Error', description: 'Failed to delete quotation', variant: 'destructive' })
    }
  }

  const handleDownloadPDF = async (quote: Quote) => {
    try {
      const adminSettings = await getAdminSettings()
      if (!adminSettings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }

      const pdfRenderer = new ClientSidePDFRenderer()
      const blob = await pdfRenderer.renderQuoteToPdf(quote, adminSettings)
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

      const blob = await excelRenderer.renderQuoteToExcel(quote, adminSettings)
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

  const handlePreview = (quote: Quote) => {
    setPreviewShowTerms(false)
    setPreviewQuote(quote)
  }

  const closePreview = () => setPreviewQuote(null)

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

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading quotations...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quotations</h1>
          <p className="text-slate-500">Manage your quotations</p>
        </div>
        <Link href="/quotes/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Quotation
          </Button>
        </Link>
      </div>

      {/* toasts will show notifications; no top-of-page alerts */}

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
                  <TableHead>Vehicle Type</TableHead>
                  <TableHead className="text-right">Total (AED)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.length > 0 ? (
                  quotes.map((quote) => {
                    const vehicleTypes = quote.items.map((item) => item.vehicleTypeLabel).filter(Boolean)
                    const uniqueVehicles = [...new Set(vehicleTypes)].join(', ')

                    return (
                      <TableRow key={quote.id}>
                        <TableCell className="font-mono font-semibold text-slate-900">{quote.number}</TableCell>
                        <TableCell className="text-slate-900">{quote.customer?.name || 'N/A'}</TableCell>
                        <TableCell className="text-slate-600">{quote.date}</TableCell>
                        <TableCell className="text-slate-600">{uniqueVehicles || 'N/A'}</TableCell>
                        <TableCell className="text-right font-semibold text-slate-900">
                          AED {quote.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              title="Preview"
                              onClick={() => handlePreview(quote)}
                              className="p-2 h-8 w-8"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Link href={{ pathname: '/quotes/create', query: { id: quote.id } }}>
                              <Button
                                variant="outline"
                                size="sm"
                                title="Edit"
                                className="p-2 h-8 w-8"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPDF(quote)}
                              title="Save PDF"
                              className="p-2 h-8 w-8 text-action-pdf hover:text-action-pdf hover:bg-action-pdf/10 border-action-pdf/20"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadExcel(quote)}
                              title="Save Excel"
                              className="p-2 h-8 w-8 text-action-excel hover:text-action-excel hover:bg-action-excel/10 border-action-excel/20"
                            >
                              <Sheet className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDocx(quote)}
                              title="Save Word"
                              className="p-2 h-8 w-8 text-action-word hover:text-action-word hover:bg-action-word/10 border-action-word/20"
                            >
                              <FileType className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCreateInvoice(quote)}
                              title="Create Invoice"
                              className="p-2 h-8 w-8 text-green-600 hover:text-green-700"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteId(quote.id)}
                              title="Delete"
                              className="p-2 h-8 w-8 text-red-600 hover:text-red-700"
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
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      No quotations yet. <Link href="/quotes/create" className="text-blue-600 hover:underline">Create one</Link>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal (simple) */}
      {previewQuote && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="fixed inset-0 bg-black/40" onClick={closePreview} />
          <div className="relative bg-white w-full max-w-4xl rounded shadow-lg p-6 overflow-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Preview - {previewQuote.number}</h2>
                <p className="text-sm text-gray-600">{previewQuote.customer?.name || 'N/A'}</p>
              </div>
              <div>
                <Button variant="ghost" onClick={closePreview}>Close</Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Items</h3>
                <table className="w-full text-sm mt-2">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="text-left p-2">Vehicle Type</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Unit</th>
                      <th className="text-right p-2">Tax %</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewQuote.items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2">{item.vehicleTypeLabel || 'N/A'}</td>
                        <td className="p-2 text-right">{item.quantity}</td>
                        <td className="p-2 text-right">{item.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-right">{item.taxPercent}</td>
                        <td className="p-2 text-right">{(item.quantity * item.unitPrice + (item.quantity * item.unitPrice * item.taxPercent) / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="font-semibold">Totals</h3>
                <div className="mt-2">
                  <div className="flex justify-between"><span>Subtotal</span><span>AED {previewQuote.subTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Total Tax</span><span>AED {previewQuote.totalTax.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold"><span>Total</span><span>AED {previewQuote.total.toFixed(2)}</span></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Terms &amp; Conditions</h3>
                {/* Collapsible terms: show small preview and let user expand */}
                {!previewShowTerms ? (
                  <div className="mt-2">
                    <div className="max-h-24 overflow-hidden prose prose-sm" dangerouslySetInnerHTML={{ __html: (previewQuote.terms || '').slice(0, 600) }} />
                    <div className="mt-2">
                      <button className="text-blue-600 hover:underline" onClick={() => setPreviewShowTerms(true)}>Show full Terms &amp; Conditions</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 prose prose-sm">
                    <div dangerouslySetInnerHTML={{ __html: previewQuote.terms || '' }} />
                    <div className="mt-2">
                      <button className="text-sm text-gray-600 hover:underline" onClick={() => setPreviewShowTerms(false)}>Collapse</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quotation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
