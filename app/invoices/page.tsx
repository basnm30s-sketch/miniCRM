'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import InvoiceForm from '@/app/invoices/InvoiceForm'
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

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [savingAmount, setSavingAmount] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isEditing, setIsEditing] = useState(false)

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
      // Auto-select first invoice if available
      if (invoicesData.length > 0) {
        setSelectedInvoice((prev) => prev || invoicesData[0])
      }
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
      const updatedInvoices = invoices.filter((inv) => inv.id !== invoiceToDelete)
      setInvoices(updatedInvoices)
      // Clear selection if deleted invoice was selected
      if (selectedInvoice?.id === invoiceToDelete) {
        setSelectedInvoice(updatedInvoices.length > 0 ? updatedInvoices[0] : null)
        setIsEditing(false)
      }
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

  // Simplified badge colors
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'payment_received':
      case 'paid':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'invoice_sent':
      case 'sent':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'overdue':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'cancelled':
        return 'bg-slate-100 text-slate-500 border-slate-200 line-through'
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'payment_received':
        return 'Paid'
      case 'invoice_sent':
        return 'Sent'
      default:
        return (status && status.charAt(0).toUpperCase() + status.slice(1)) || 'Draft'
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
        status: newAmount >= invoiceTotal ? 'paid' : newAmount > 0 ? 'payment_received' : 'pending' // Auto-update status logic
      }

      await saveInvoice(updatedInvoice)
      const updatedInvoices = invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv))
      setInvoices(updatedInvoices)
      // Update selected invoice if it's the one being edited
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(updatedInvoice)
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
    setInvoices((prev) => prev.map((inv) => (inv.id === savedInvoice.id ? savedInvoice : inv)))
    setSelectedInvoice(savedInvoice)
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-slate-500 animate-pulse">Loading invoices...</div>
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
        <Link href="/invoices/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane - List View */}
        <div className="w-[380px] border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
          <div className="p-3 bg-slate-50/50 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
              All Invoices ({invoices.length})
            </div>
          </div>

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
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                  {/* Payment Status Card - Prominent */}
                  <Card className="shadow-sm border-blue-100 bg-blue-50/30">
                    <CardHeader className="pb-2 pt-4 border-b border-blue-100/50">
                      <CardTitle className="text-sm font-medium text-blue-900 uppercase tracking-wider flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Payment Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-slate-500 text-xs mb-1">Total Amount</span>
                        <span className="text-lg font-bold text-slate-900">AED {(selectedInvoice.total || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-slate-600">Amount Received</span>
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
                              <span className="text-green-700 font-bold text-lg">AED {(selectedInvoice.amountReceived || 0).toFixed(2)}</span>
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

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, ((selectedInvoice.amountReceived || 0) / (selectedInvoice.total || 1)) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-slate-400">0%</span>
                          {((selectedInvoice.total || 0) - (selectedInvoice.amountReceived || 0)) > 0.01 && (
                            <span className="text-[10px] font-medium text-orange-600">
                              AED {((selectedInvoice.total || 0) - (selectedInvoice.amountReceived || 0)).toFixed(2)} Remaining
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Customer Details */}
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                      <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Customer Information</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-1">
                        <span className="block text-slate-500 text-xs text-sm font-medium text-slate-900">{getCustomerName(selectedInvoice.customerId)}</span>
                        {/* Would add more customer details here if available in the invoice object directly or by deeper lookup */}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Items Table */}
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                      <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Invoice Items</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="text-left py-3 px-4 font-medium">Description</th>
                            <th className="text-right py-3 px-4 font-medium">Qty</th>
                            <th className="text-right py-3 px-4 font-medium">Price</th>
                            <th className="text-right py-3 px-4 font-medium">Tax</th>
                            <th className="text-right py-3 px-4 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedInvoice.items?.map((item, index) => {
                            const itemTotal = item.quantity * item.unitPrice
                            const taxAmount = item.lineTaxAmount || item.tax || 0
                            const lineTotal = item.lineTotal || (itemTotal + taxAmount)

                            return (
                              <tr key={index} className="hover:bg-slate-50/50">
                                <td className="py-3 px-4 font-medium text-slate-700">{item.description || 'Item'}</td>
                                <td className="py-3 px-4 text-right text-slate-600">{item.quantity}</td>
                                <td className="py-3 px-4 text-right text-slate-600">AED {item.unitPrice.toFixed(2)}</td>
                                <td className="py-3 px-4 text-right text-slate-500 text-xs">AED {taxAmount.toFixed(2)}</td>
                                <td className="py-3 px-4 text-right font-semibold text-slate-900">AED {lineTotal.toFixed(2)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  {/* Financial Summary */}
                  <div className="flex justify-end">
                    <Card className="shadow-sm border-slate-200 w-1/3 min-w-[300px]">
                      <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-3">
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
                      </CardContent>
                    </Card>
                  </div>

                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <Card className="shadow-sm border-slate-200">
                      <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Notes</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedInvoice.notes}</p>
                      </CardContent>
                    </Card>
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
