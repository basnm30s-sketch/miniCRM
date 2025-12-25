'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Download, Trash2, FileSpreadsheet, FileType } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  getAllInvoices,
  deleteInvoice,
  saveInvoice,
  getAllCustomers,
  getAdminSettings,
} from '@/lib/storage'
import { pdfRenderer } from '@/lib/pdf'
import { excelRenderer } from '@/lib/excel'
import { docxRenderer } from '@/lib/docx'
import { Invoice } from '@/lib/storage'
import type { AdminSettings } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [savingAmount, setSavingAmount] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [invoicesData, customersData, settingsData] = await Promise.all([
        getAllInvoices(),
        getAllCustomers(),
        getAdminSettings(),
      ])
      setInvoices(invoicesData)
      setCustomers(customersData)
      setAdminSettings(settingsData)
    } catch (err) {
      console.error('Error loading invoices:', err)
      toast({ title: 'Error', description: 'Failed to load invoices', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (id: string) => {
    setInvoiceToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return
    try {
      await deleteInvoice(invoiceToDelete)
      await loadData()
      toast({ title: 'Success', description: 'Invoice deleted successfully' })
    } catch (err) {
      console.error('Error deleting invoice:', err)
      toast({ title: 'Error', description: 'Failed to delete invoice', variant: 'destructive' })
    } finally {
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
    }
  }

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return '-'
    const customer = customers.find((c) => c.id === customerId)
    return customer?.name || '-'
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'payment_received':
        return 'bg-green-100 text-green-800'
      case 'invoice_sent':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'payment_received':
        return 'Payment Received'
      case 'invoice_sent':
        return 'Invoice Sent'
      case 'draft':
        return 'Draft'
      default:
        return status || 'Draft'
    }
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      if (!adminSettings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }
      const customer = customers.find((c) => c.id === invoice.customerId)
      const customerName = customer?.name || 'Unknown Customer'
      const blob = await pdfRenderer.renderInvoiceToPdf(invoice, adminSettings, customerName)
      pdfRenderer.downloadPdf(blob, `invoice-${invoice.number}.pdf`)
      toast({ title: 'Success', description: 'PDF downloaded successfully' })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' })
    }
  }

  const handleDownloadExcel = async (invoice: Invoice) => {
    try {
      if (!adminSettings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }
      const customer = customers.find((c) => c.id === invoice.customerId)
      const customerName = customer?.name || 'Unknown Customer'
      const blob = await excelRenderer.renderInvoiceToExcel(invoice, adminSettings, customerName)
      excelRenderer.downloadExcel(blob, `invoice-${invoice.number}.xlsx`)
      toast({ title: 'Success', description: 'Excel file downloaded successfully' })
    } catch (error) {
      console.error('Error generating Excel:', error)
      toast({ title: 'Error', description: 'Failed to generate Excel file', variant: 'destructive' })
    }
  }

  const handleDownloadDocx = async (invoice: Invoice) => {
    try {
      if (!adminSettings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }
      const customer = customers.find((c) => c.id === invoice.customerId)
      const customerName = customer?.name || 'Unknown Customer'
      const blob = await docxRenderer.renderInvoiceToDocx(invoice, adminSettings, customerName)
      docxRenderer.downloadDocx(blob, `invoice-${invoice.number}.docx`)
      toast({ title: 'Success', description: 'Word document downloaded successfully' })
    } catch (error) {
      console.error('Error generating DOCX:', error)
      toast({ title: 'Error', description: 'Failed to generate Word document', variant: 'destructive' })
    }
  }

  const renderCell = (content: string | React.ReactNode, maxLength: number = 50) => {
    const text = typeof content === 'string' ? content : ''
    if (text.length > maxLength) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help truncate">{text}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">{text}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
    return content
  }

  const handleAmountReceivedChange = async (invoiceId: string, newAmount: number, invoiceTotal: number) => {
    if (newAmount < 0 || newAmount > invoiceTotal) {
      toast({
        title: 'Validation Error',
        description: `Amount received cannot exceed invoice total of AED ${invoiceTotal.toFixed(2)}`,
        variant: 'destructive',
      })
      return
    }

    try {
      setSavingAmount(true)
      const invoice = invoices.find((inv) => inv.id === invoiceId)
      if (!invoice) return

      const updatedInvoice: Invoice = {
        ...invoice,
        amountReceived: newAmount,
      }

      await saveInvoice(updatedInvoice)
      await loadData()
      toast({ title: 'Success', description: 'Amount received updated successfully' })
    } catch (err) {
      console.error('Error updating amount received:', err)
      toast({ title: 'Error', description: 'Failed to update amount received', variant: 'destructive' })
    } finally {
      setSavingAmount(false)
      setEditingInvoiceId(null)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading invoices...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500">Create and manage invoices</p>
        </div>
        <Link href="/invoices/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No invoices yet. Create your first invoice to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total (AED)</TableHead>
                    <TableHead className="text-right">Amt. Received (AED)</TableHead>
                    <TableHead className="text-right">Pending (AED)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const amountReceived = invoice.amountReceived || 0
                    const total = invoice.total || 0
                    const pending = total - amountReceived
                    const isEditing = editingInvoiceId === invoice.id

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono font-semibold text-slate-900">
                          {renderCell(invoice.number)}
                        </TableCell>
                        <TableCell className="text-slate-900">{getCustomerName(invoice.customerId)}</TableCell>
                        <TableCell className="text-slate-600">{invoice.date}</TableCell>
                        <TableCell className="text-right font-semibold text-slate-900">
                          AED {total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={total}
                              defaultValue={amountReceived}
                              onBlur={(e) => {
                                const newAmount = parseFloat(e.target.value) || 0
                                handleAmountReceivedChange(invoice.id, newAmount, total)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const newAmount = parseFloat((e.target as HTMLInputElement).value) || 0
                                  handleAmountReceivedChange(invoice.id, newAmount, total)
                                } else if (e.key === 'Escape') {
                                  setEditingInvoiceId(null)
                                }
                              }}
                              autoFocus
                              className="w-24 px-2 py-1 border border-blue-300 rounded text-sm text-slate-900 text-right"
                              disabled={savingAmount}
                            />
                          ) : (
                            <span
                              className="text-slate-900 cursor-pointer hover:text-blue-600"
                              onClick={() => setEditingInvoiceId(invoice.id)}
                              title="Click to edit"
                            >
                              AED {amountReceived.toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {pending === 0 ? (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Paid
                            </span>
                          ) : (
                            <span className="font-semibold text-orange-600">AED {pending.toFixed(2)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {getStatusDisplay(invoice.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Link href={`/invoices/create?id=${invoice.id}`}>
                              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPDF(invoice)}
                              title="Save PDF"
                              className="p-2 h-8 w-8 text-green-600 hover:text-green-700"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadExcel(invoice)}
                              title="Save Excel"
                              className="p-2 h-8 w-8 text-blue-600 hover:text-blue-700"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadDocx(invoice)}
                              title="Save Word"
                              className="p-2 h-8 w-8 text-purple-600 hover:text-purple-700"
                            >
                              <FileType className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(invoice.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this invoice? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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
