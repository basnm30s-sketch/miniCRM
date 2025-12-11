'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, Trash2, Download } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  getInvoiceById,
  getAllInvoices,
  saveInvoice,
  getAllCustomers,
  getAllQuotes,
  getAllPurchaseOrders,
  generateInvoiceNumber,
  generateId,
  getAdminSettings,
} from '@/lib/storage'
import { pdfRenderer } from '@/lib/pdf'
import { Invoice, InvoiceItem } from '@/lib/storage'
import type { AdminSettings } from '@/lib/types'

export default function CreateInvoicePage() {
  const [invoice, setInvoice] = useState<Invoice>({
    id: '',
    number: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    customerId: '',
    vendorId: '',
    purchaseOrderId: '',
    quoteId: '',
    items: [{ id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0 }],
    subtotal: 0,
    tax: 0,
    total: 0,
    amountReceived: 0,
    status: 'draft',
    notes: '',
  })

  const [customers, setCustomers] = useState<any[]>([])
  const [quotes, setQuotes] = useState<any[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersData, quotesData, posData, settingsData] = await Promise.all([
          getAllCustomers(),
          getAllQuotes(),
          getAllPurchaseOrders(),
          getAdminSettings(),
        ])

        setCustomers(customersData)
        setQuotes(quotesData)
        setPurchaseOrders(posData)
        setAdminSettings(settingsData)

        // Check if editing existing invoice
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
        const invoiceId = urlParams?.get('id')

        if (invoiceId) {
          const existing = await getInvoiceById(invoiceId)
          if (existing) {
            setInvoice(existing)
            setIsEditMode(true)
          }
        } else {
          // Generate invoice number for new invoice
          const newNumber = generateInvoiceNumber()
          setInvoice((prev) => ({
            ...prev,
            id: generateId(),
            number: newNumber,
          }))
        }
      } catch (err) {
        console.error('Error loading data:', err)
        toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const calculateTotals = (items: InvoiceItem[], tax: number) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice || 0), 0)
    const total = subtotal + tax
    return { subtotal, total }
  }

  const handleAddItem = () => {
    const newItems = [
      ...invoice.items,
      { id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0 },
    ]
    const { subtotal, total } = calculateTotals(newItems, invoice.tax)
    setInvoice({
      ...invoice,
      items: newItems,
      subtotal,
      total,
    })
  }

  const handleRemoveItem = (itemId: string) => {
    const newItems = invoice.items.filter((item) => item.id !== itemId)
    const { subtotal, total } = calculateTotals(newItems, invoice.tax)
    setInvoice({
      ...invoice,
      items: newItems,
      subtotal,
      total,
    })
  }

  const handleItemChange = (itemId: string, field: keyof InvoiceItem, value: any) => {
    const newItems = invoice.items.map((item) => {
      if (item.id !== itemId) return item

      const updated = { ...item, [field]: value }

      // Recalculate item total
      if (field === 'quantity' || field === 'unitPrice') {
        updated.total = (updated.quantity || 0) * (updated.unitPrice || 0)
      }

      return updated
    })

    const { subtotal, total } = calculateTotals(newItems, invoice.tax)
    setInvoice({
      ...invoice,
      items: newItems,
      subtotal,
      total,
    })
  }

  const handleTaxChange = (newTax: number) => {
    const total = invoice.subtotal + newTax
    setInvoice({
      ...invoice,
      tax: newTax,
      total,
    })
  }

  const handleSave = async () => {
    // Validation
    if (!invoice.number) {
      toast({ title: 'Error', description: 'Invoice number is required', variant: 'destructive' })
      return
    }

    if (invoice.items.length === 0) {
      toast({ title: 'Error', description: 'Add at least one line item', variant: 'destructive' })
      return
    }

    if (invoice.items.some((item) => !item.description || item.unitPrice === 0)) {
      toast({
        title: 'Error',
        description: 'All items must have a description and unit price',
        variant: 'destructive',
      })
      return
    }

    if (!invoice.customerId) {
      toast({ title: 'Error', description: 'Customer is required', variant: 'destructive' })
      return
    }

    try {
      setSaving(true)
      const invoiceToSave: Invoice = {
        ...invoice,
        createdAt: invoice.createdAt || new Date().toISOString(),
      }
      await saveInvoice(invoiceToSave)
      toast({
        title: 'Success',
        description: isEditMode ? 'Invoice updated successfully' : 'Invoice created successfully',
      })
      // Redirect to invoices list
      window.location.href = '/invoices'
    } catch (err) {
      console.error('Error saving invoice:', err)
      toast({ title: 'Error', description: 'Failed to save invoice', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!adminSettings) {
      toast({ title: 'Error', description: 'Admin settings not loaded', variant: 'destructive' })
      return
    }

    if (!invoice.customerId) {
      toast({ title: 'Validation', description: 'Please select a customer', variant: 'destructive' })
      return
    }

    if (invoice.items.length === 0) {
      toast({ title: 'Validation', description: 'Please add at least one line item', variant: 'destructive' })
      return
    }

    const customer = customers.find((c) => c.id === invoice.customerId)
    const customerName = customer?.name || 'Unknown Customer'

    setGenerating(true)
    try {
      const pdfBlob = await pdfRenderer.renderInvoiceToPdf(invoice, adminSettings, customerName)
      const filename = `invoice-${invoice.number}.pdf`
      pdfRenderer.downloadPdf(pdfBlob, filename)
      toast({ title: 'Success', description: 'PDF downloaded successfully' })
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/invoices">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">
          {isEditMode ? 'Edit Invoice' : 'Create New Invoice'}
        </h1>
        <p className="text-slate-500 mt-1">
          {isEditMode ? `Invoice ${invoice.number}` : 'Fill in the details below'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="number" className="text-slate-700">
                    Invoice Number
                  </Label>
                  <input
                    id="number"
                    type="text"
                    value={invoice.number}
                    disabled
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-900"
                  />
                </div>
                <div>
                  <Label htmlFor="status" className="text-slate-700">
                    Status
                  </Label>
                  <select
                    id="status"
                    value={invoice.status || 'draft'}
                    onChange={(e) => setInvoice({ ...invoice, status: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900"
                  >
                    <option value="draft">Draft</option>
                    <option value="invoice_sent">Invoice Sent</option>
                    <option value="payment_received">Payment Received</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date" className="text-slate-700">
                    Invoice Date
                  </Label>
                  <input
                    id="date"
                    type="date"
                    value={invoice.date}
                    onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900"
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate" className="text-slate-700">
                    Due Date
                  </Label>
                  <input
                    id="dueDate"
                    type="date"
                    value={invoice.dueDate || ''}
                    onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="amountReceived" className="text-slate-700">
                  Amount Received (AED)
                </Label>
                <input
                  id="amountReceived"
                  type="number"
                  step="0.01"
                  min="0"
                  max={invoice.total || 0}
                  value={invoice.amountReceived || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0
                    if (value <= (invoice.total || 0)) {
                      setInvoice({ ...invoice, amountReceived: value })
                    }
                  }}
                  className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Pending: AED {((invoice.total || 0) - (invoice.amountReceived || 0)).toFixed(2)}
                </p>
              </div>

              <div>
                <Label htmlFor="customer" className="text-slate-700">
                  Customer *
                </Label>
                <select
                  id="customer"
                  value={invoice.customerId || ''}
                  onChange={(e) => setInvoice({ ...invoice, customerId: e.target.value })}
                  className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="linkTo" className="text-slate-700">
                  Link to Quote or Purchase Order
                </Label>
                <select
                  id="linkTo"
                  value={
                    invoice.quoteId
                      ? `quote:${invoice.quoteId}`
                      : invoice.purchaseOrderId
                        ? `po:${invoice.purchaseOrderId}`
                        : ''
                  }
                  onChange={(e) => {
                    if (e.target.value.startsWith('quote:')) {
                      setInvoice({ ...invoice, quoteId: e.target.value.replace('quote:', ''), purchaseOrderId: '' })
                    } else if (e.target.value.startsWith('po:')) {
                      setInvoice({ ...invoice, purchaseOrderId: e.target.value.replace('po:', ''), quoteId: '' })
                    } else {
                      setInvoice({ ...invoice, quoteId: '', purchaseOrderId: '' })
                    }
                  }}
                  className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900"
                >
                  <option value="">None</option>
                  {quotes.length > 0 && (
                    <optgroup label="Quotes">
                      {quotes.map((q) => (
                        <option key={q.id} value={`quote:${q.id}`}>
                          {q.number}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {purchaseOrders.length > 0 && (
                    <optgroup label="Purchase Orders">
                      {purchaseOrders.map((po) => (
                        <option key={po.id} value={`po:${po.id}`}>
                          {po.number}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Line Items</CardTitle>
              <Button onClick={handleAddItem} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoice.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-slate-50 rounded-md">
                    <div className="col-span-5">
                      <Label className="text-xs text-slate-600">Description</Label>
                      <input
                        type="text"
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        className="w-full mt-1 px-2 py-1 border border-slate-300 rounded text-sm text-slate-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-slate-600">Qty</Label>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 px-2 py-1 border border-slate-300 rounded text-sm text-slate-900 text-right"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-slate-600">Unit Price</Label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={item.unitPrice || ''}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 px-2 py-1 border border-slate-300 rounded text-sm text-slate-900 text-right"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-slate-600">Total</Label>
                      <div className="mt-1 px-2 py-1 text-sm font-semibold text-slate-900">
                        AED {item.total?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        onClick={() => handleRemoveItem(item.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800 mt-5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="notes" className="text-slate-700">
                  Notes or Terms
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes, payment terms, or special instructions..."
                  value={invoice.notes || ''}
                  onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
                  className="w-full mt-2 text-slate-900"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div>
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 pb-4 border-b">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold text-slate-900">AED {invoice.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <label htmlFor="tax" className="text-slate-600">
                    Tax (AED):
                  </label>
                  <input
                    id="tax"
                    type="number"
                    placeholder="0.00"
                    value={invoice.tax || ''}
                    onChange={(e) => handleTaxChange(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-slate-300 rounded text-sm text-right text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold pt-2">
                <span className="text-slate-700">Total:</span>
                <span className="text-blue-600">AED {invoice.total?.toFixed(2) || '0.00'}</span>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Amount Received:</span>
                  <span className="font-semibold text-green-600">AED {(invoice.amountReceived || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Pending:</span>
                  <span className="font-semibold text-orange-600">
                    AED {((invoice.total || 0) - (invoice.amountReceived || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button onClick={handleDownloadPDF} disabled={generating} className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  {generating ? 'Generating PDF...' : 'Download PDF'}
                </Button>
                <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {saving ? 'Saving...' : isEditMode ? 'Update Invoice' : 'Create Invoice'}
                </Button>
                <Link href="/invoices" className="block">
                  <Button variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
