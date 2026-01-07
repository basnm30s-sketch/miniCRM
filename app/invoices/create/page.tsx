'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Plus, Trash2, FileText, Sheet, FileType, Pencil } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  getInvoiceById,
  getAllInvoices,
  saveInvoice,
  getAllCustomers,
  getAllQuotes,
  getAllPurchaseOrders,
  getAllVehicles,
  generateInvoiceNumber,
  generateId,
  getAdminSettings,
  getQuoteById,
  convertQuoteToInvoice,
} from '@/lib/storage'
import { pdfRenderer } from '@/lib/pdf'
import { excelRenderer } from '@/lib/excel'
import { docxRenderer } from '@/lib/docx'
import { Invoice, InvoiceItem } from '@/lib/storage'
import type { AdminSettings, Quote, Vehicle } from '@/lib/types'
import { validateInvoice, validateInvoiceForExport, ValidationError } from '@/lib/validation'

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [sourceQuote, setSourceQuote] = useState<Quote | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isValidForExport, setIsValidForExport] = useState(false)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isInvoiceNumberEditable, setIsInvoiceNumberEditable] = useState(false)
  const [quoteNumberDisplay, setQuoteNumberDisplay] = useState('')
  const [poNumberDisplay, setPoNumberDisplay] = useState('')
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    serialNumber: true,
    itemName: true,
    vehicleNumber: true,
    description: true,
    rentalBasis: true,
    quantity: true,
    rate: true,
    grossAmount: true,
    tax: true,
    netAmount: true,
    amountReceived: true,
  })

  const snapshotInvoice = (inv: Invoice) => {
    // Exclude timestamp fields so they don't cause dirty state flips
    const { createdAt: _createdAt, ...rest } = inv as any
    return JSON.stringify(rest)
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersData, quotesData, posData, vehiclesData, settingsData] = await Promise.all([
          getAllCustomers(),
          getAllQuotes(),
          getAllPurchaseOrders(),
          getAllVehicles(),
          getAdminSettings(),
        ])

        setCustomers(customersData)
        setQuotes(quotesData)
        setPurchaseOrders(posData)
        setVehicles(vehiclesData)
        setAdminSettings(settingsData)

        // Check URL parameters
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
        const invoiceId = urlParams?.get('id')
        const quoteId = urlParams?.get('quoteId')

        if (invoiceId) {
          // Editing existing invoice
          const existing = await getInvoiceById(invoiceId)
          if (existing) {
            setInvoice(existing)
            setIsEditMode(true)
            setSavedSnapshot(snapshotInvoice(existing))
            setIsDirty(false)
          }
        } else if (quoteId) {
          // Creating invoice from quote
          try {
            const quote = await getQuoteById(quoteId)
            if (quote) {
              setSourceQuote(quote)
              const convertedInvoice = await convertQuoteToInvoice(quote)
              setInvoice(convertedInvoice)
            } else {
              toast({
                title: 'Error',
                description: 'Quote not found',
                variant: 'destructive',
              })
            }
          } catch (error: any) {
            console.error('Error converting quote to invoice:', error)
            toast({
              title: 'Error',
              description: error.message || 'Failed to convert quote to invoice',
              variant: 'destructive',
            })
          }
        } else {
          // New invoice
          const newNumber = await generateInvoiceNumber()
          setInvoice((prev) => ({
            ...prev,
            id: generateId(),
            number: newNumber,
            // Prefill notes with default terms from admin settings if available
            notes: settingsData?.defaultTerms || '',
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
    let subTotal = 0
    let totalTax = 0

    items.forEach((item, index) => {
      // Calculate gross amount (quantity * unitPrice)
      const grossAmount = item.quantity * item.unitPrice
      
      // Calculate tax: prefer taxPercent (new) over tax (legacy)
      let itemTax = 0
      if (item.taxPercent !== undefined && item.taxPercent !== null) {
        itemTax = grossAmount * (item.taxPercent / 100)
      } else if (item.tax !== undefined && item.tax !== null) {
        itemTax = item.tax
      }
      
      const lineTotal = grossAmount + itemTax
      
      // Update item with calculated values
      item.grossAmount = grossAmount
      item.lineTaxAmount = itemTax
      item.lineTotal = lineTotal
      item.serialNumber = index + 1
      // Keep total for backward compatibility
      item.total = lineTotal
      
      subTotal += grossAmount
      totalTax += itemTax
    })

    // If no item-level tax, use the provided tax value
    const finalTax = totalTax > 0 ? totalTax : tax
    const total = subTotal + finalTax
    
    // Calculate total amount received from line items
    const totalAmountReceived = items.reduce((sum, item) => sum + (item.amountReceived || 0), 0)
    
    return { subtotal: subTotal, total, tax: finalTax, amountReceived: totalAmountReceived }
  }

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: generateId(),
      serialNumber: invoice.items.length + 1,
      vehicleTypeId: '',
      vehicleTypeLabel: '',
      vehicleNumber: '',
      description: '',
      rentalBasis: undefined,
      quantity: 1,
      unitPrice: 0,
      taxPercent: 0,
      grossAmount: 0,
      lineTaxAmount: 0,
      lineTotal: 0,
      total: 0,
    }
    const newItems = [...invoice.items, newItem]
    const { subtotal, total, amountReceived } = calculateTotals(newItems, invoice.tax)
    setInvoice({
      ...invoice,
      items: newItems,
      subtotal,
      total,
      amountReceived,
    })
  }

  const handleRemoveItem = (itemId: string) => {
    const newItems = invoice.items.filter((item) => item.id !== itemId)
    const { subtotal, total, amountReceived } = calculateTotals(newItems, invoice.tax)
    setInvoice({
      ...invoice,
      items: newItems,
      subtotal,
      total,
      amountReceived,
    })
  }

  const handleItemChange = (itemId: string, field: keyof InvoiceItem, value: any) => {
    const newItems = invoice.items.map((item) => {
      if (item.id !== itemId) return item

      const updated = { ...item, [field]: value }

      // If changing vehicle type, update the label, vehicle number, and description
      if (field === 'vehicleTypeId' && value) {
        const vehicle = vehicles.find((v) => v.id === value)
        if (vehicle) {
          updated.vehicleTypeLabel = vehicle.vehicleType || vehicle.vehicleNumber || ''
          updated.vehicleNumber = vehicle.vehicleNumber || ''
          updated.description = vehicle.description || ''
        }
      }

      // Recalculate item totals when relevant fields change
      if (field === 'quantity' || field === 'unitPrice' || field === 'taxPercent' || field === 'tax') {
        const grossAmount = (updated.quantity || 0) * (updated.unitPrice || 0)
        let itemTax = 0
        if (updated.taxPercent !== undefined && updated.taxPercent !== null) {
          itemTax = grossAmount * (updated.taxPercent / 100)
        } else if (updated.tax !== undefined && updated.tax !== null) {
          itemTax = updated.tax
        }
        const lineTotal = grossAmount + itemTax
        
        updated.grossAmount = grossAmount
        updated.lineTaxAmount = itemTax
        updated.lineTotal = lineTotal
        updated.total = lineTotal // Keep for backward compatibility
      }

      return updated
    })

    const { subtotal, total, tax, amountReceived } = calculateTotals(newItems, invoice.tax)
    const updatedInvoice = {
      ...invoice,
      items: newItems,
      subtotal,
      tax,
      amountReceived,
      total,
    }
    setInvoice(updatedInvoice)
    // Trigger validation
    validateInvoiceState(updatedInvoice)
  }

  // Real-time validation
  const validateInvoiceState = (invoiceToValidate: Invoice) => {
    const result = validateInvoiceForExport(invoiceToValidate)
    setValidationErrors(result.errors)
    setIsValidForExport(result.isValid)
  }

  useEffect(() => {
    validateInvoiceState(invoice)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice])

  useEffect(() => {
    if (!savedSnapshot) {
      setIsDirty(false)
      return
    }
    setIsDirty(snapshotInvoice(invoice) !== savedSnapshot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, savedSnapshot])

  const exportDisabledReason = useMemo(() => {
    if (generating) return 'Generating...'
    if (isEditMode && isDirty) return 'Update to enable export'
    if (!isValidForExport) return 'Complete required fields to enable export'
    return null
  }, [generating, isEditMode, isDirty, isValidForExport])

  const exportTitle = useMemo(() => {
    if (exportDisabledReason) return exportDisabledReason
    if (!isEditMode && !invoice.createdAt) return 'Will create this record, then download.'
    return ''
  }, [exportDisabledReason, isEditMode, invoice.createdAt])

  const handleTaxChange = (newTax: number) => {
    const total = invoice.subtotal + newTax
    const updatedInvoice = {
      ...invoice,
      tax: newTax,
      total,
    }
    setInvoice(updatedInvoice)
    validateInvoiceState(updatedInvoice)
  }

  const handleSave = async (opts?: { redirectAfterSave?: boolean }): Promise<boolean> => {
    // Comprehensive validation
    const validation = await validateInvoice(invoice, {
      checkUniqueness: true,
      excludeInvoiceId: isEditMode ? invoice.id : undefined,
      checkCustomerExists: true,
      checkQuoteExists: true,
      checkPOExists: true,
    })

    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      const firstError = validation.errors[0]
      toast({
        title: 'Validation Error',
        description: firstError?.message || 'Please fix the validation errors',
        variant: 'destructive',
      })
      return false
    }

    try {
      setSaving(true)
      const now = new Date().toISOString()
      const invoiceToSave: Invoice = {
        ...invoice,
        createdAt: invoice.createdAt || now,
      }
      await saveInvoice(invoiceToSave)
      setInvoice(invoiceToSave)
      setSavedSnapshot(snapshotInvoice(invoiceToSave))
      setIsDirty(false)
      toast({
        title: 'Success',
        description: isEditMode ? 'Invoice updated successfully' : 'Invoice created successfully',
      })
      setValidationErrors([])
      if (!isEditMode) setIsEditMode(true)
      if (opts?.redirectAfterSave !== false) {
        // Redirect to invoices list
        window.location.href = '/invoices'
      }
      return true
    } catch (err) {
      console.error('Error saving invoice:', err)
      toast({ title: 'Error', description: 'Failed to save invoice', variant: 'destructive' })
      return false
    } finally {
      setSaving(false)
    }
  }

  const ensureSavedForExport = async (): Promise<boolean> => {
    // Edit mode must export persisted state only
    if (isEditMode && isDirty) {
      toast({ title: 'Update required', description: 'Please update/save before exporting', variant: 'destructive' })
      return false
    }

    // Create mode: save first (no redirect) then export
    if (!isEditMode && !invoice.createdAt) {
      return await handleSave({ redirectAfterSave: false })
    }
    return true
  }

  const handleDownloadPDF = async () => {
    if (!adminSettings) {
      toast({ title: 'Error', description: 'Admin settings not loaded', variant: 'destructive' })
      return
    }

    const okToExport = await ensureSavedForExport()
    if (!okToExport) return

    // Validation using shared validation function
    const validation = validateInvoiceForExport(invoice)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      const firstError = validation.errors[0]
      toast({
        title: 'Validation Error',
        description: firstError?.message || 'Please fix the validation errors before exporting',
        variant: 'destructive',
      })
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

  const handleDownloadExcel = async () => {
    if (!adminSettings) {
      toast({ title: 'Error', description: 'Admin settings not loaded', variant: 'destructive' })
      return
    }

    const okToExport = await ensureSavedForExport()
    if (!okToExport) return

    // Validation using shared validation function
    const validation = validateInvoiceForExport(invoice)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      const firstError = validation.errors[0]
      toast({
        title: 'Validation Error',
        description: firstError?.message || 'Please fix the validation errors before exporting',
        variant: 'destructive',
      })
      return
    }

    const customer = customers.find((c) => c.id === invoice.customerId)
    const customerName = customer?.name || 'Unknown Customer'

    setGenerating(true)
    try {
      const excelBlob = await excelRenderer.renderInvoiceToExcel(invoice, adminSettings, customerName)
      const filename = `invoice-${invoice.number}.xlsx`
      excelRenderer.downloadExcel(excelBlob, filename)
      toast({ title: 'Success', description: 'Excel file downloaded successfully' })
    } catch (err) {
      console.error('Failed to generate Excel:', err)
      toast({ title: 'Error', description: 'Failed to generate Excel file', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadDocx = async () => {
    if (!adminSettings) {
      toast({ title: 'Error', description: 'Admin settings not loaded', variant: 'destructive' })
      return
    }

    const okToExport = await ensureSavedForExport()
    if (!okToExport) return

    // Validation using shared validation function
    const validation = validateInvoiceForExport(invoice)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      const firstError = validation.errors[0]
      toast({
        title: 'Validation Error',
        description: firstError?.message || 'Please fix the validation errors before exporting',
        variant: 'destructive',
      })
      return
    }

    const customer = customers.find((c) => c.id === invoice.customerId)
    const customerName = customer?.name || 'Unknown Customer'

    setGenerating(true)
    try {
      const docxBlob = await docxRenderer.renderInvoiceToDocx(invoice, adminSettings, customerName)
      const filename = `invoice-${invoice.number}.docx`
      docxRenderer.downloadDocx(docxBlob, filename)
      toast({ title: 'Success', description: 'Word document downloaded successfully' })
    } catch (err) {
      console.error('Failed to generate DOCX:', err)
      toast({ title: 'Error', description: 'Failed to generate Word document', variant: 'destructive' })
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
        {sourceQuote && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Created from Quote:</span> {sourceQuote.number} - {sourceQuote.customer?.name || 'N/A'}
            </p>
          </div>
        )}
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
                  <Label htmlFor="number" className="text-slate-700 flex items-center gap-2">
                    Invoice Number
                    {!isInvoiceNumberEditable && (
                      <button
                        type="button"
                        onClick={() => setIsInvoiceNumberEditable(true)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit invoice number"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </Label>
                  <input
                    id="number"
                    type="text"
                    value={invoice.number}
                    disabled={!isInvoiceNumberEditable}
                    onChange={(e) => {
                      const value = e.target.value
                      // Validate format: Invoice-XXX where XXX is digits
                      if (value === '' || /^Invoice-\d+$/.test(value)) {
                        setInvoice((prev) => ({ ...prev, number: value }))
                      }
                    }}
                    onBlur={() => {
                      // Validate on blur - if invalid, revert to previous value
                      if (!/^Invoice-\d+$/.test(invoice.number) && invoice.number !== '') {
                        toast({
                          title: 'Invalid Format',
                          description: 'Invoice number must be in format Invoice-XXX (e.g., Invoice-001)',
                          variant: 'destructive',
                        })
                        // Revert to previous valid number or generate new one
                        generateInvoiceNumber().then((newNumber) => {
                          setInvoice((prev) => ({ ...prev, number: newNumber }))
                        })
                      }
                    }}
                    className={`w-full mt-2 px-3 py-2 border border-slate-300 rounded-md ${isInvoiceNumberEditable ? 'bg-white text-slate-900' : 'bg-slate-50 text-slate-900'}`}
                    placeholder="Invoice-001"
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
                    onChange={(e) => {
                      const updated = { ...invoice, date: e.target.value }
                      setInvoice(updated)
                      validateInvoiceState(updated)
                    }}
                    className={`w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900 ${validationErrors.some((e) => e.field === 'date') ? 'border-red-500' : ''
                      }`}
                  />
                  {validationErrors
                    .filter((e) => e.field === 'date')
                    .map((error, idx) => (
                      <p key={idx} className="text-xs text-red-600 mt-1">
                        {error.message}
                      </p>
                    ))}
                </div>
                <div>
                  <Label htmlFor="dueDate" className="text-slate-700">
                    Due Date
                  </Label>
                  <input
                    id="dueDate"
                    type="date"
                    value={invoice.dueDate || ''}
                    onChange={(e) => {
                      const updated = { ...invoice, dueDate: e.target.value }
                      setInvoice(updated)
                      validateInvoiceState(updated)
                    }}
                    className={`w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900 ${validationErrors.some((e) => e.field === 'dueDate') ? 'border-red-500' : ''
                      }`}
                  />
                  {validationErrors
                    .filter((e) => e.field === 'dueDate')
                    .map((error, idx) => (
                      <p key={idx} className="text-xs text-red-600 mt-1">
                        {error.message}
                      </p>
                    ))}
                </div>
              </div>

              <div>
                <Label htmlFor="amountReceived" className="text-slate-700">
                  Total Amount Received (AED)
                </Label>
                <input
                  id="amountReceived"
                  type="number"
                  step="0.01"
                  min="0"
                  max={invoice.total || 0}
                  value={invoice.amountReceived || 0}
                  disabled
                  className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-slate-50"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Calculated from line items. Pending: AED {((invoice.total || 0) - (invoice.amountReceived || 0)).toFixed(2)}
                </p>
              </div>

              <div>
                <Label htmlFor="customer" className="text-slate-700">
                  Customer *
                </Label>
                <select
                  id="customer"
                  value={invoice.customerId || ''}
                  onChange={(e) => {
                    const updated = { ...invoice, customerId: e.target.value }
                    setInvoice(updated)
                    setTimeout(() => validateInvoiceState(updated), 100)
                  }}
                  className={`w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900 ${validationErrors.some((e) => e.field === 'customerId') ? 'border-red-500' : ''
                    }`}
                >
                  <option value="">Select Customer</option>
                  {customers.map((c, idx) => (
                    <option key={c.id ?? `customer-${idx}`} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {validationErrors
                  .filter((e) => e.field === 'customerId')
                  .map((error, idx) => (
                    <p key={idx} className="text-xs text-red-600 mt-1">
                      {error.message}
                    </p>
                  ))}
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
                      const quoteId = e.target.value.replace('quote:', '')
                      const selectedQuote = quotes.find(q => q.id === quoteId)
                      setQuoteNumberDisplay(selectedQuote?.number || '')
                      setPoNumberDisplay('')
                      setInvoice({ ...invoice, quoteId, purchaseOrderId: '' })
                    } else if (e.target.value.startsWith('po:')) {
                      const poId = e.target.value.replace('po:', '')
                      const selectedPO = purchaseOrders.find(po => po.id === poId)
                      setPoNumberDisplay(selectedPO?.number || '')
                      setQuoteNumberDisplay('')
                      setInvoice({ ...invoice, purchaseOrderId: poId, quoteId: '' })
                    } else {
                      setQuoteNumberDisplay('')
                      setPoNumberDisplay('')
                      setInvoice({ ...invoice, quoteId: '', purchaseOrderId: '' })
                    }
                  }}
                  className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900"
                >
                  <option value="">None</option>
                  {quotes.length > 0 && (
                    <optgroup label="Quotes">
                      {quotes.map((q, idx) => (
                        <option key={q.id ?? `quote-${idx}`} value={`quote:${q.id}`}>
                          {q.number}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {purchaseOrders.length > 0 && (
                    <optgroup label="Purchase Orders">
                      {purchaseOrders.map((po, idx) => (
                        <option key={po.id ?? `po-${idx}`} value={`po:${po.id}`}>
                          {po.number}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quoteNumberDisplay" className="text-slate-700">
                    Q# (Quote Number Reference)
                  </Label>
                  <input
                    id="quoteNumberDisplay"
                    type="text"
                    value={quoteNumberDisplay}
                    onChange={(e) => setQuoteNumberDisplay(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900"
                    placeholder="Quote-001"
                  />
                </div>
                <div>
                  <Label htmlFor="poNumberDisplay" className="text-slate-700">
                    PO# (Purchase Order Number Reference)
                  </Label>
                  <input
                    id="poNumberDisplay"
                    type="text"
                    value={poNumberDisplay}
                    onChange={(e) => setPoNumberDisplay(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900"
                    placeholder="PO-001"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Line Items</CardTitle>
                  <CardDescription>Add vehicles and services to the invoice</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowColumnCustomizer(true)}
                  className="text-sm"
                >
                  Customize Columns
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      {visibleColumns.serialNumber !== false && <th className="text-center p-2">Sl. no.</th>}
                      {visibleColumns.itemName !== false && <th className="text-left p-2">Item name</th>}
                      {visibleColumns.vehicleNumber !== false && <th className="text-left p-2">Vehicle number</th>}
                      {visibleColumns.description !== false && <th className="text-left p-2">Description</th>}
                      {visibleColumns.rentalBasis !== false && <th className="text-center p-2">Rental basis</th>}
                      {visibleColumns.quantity !== false && <th className="text-right p-2">Qty</th>}
                      {visibleColumns.rate !== false && <th className="text-right p-2">Rate</th>}
                      {visibleColumns.grossAmount !== false && <th className="text-right p-2">Gross amount</th>}
                      {visibleColumns.tax !== false && <th className="text-right p-2">Tax</th>}
                      {visibleColumns.netAmount !== false && <th className="text-right p-2">Net amount</th>}
                      {visibleColumns.amountReceived !== false && <th className="text-right p-2">Amount Received</th>}
                      <th className="text-center p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => {
                      const quantityLabel = item.rentalBasis === 'hourly' ? 'Qty (total hours)' : item.rentalBasis === 'monthly' ? 'Qty (total months)' : 'Qty'
                      const rateLabel = item.rentalBasis === 'hourly' ? 'Rate per hour' : item.rentalBasis === 'monthly' ? 'Rate per month' : 'Rate'
                      return (
                        <tr key={item.id ?? `invoice-item-${index}`} className="border-b hover:bg-slate-50">
                          {visibleColumns.serialNumber !== false && (
                            <td className="p-2 text-center text-slate-700">
                              {item.serialNumber || index + 1}
                            </td>
                          )}
                          {visibleColumns.itemName !== false && (
                            <td className="p-2">
                              <Select
                                value={item.vehicleTypeId || '__manual__'}
                                onValueChange={(value) => handleItemChange(item.id, 'vehicleTypeId', value === '__manual__' ? '' : value)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select vehicle..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__manual__">Manual Entry</SelectItem>
                                  {vehicles.map((vehicle, idx) => (
                                    <SelectItem key={vehicle.id ?? `vehicle-${idx}`} value={vehicle.id}>
                                      {vehicle.vehicleType || vehicle.vehicleNumber || 'Unknown Vehicle'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          )}
                          {visibleColumns.vehicleNumber !== false && (
                            <td className="p-2 text-slate-700">
                              {item.vehicleNumber || '-'}
                            </td>
                          )}
                          {visibleColumns.description !== false && (
                            <td className="p-2">
                              <Input
                                type="text"
                                value={item.description || ''}
                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                placeholder="Description"
                                className="h-8 text-slate-900"
                              />
                            </td>
                          )}
                          {visibleColumns.rentalBasis !== false && (
                            <td className="p-2">
                              <Select
                                value={item.rentalBasis || '__none__'}
                                onValueChange={(value) => handleItemChange(item.id, 'rentalBasis', value === '__none__' ? undefined : value)}
                              >
                                <SelectTrigger className="h-8 w-32">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">None</SelectItem>
                                  <SelectItem value="hourly">Hourly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          )}
                          {visibleColumns.quantity !== false && (
                            <td className="p-2 text-right">
                              <div className="flex flex-col">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.quantity && item.quantity > 0 ? item.quantity : ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                                    handleItemChange(item.id, 'quantity', val)
                                  }}
                                  className="h-8 w-20 text-right text-slate-900"
                                  placeholder="0"
                                />
                                <span className="text-xs text-slate-500 mt-1">{quantityLabel}</span>
                              </div>
                            </td>
                          )}
                          {visibleColumns.rate !== false && (
                            <td className="p-2 text-right">
                              <div className="flex flex-col">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice && item.unitPrice > 0 ? item.unitPrice : ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                                    handleItemChange(item.id, 'unitPrice', val)
                                  }}
                                  className="h-8 w-24 text-right text-slate-900"
                                  placeholder="0.00"
                                />
                                <span className="text-xs text-slate-500 mt-1">{rateLabel}</span>
                              </div>
                            </td>
                          )}
                          {visibleColumns.grossAmount !== false && (
                            <td className="p-2 text-right text-slate-700">
                              {(item.grossAmount || 0).toFixed(2)}
                            </td>
                          )}
                          {visibleColumns.tax !== false && (
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.taxPercent !== undefined && item.taxPercent !== null ? item.taxPercent : (item.tax || 0)}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                                  if (item.taxPercent !== undefined && item.taxPercent !== null) {
                                    handleItemChange(item.id, 'taxPercent', val)
                                  } else {
                                    handleItemChange(item.id, 'tax', val)
                                  }
                                }}
                                className="h-8 w-20 text-right text-slate-900"
                                placeholder="0"
                              />
                            </td>
                          )}
                          {visibleColumns.netAmount !== false && (
                            <td className="p-2 text-right text-slate-700 font-semibold">
                              {(item.lineTotal || item.total || 0).toFixed(2)}
                            </td>
                          )}
                          {visibleColumns.amountReceived !== false && (
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={item.lineTotal || item.total || 0}
                                value={item.amountReceived && item.amountReceived > 0 ? item.amountReceived : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                                  const maxAmount = item.lineTotal || item.total || 0
                                  if (val <= maxAmount) {
                                    handleItemChange(item.id, 'amountReceived', val)
                                  }
                                }}
                                className="h-8 w-24 text-right text-slate-900"
                                placeholder="0.00"
                              />
                            </td>
                          )}
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <Button onClick={handleAddItem} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Line Item
              </Button>
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

              {validationErrors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                  <p className="text-sm font-semibold text-red-800 mb-1">Validation Errors:</p>
                  <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                    {validationErrors.slice(0, 3).map((error, idx) => (
                      <li key={idx}>{error.message}</li>
                    ))}
                    {validationErrors.length > 3 && (
                      <li className="text-red-600">...and {validationErrors.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
              <div className="pt-4 space-y-2">
                <Button
                  onClick={handleDownloadPDF}
                  disabled={!!exportDisabledReason}
                  className="w-full bg-action-pdf hover:bg-action-pdf/90 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  title={exportTitle}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {generating ? 'Generating PDF...' : 'Save PDF'}
                </Button>
                <Button
                  onClick={handleDownloadExcel}
                  disabled={!!exportDisabledReason}
                  className="w-full bg-action-excel hover:bg-action-excel/90 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  title={exportTitle}
                >
                  <Sheet className="w-4 h-4 mr-2" />
                  {generating ? 'Generating Excel...' : 'Save Excel'}
                </Button>
                <Button
                  onClick={handleDownloadDocx}
                  disabled={!!exportDisabledReason}
                  className="w-full bg-action-word hover:bg-action-word/90 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  title={exportTitle}
                >
                  <FileType className="w-4 h-4 mr-2" />
                  {generating ? 'Generating Word...' : 'Save Word'}
                </Button>
                <Button
                  onClick={() => handleSave({ redirectAfterSave: false })}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  {saving ? 'Saving...' : isEditMode ? 'Update Invoice' : 'Create Invoice'}
                </Button>
                <Link href="/invoices" className="block">
                  <Button variant="outline" className="w-full shadow-sm hover:bg-slate-50">
                    Cancel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Column Customization Dialog */}
      <Dialog open={showColumnCustomizer} onOpenChange={setShowColumnCustomizer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize Columns</DialogTitle>
            <DialogDescription>
              Select which columns to display in the line items table
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {[
              { key: 'serialNumber', label: 'Sl. no.' },
              { key: 'itemName', label: 'Item name' },
              { key: 'vehicleNumber', label: 'Vehicle number' },
              { key: 'description', label: 'Description' },
              { key: 'rentalBasis', label: 'Rental basis' },
              { key: 'quantity', label: 'Qty' },
              { key: 'rate', label: 'Rate' },
              { key: 'grossAmount', label: 'Gross amount' },
              { key: 'tax', label: 'Tax' },
              { key: 'netAmount', label: 'Net amount' },
              { key: 'amountReceived', label: 'Amount Received' },
            ].map((col) => (
              <div key={col.key} className="flex items-center space-x-2">
                <Checkbox
                  id={col.key}
                  checked={visibleColumns[col.key] !== false}
                  onCheckedChange={(checked) => {
                    setVisibleColumns((prev) => ({ ...prev, [col.key]: checked !== false }))
                  }}
                />
                <Label htmlFor={col.key} className="font-normal cursor-pointer">
                  {col.label}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowColumnCustomizer(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
