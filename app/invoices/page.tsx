'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Download, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  getAllInvoices,
  deleteInvoice,
  getAllCustomers,
  getAdminSettings,
} from '@/lib/storage'
import { pdfRenderer } from '@/lib/pdf'
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
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-slate-100 text-slate-800'
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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono font-semibold text-slate-900">
                        {renderCell(invoice.number)}
                      </TableCell>
                      <TableCell className="text-slate-900">{getCustomerName(invoice.customerId)}</TableCell>
                      <TableCell className="text-slate-600">{invoice.date}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        AED {invoice.total?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status || 'draft'}
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
                            title="Download PDF"
                            className="p-2 h-8 w-8 text-green-600 hover:text-green-700"
                          >
                            <Download className="w-4 h-4" />
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
                  ))}
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
