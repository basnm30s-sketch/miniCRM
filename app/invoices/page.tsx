'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import InvoiceForm from '@/app/invoices/InvoiceForm'
import { useInvoices, useDeleteInvoice, useUpdateInvoice } from '@/hooks/use-invoices'
import { useCustomers } from '@/hooks/use-customers'
import { getAdminSettings } from '@/lib/storage'
import { useAdminSettings } from '@/hooks/use-admin-settings'
import { pdfRenderer } from '@/lib/pdf'
import { excelRenderer } from '@/lib/excel'
import { docxRenderer } from '@/lib/docx'
import { Invoice } from '@/lib/storage'
import type { AdminSettings } from '@/lib/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogHeader
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Edit3,
  Trash2,
  FileText,
  ChevronDown,
  Share2,
  CreditCard,
  Download,
  FileSpreadsheet,
  File as FileIcon
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { normalizeInvoiceStatus } from '@/lib/validation'
import { TwoPaneListHeader } from '@/components/TwoPaneListHeader'
import { ReadOnlyLineItemsTable } from '@/components/doc-generator/ReadOnlyLineItemsTable'
import { DEFAULT_INVOICE_COLUMNS } from '@/lib/doc-generator/line-item-columns'

export default function InvoicesPage() {
  const router = useRouter()
  const { data: invoices = [], isLoading: loading, error: invoicesError } = useInvoices()
  const { data: customers = [] } = useCustomers()
  const deleteMutation = useDeleteInvoice()
  const updateMutation = useUpdateInvoice()
  const { data: adminSettings, isLoading: settingsLoading } = useAdminSettings()
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [savingAmount, setSavingAmount] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  const useTwoPane = useMemo(() => {
    // Backward-compatible default: true when unset
    return adminSettings?.showInvoicesTwoPane !== false
  }, [adminSettings?.showInvoicesTwoPane])

  useEffect(() => {
    if (!useTwoPane) return
    if (invoices.length === 0) return

    setSelectedInvoice((prev) => {
      if (prev && invoices.some((inv) => inv.id === prev.id)) return prev
      return invoices[0]
    })
  }, [useTwoPane, invoices])

  const handleDeleteClick = (id: string) => {
    setInvoiceToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return
    try {
      const result = await deleteMutation.mutateAsync(invoiceToDelete)
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete invoice',
          variant: 'destructive',
        })
        return
      }
      
      // Clear selection if deleted invoice was selected
      const updatedInvoices = invoices.filter((inv) => inv.id !== invoiceToDelete)
      if (selectedInvoice?.id === invoiceToDelete) {
        setSelectedInvoice(updatedInvoices.length > 0 ? updatedInvoices[0] : null)
        setIsEditing(false)
      }
      toast({ title: 'Success', description: 'Invoice deleted successfully' })
    } catch (err: any) {
      console.error('Error deleting invoice:', err)
      toast({ title: 'Error', description: err?.message || 'Failed to delete invoice', variant: 'destructive' })
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

  // Simplified badge colors
  const getStatusColor = (status?: string) => {
    switch (normalizeInvoiceStatus(status)) {
      case 'payment_received':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'invoice_sent':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  const getStatusDisplay = (status?: string) => {
    switch (normalizeInvoiceStatus(status)) {
      case 'payment_received':
        return 'Paid'
      case 'invoice_sent':
        return 'Sent'
      default:
        return 'Draft'
    }
  }

  // Helper functions for table display
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return 'AED 0.00'
    return `AED ${amount.toFixed(2)}`
  }

  const getDueDateStatus = (dueDate?: string) => {
    if (!dueDate) return { status: 'none', label: 'N/A', days: null }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { status: 'overdue', label: 'Overdue', days: Math.abs(diffDays) }
    if (diffDays <= 7) return { status: 'due-soon', label: `Due in ${diffDays} days`, days: diffDays }
    return { status: 'valid', label: dueDate, days: diffDays }
  }

  const getDateStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      overdue: 'bg-red-100 text-red-700 border-red-300',
      'due-soon': 'bg-orange-100 text-orange-700 border-orange-300',
      valid: 'bg-green-100 text-green-700 border-green-300',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300'
  }

  const getCustomerDetails = (customerId?: string) => {
    if (!customerId) return null
    const customer = customers.find((c) => c.id === customerId)
    if (!customer) return null
    return {
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
      address: customer.address
    }
  }


  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const settings = adminSettings || (await getAdminSettings())
      if (!settings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }
      const customer = customers.find((c) => c.id === invoice.customerId)
      const customerName = customer?.name || 'Unknown Customer'
      const blob = await pdfRenderer.renderInvoiceToPdf(invoice, settings, customerName)
      const numPart = (invoice.number || '').replace(/^Invoice-?/i, '') || invoice.number || 'invoice'
      pdfRenderer.downloadPdf(blob, `invoice-${numPart}.pdf`)
      toast({ title: 'Success', description: 'PDF downloaded successfully' })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' })
    }
  }

  const handleDownloadExcel = async (invoice: Invoice) => {
    try {
      const settings = adminSettings || (await getAdminSettings())
      if (!settings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }
      const customer = customers.find((c) => c.id === invoice.customerId)
      const customerName = customer?.name || 'Unknown Customer'
      const blob = await excelRenderer.renderInvoiceToExcel(invoice, settings, customerName, { visibleColumns: DEFAULT_INVOICE_COLUMNS })
      const numPart = (invoice.number || '').replace(/^Invoice-?/i, '') || invoice.number || 'invoice'
      excelRenderer.downloadExcel(blob, `invoice-${numPart}.xlsx`)
      toast({ title: 'Success', description: 'Excel file downloaded successfully' })
    } catch (error) {
      console.error('Error generating Excel:', error)
      toast({ title: 'Error', description: 'Failed to generate Excel file', variant: 'destructive' })
    }
  }

  const handleDownloadDocx = async (invoice: Invoice) => {
    try {
      const settings = adminSettings || (await getAdminSettings())
      if (!settings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }
      const customer = customers.find((c) => c.id === invoice.customerId)
      const customerName = customer?.name || 'Unknown Customer'
      const blob = await docxRenderer.renderInvoiceToDocx(invoice, settings, customerName)
      const numPart = (invoice.number || '').replace(/^Invoice-?/i, '') || invoice.number || 'invoice'
      docxRenderer.downloadDocx(blob, `invoice-${numPart}.docx`)
      toast({ title: 'Success', description: 'Word document downloaded successfully' })
    } catch (error) {
      console.error('Error generating DOCX:', error)
      toast({ title: 'Error', description: 'Failed to generate Word document', variant: 'destructive' })
    }
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
        status: newAmount >= invoiceTotal ? 'payment_received' : 'invoice_sent',
      }

      const result = await updateMutation.mutateAsync({
        id: invoiceId,
        data: {
          amountReceived: newAmount,
          status: newAmount >= invoiceTotal ? 'payment_received' : 'invoice_sent',
        },
      })
      
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update amount received',
          variant: 'destructive',
        })
        return
      }
      
      // Update selected invoice if it's the one being edited
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice({ ...invoice, amountReceived: newAmount, status: newAmount >= invoiceTotal ? 'payment_received' : 'invoice_sent' })
      }
      toast({ title: 'Success', description: 'Amount received updated successfully' })
    } catch (err) {
      console.error('Error updating amount received:', err)
      toast({ title: 'Error', description: 'Failed to update amount received', variant: 'destructive' })
    } finally {
      setSavingAmount(false)
      setEditingInvoiceId(null)
    }
  }

  const handleInvoiceSave = (savedInvoice: Invoice) => {
    // TanStack Query will automatically update the cache
    setSelectedInvoice(savedInvoice)
    setIsEditing(false)
  }

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-slate-500 animate-pulse">Loading invoices...</div>
      </div>
    )
  }

  if (invoicesError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-red-500">Error loading invoices: {invoicesError.message}</div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">Create, manage, and track your invoices</p>
        </div>
        {!useTwoPane && (
          <Link href="/invoices/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </Link>
        )}
      </div>

      {useTwoPane ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Pane - List View */}
          <div className="w-[380px] border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
          <TwoPaneListHeader
            title="All Invoices"
            count={invoices.length}
            action={
              <Link href="/invoices/create">
                <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New Invoice
                </Button>
              </Link>
            }
          />

          <div className="divide-y divide-slate-100">
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p className="text-sm">No invoices found.</p>
                <Link href="/invoices/create" className="text-blue-600 hover:underline mt-2 text-sm inline-block">
                  Create your first invoice
                </Link>
              </div>
            ) : (
              invoices.map((invoice) => {
                const amountReceived = invoice.amountReceived || 0
                const total = invoice.total || 0
                const pending = total - amountReceived
                const isSelected = selectedInvoice?.id === invoice.id

                return (
                  <div
                    key={invoice.id}
                    className={`group px-4 py-3 cursor-pointer transition-all duration-200 border-l-[3px] hover:bg-slate-50 ${isSelected
                      ? 'bg-blue-50/60 border-blue-600'
                      : 'border-transparent hover:border-slate-300'
                      }`}
                    onClick={() => {
                      setSelectedInvoice(invoice)
                      setIsEditing(false)
                      setEditingInvoiceId(null)
                    }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-mono text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                        {invoice.number}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        AED {total.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm text-slate-700 font-medium truncate pr-2">
                        {getCustomerName(invoice.customerId)}
                      </div>
                      <div className="text-xs text-slate-400 whitespace-nowrap">
                        {invoice.date}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 rounded-sm font-medium ${getStatusColor(invoice.status)}`}>
                        {getStatusDisplay(invoice.status)}
                      </Badge>

                      {pending <= 0.01 && total > 0 ? (
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-sm">PAID</span>
                      ) : (
                        <span className="text-[10px] font-bold text-orange-600">AED {pending.toFixed(2)} Due</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Pane - Detail View */}
        <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col">
          {selectedInvoice ? (
            isEditing ? (
              <div className="h-full overflow-y-auto bg-white">
                <InvoiceForm
                  initialData={selectedInvoice}
                  onSave={handleInvoiceSave}
                  onCancel={() => setIsEditing(false)}
                />
              </div>
            ) : (
              <>
                {/* Header Actions */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-start shadow-sm z-10">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-slate-900">{selectedInvoice.number}</h2>
                      <Badge variant="outline" className={`${getStatusColor(selectedInvoice.status)}`}>
                        {getStatusDisplay(selectedInvoice.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span>{getCustomerName(selectedInvoice.customerId)}</span>
                      {selectedInvoice.dueDate && <span>Due: {selectedInvoice.dueDate}</span>}
                    </div>
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
                        <DropdownMenuItem onClick={() => handleDownloadPDF(selectedInvoice)}>
                          <FileText className="w-4 h-4 mr-2 text-red-500" />
                          PDF Document
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadExcel(selectedInvoice)}>
                          <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                          Excel Spreadsheet
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadDocx(selectedInvoice)}>
                          <FileIcon className="w-4 h-4 mr-2 text-blue-600" />
                          Word Document
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9">
                          <CreditCard className="w-4 h-4 mr-2 text-slate-500" />
                          Record Payment
                          <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingInvoiceId(selectedInvoice.id)}>
                          Update Amount Received
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
                      className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => handleDeleteClick(selectedInvoice.id)}
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
                    {/* Customer Details */}
                    <Card className="col-span-2 shadow-sm border-slate-200">
                      <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Customer Details</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 grid grid-cols-2 gap-4 text-sm">
                        {(() => {
                          const customer = getCustomerDetails(selectedInvoice.customerId)
                          return (
                            <>
                              <div>
                                <span className="block text-slate-500 text-xs mb-1">Customer Name</span>
                                <span className="font-medium text-slate-900">{customer?.name || getCustomerName(selectedInvoice.customerId) || 'N/A'}</span>
                              </div>
                              {customer?.company && (
                                <div>
                                  <span className="block text-slate-500 text-xs mb-1">Company</span>
                                  <span className="font-medium text-slate-900">{customer.company}</span>
                                </div>
                              )}
                              {customer?.email && (
                                <div>
                                  <span className="block text-slate-500 text-xs mb-1">Email</span>
                                  <span className="text-slate-900">{customer.email}</span>
                                </div>
                              )}
                              {customer?.phone && (
                                <div>
                                  <span className="block text-slate-500 text-xs mb-1">Phone</span>
                                  <span className="text-slate-900">{customer.phone}</span>
                                </div>
                              )}
                              {customer?.address && (
                                <div className="col-span-2">
                                  <span className="block text-slate-500 text-xs mb-1">Details</span>
                                  <span className="text-slate-900">{customer.address}</span>
                                </div>
                              )}
                            </>
                          )
                        })()}
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
                          <span>AED {(selectedInvoice.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Tax</span>
                          <span>AED {(selectedInvoice.tax || 0).toFixed(2)}</span>
                        </div>
                        <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-baseline">
                          <span className="font-semibold text-slate-900">Total</span>
                          <span className="text-xl font-bold text-slate-900">AED {(selectedInvoice.total || 0).toFixed(2)}</span>
                        </div>

                        {/* Payment (merged into Summary for consistency) */}
                        <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Received</span>
                            {editingInvoiceId === selectedInvoice.id ? (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={selectedInvoice.total || 0}
                                defaultValue={selectedInvoice.amountReceived || 0}
                                onBlur={(e) => {
                                  const newAmount = parseFloat(e.target.value) || 0
                                  handleAmountReceivedChange(selectedInvoice.id, newAmount, selectedInvoice.total || 0)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const newAmount = parseFloat((e.target as HTMLInputElement).value) || 0
                                    handleAmountReceivedChange(selectedInvoice.id, newAmount, selectedInvoice.total || 0)
                                  } else if (e.key === 'Escape') {
                                    setEditingInvoiceId(null)
                                  }
                                }}
                                autoFocus
                                className="w-28 h-8 text-right bg-white"
                                disabled={savingAmount}
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">AED {(selectedInvoice.amountReceived || 0).toFixed(2)}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-400 hover:text-blue-600"
                                  onClick={() => setEditingInvoiceId(selectedInvoice.id)}
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between text-sm text-slate-600">
                            <span>Pending</span>
                            <span className="font-semibold text-slate-900">
                              AED {Math.max(0, (selectedInvoice.total || 0) - (selectedInvoice.amountReceived || 0)).toFixed(2)}
                            </span>
                          </div>
                          {/* Progress bar (optional, kept but inside Summary) */}
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  ((selectedInvoice.amountReceived || 0) / (selectedInvoice.total || 1)) * 100
                                )}%`,
                              }}
                            />
                          </div>
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
                        variant="invoice"
                        items={(selectedInvoice.items || []) as any}
                        visibleColumns={DEFAULT_INVOICE_COLUMNS}
                      />
                    </CardContent>
                  </Card>

                  {/* Additional Info (Terms/Notes) */}
                  {(selectedInvoice.terms || selectedInvoice.notes) && (
                    <div className="grid grid-cols-1 gap-4">
                      {selectedInvoice.notes && (
                        <Card className="shadow-sm border-slate-200">
                          <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Notes</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3">
                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedInvoice.notes}</p>
                          </CardContent>
                        </Card>
                      )}

                      {selectedInvoice.terms && (
                        <Card className="shadow-sm border-slate-200">
                          <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Terms & Conditions</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3">
                            <div className={`prose prose-sm max-w-none text-slate-600 ${!showTerms ? 'line-clamp-4' : ''}`}
                              dangerouslySetInnerHTML={{ __html: selectedInvoice.terms }}
                            />
                            {selectedInvoice.terms.length > 200 && (
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
              <p className="text-lg font-medium text-slate-600">No invoice selected</p>
              <p className="text-sm max-w-xs text-center mt-2">
                Select an invoice from the list to view details or create a new one.
              </p>
              <Link href="/invoices/create" className="mt-6">
                <Button variant="outline">Create New Invoice</Button>
              </Link>
            </div>
          )}
        </div>
        </div>
      ) : (
        // List-only table view
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <Card>
            <CardHeader>
              <CardTitle>All Invoices ({invoices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-slate-500 py-8">
                          No invoices found.
                          <Link href="/invoices/create" className="text-blue-600 hover:underline mt-2 text-sm inline-block">
                            Create your first invoice
                          </Link>
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((invoice) => {
                        const amountReceived = invoice.amountReceived || 0
                        const total = invoice.total || 0
                        const pending = total - amountReceived
                        const customerDetails = getCustomerDetails(invoice.customerId)
                        const customerTooltip = customerDetails ? [
                          customerDetails.name,
                          customerDetails.company && `Company: ${customerDetails.company}`,
                          customerDetails.email && `Email: ${customerDetails.email}`,
                          customerDetails.phone && `Phone: ${customerDetails.phone}`,
                          customerDetails.address && `Address: ${customerDetails.address}`
                        ].filter(Boolean).join('\n') : 'Unknown Customer'
                        const dueDateStatus = getDueDateStatus(invoice.dueDate)
                        
                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-mono text-sm font-medium text-slate-900">
                              {invoice.number}
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="max-w-[200px]">
                                      <div className="font-medium text-slate-900 truncate">
                                        {customerDetails?.name || 'Unknown Customer'}
                                      </div>
                                      {customerDetails?.company && (
                                        <div className="text-xs text-slate-500 truncate mt-0.5">
                                          {customerDetails.company}
                                        </div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="whitespace-pre-line max-w-xs">
                                    {customerTooltip}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="text-slate-600">{invoice.date}</TableCell>
                            <TableCell>
                              {dueDateStatus.status === 'none' ? (
                                <span className="text-slate-400 text-sm">N/A</span>
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${getDateStatusBadgeColor(dueDateStatus.status)}`}
                                      >
                                        {dueDateStatus.label}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {dueDateStatus.status === 'overdue' 
                                        ? `Overdue by ${dueDateStatus.days} days`
                                        : dueDateStatus.status === 'due-soon'
                                        ? `Due in ${dueDateStatus.days} days`
                                        : `Due on ${invoice.dueDate}`
                                      }
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${getStatusColor(invoice.status)}`}>
                                {getStatusDisplay(invoice.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs">
                                {invoice.items?.length || 0} {(invoice.items?.length || 0) === 1 ? 'item' : 'items'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              {formatCurrency(invoice.subtotal)}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              {formatCurrency(invoice.tax)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-slate-900">
                              {formatCurrency(invoice.total)}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              {formatCurrency(amountReceived)}
                            </TableCell>
                            <TableCell className="text-right">
                              {pending <= 0.01 && total > 0 ? (
                                <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                  Paid
                                </Badge>
                              ) : (
                                <span className={`text-sm font-semibold ${pending > 0 ? 'text-orange-600' : 'text-slate-600'}`}>
                                  {formatCurrency(pending)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/invoices/create?id=${invoice.id}`)}
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
                                    <DropdownMenuItem onClick={() => handleDownloadPDF(invoice)}>
                                      <FileText className="w-4 h-4 mr-2 text-red-500" />
                                      PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownloadExcel(invoice)}>
                                      <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                                      Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownloadDocx(invoice)}>
                                      <FileIcon className="w-4 h-4 mr-2 text-blue-600" />
                                      Word
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(invoice.id)}
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
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Invoice
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
