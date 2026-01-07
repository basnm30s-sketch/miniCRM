'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import RichTextEditor from '@/components/ui/rich-text-editor'
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
// Replaced top-of-page alerts with toast notifications
import { toast } from '@/hooks/use-toast'
import { Plus, Trash2, ArrowLeft, FileText, Sheet, FileType, Pencil } from 'lucide-react'
import {
  getAdminSettings,
  initializeAdminSettings,
  getQuoteById,
  getAllCustomers,
  getAllVehicles,
  generateQuoteNumber,
  generateId,
  saveQuote,
  initializeSampleData,
  saveCustomer,
} from '@/lib/storage'
import { pdfRenderer } from '@/lib/pdf'
import { excelRenderer } from '@/lib/excel'
import { docxRenderer } from '@/lib/docx'
import { Quote, QuoteLineItem, AdminSettings, Customer, Vehicle } from '@/lib/types'
import { validateQuote, validateQuoteForExport, ValidationError } from '@/lib/validation'

export default function CreateQuotePage() {
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerCompany, setNewCustomerCompany] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isValidForExport, setIsValidForExport] = useState(false)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isQuoteNumberEditable, setIsQuoteNumberEditable] = useState(false)
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
  })
  // top-of-page alerts replaced by toast notifications

  const [quote, setQuote] = useState<Quote>({
    id: generateId(),
    number: '',
    date: new Date().toISOString().split('T')[0],
    validUntil: undefined,
    currency: 'AED',
    customer: { id: '', name: '', company: '', email: '', phone: '', address: '' },
    items: [
      {
        id: generateId(),
        vehicleTypeId: '',
        vehicleTypeLabel: '',
        quantity: 1,
        unitPrice: 0,
        taxPercent: 0,
      },
    ],
    subTotal: 0,
    totalTax: 0,
    total: 0,
    terms: '',
    notes: '',
  })
  const [isEditMode, setIsEditMode] = useState(false)

  const snapshotQuote = (q: Quote) => {
    // Exclude timestamp fields so they don't cause dirty state flips
    const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = q as any
    return JSON.stringify(rest)
  }

  useEffect(() => {
    async function loadData() {
      try {
        // Initialize sample data (vehicles)
        await initializeSampleData()

        // Load admin settings
        const settings = await getAdminSettings()
        if (settings) {
          setAdminSettings(settings)
          // If admin settings define default terms, prefill the quote's terms
          if (settings.defaultTerms) {
            setQuote((prev) => ({ ...prev, terms: settings.defaultTerms }))
          }
        } else {
          const initialized = await initializeAdminSettings()
          setAdminSettings(initialized)
          if (initialized.defaultTerms) {
            setQuote((prev) => ({ ...prev, terms: initialized.defaultTerms }))
          }
        }

        // Load customers and vehicles
        const customersData = await getAllCustomers()
        const vehiclesData = await getAllVehicles()

        setCustomers(customersData)
        setVehicles(vehiclesData)

        // If editing existing quote (id in query), load it
        const id = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null
        if (id) {
          const existing = await getQuoteById(id)
          if (existing) {
            setQuote(existing)
            setIsEditMode(true)
            setSavedSnapshot(snapshotQuote(existing))
            setIsDirty(false)
          }
        } else {
          // Set quote number for new quote
          if (!quote.number) {
            const newNumber = await generateQuoteNumber()
            setQuote((prev) => ({
              ...prev,
              number: newNumber,
            }))
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err)
        toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const calculateTotals = (items: QuoteLineItem[]): { subTotal: number; totalTax: number; total: number } => {
    let subTotal = 0
    let totalTax = 0

    items.forEach((item, index) => {
      // Calculate gross amount (quantity * unitPrice)
      const grossAmount = item.quantity * item.unitPrice
      const itemTax = grossAmount * (item.taxPercent / 100)
      const lineTotal = grossAmount + itemTax
      
      // Update item with calculated values
      item.grossAmount = grossAmount
      item.lineTaxAmount = itemTax
      item.lineTotal = lineTotal
      item.serialNumber = index + 1
      
      subTotal += grossAmount
      totalTax += itemTax
    })

    return {
      subTotal,
      totalTax,
      total: subTotal + totalTax,
    }
  }

  const handleAddLineItem = () => {
    const newItem: QuoteLineItem = {
      id: generateId(),
      serialNumber: quote.items.length + 1,
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
    }

    const newItems = [...quote.items, newItem]
    const totals = calculateTotals(newItems)

    setQuote({
      ...quote,
      items: newItems,
      ...totals,
    })
  }

  const handleRemoveLineItem = (itemId: string) => {
    const newItems = quote.items.filter((item) => item.id !== itemId)
    const totals = calculateTotals(newItems)

    setQuote({
      ...quote,
      items: newItems,
      ...totals,
    })
  }

  const handleLineItemChange = (
    itemId: string,
    field: keyof QuoteLineItem,
    value: any
  ) => {
    const newItems = quote.items.map((item) => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value }

        // If changing vehicle type, update the label, vehicle number, and description
        if (field === 'vehicleTypeId' && value) {
          const vehicle = vehicles.find((v) => v.id === value)
          if (vehicle) {
            updated.vehicleTypeLabel = vehicle.vehicleType || vehicle.vehicleNumber || ''
            updated.vehicleNumber = vehicle.vehicleNumber || ''
            updated.description = vehicle.description || ''
            // Optionally set default rental basis from vehicle if it has one
            // (This would require adding rentalBasis to Vehicle type if needed)
          }
        }

        return updated
      }
      return item
    })

    const totals = calculateTotals(newItems)

    const updatedQuote = {
      ...quote,
      items: newItems,
      ...totals,
    }
    setQuote(updatedQuote)
    // Trigger validation
    validateQuoteState(updatedQuote)
  }

  // Real-time validation
  const validateQuoteState = (quoteToValidate: Quote) => {
    const result = validateQuoteForExport(quoteToValidate)
    setValidationErrors(result.errors)
    setIsValidForExport(result.isValid)
  }

  useEffect(() => {
    validateQuoteState(quote)
  }, [quote])

  useEffect(() => {
    if (!savedSnapshot) {
      setIsDirty(false)
      return
    }
    setIsDirty(snapshotQuote(quote) !== savedSnapshot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote, savedSnapshot])

  const exportDisabledReason = useMemo(() => {
    if (generating) return 'Generating...'
    if (isEditMode && isDirty) return 'Update to enable export'
    if (!isValidForExport) return 'Complete required fields to enable export'
    return null
  }, [generating, isEditMode, isDirty, isValidForExport])

  const exportTitle = useMemo(() => {
    if (exportDisabledReason) return exportDisabledReason
    if (!isEditMode && !quote.createdAt) return 'Will create this record, then download.'
    return ''
  }, [exportDisabledReason, isEditMode, quote.createdAt])

  const handleCustomerChange = (customerId: string) => {
    const selectedCustomer = customers.find((c) => c.id === customerId)
    if (selectedCustomer) {
      const updatedQuote = {
        ...quote,
        customer: selectedCustomer,
      }
      setQuote(updatedQuote)
      validateQuoteState(updatedQuote)
    }
  }

  const handleSaveQuote = async (opts?: { redirectAfterSave?: boolean }): Promise<boolean> => {
    // Comprehensive validation
    const validation = await validateQuote(quote, {
      checkUniqueness: true,
      excludeQuoteId: isEditMode ? quote.id : undefined,
      checkCustomerExists: true,
      checkVehiclesExist: true,
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

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const quoteToSave: Quote = {
        ...quote,
        createdAt: quote.createdAt || now,
        updatedAt: now,
      }
      await saveQuote(quoteToSave)
      setQuote(quoteToSave)
      setSavedSnapshot(snapshotQuote(quoteToSave))
      setIsDirty(false)
      toast({ title: 'Saved', description: `Quote ${quote.number} saved successfully` })
      setValidationErrors([])
      if (!isEditMode) setIsEditMode(true)
      // No redirects for quotes page currently; keep option for parity.
      if (opts?.redirectAfterSave) {
        window.location.href = '/quotations'
      }
      return true
    } catch (err) {
      console.error('Failed to save quote:', err)
      toast({ title: 'Error', description: 'Failed to save quote', variant: 'destructive' })
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
    if (!isEditMode && !quote.createdAt) {
      return await handleSaveQuote({ redirectAfterSave: false })
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
    const validation = validateQuoteForExport(quote)
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

    setGenerating(true)
    try {
      const pdfBlob = await pdfRenderer.renderQuoteToPdf(quote, adminSettings)
      const filename = `quote-${quote.number}.pdf`
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
    const validation = validateQuoteForExport(quote)
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

    setGenerating(true)
    try {
      const excelBlob = await excelRenderer.renderQuoteToExcel(quote, adminSettings)
      const filename = `quote-${quote.number}.xlsx`
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
    const validation = validateQuoteForExport(quote)
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

    setGenerating(true)
    try {
      const docxBlob = await docxRenderer.renderQuoteToDocx(quote, adminSettings)
      const filename = `quote-${quote.number}.docx`
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
      <div className="flex items-center justify-center p-8">
        <p>Loading quote editor...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/quotations">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotations
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">
          {isEditMode ? 'Edit Quotation' : 'Create New Quotation'}
        </h1>
        <p className="text-slate-500 mt-1">
          {isEditMode ? `Quote ${quote.number}` : 'Fill in the details and generate a PDF quote'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="col-span-2 space-y-6">
          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quoteNumber" className="text-slate-700 flex items-center gap-2">
                    Quote Number
                    {!isQuoteNumberEditable && (
                      <button
                        type="button"
                        onClick={() => setIsQuoteNumberEditable(true)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit quote number"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </Label>
                  <Input
                    id="quoteNumber"
                    value={quote.number}
                    disabled={!isQuoteNumberEditable}
                    onChange={(e) => {
                      const value = e.target.value
                      // Validate format: Quote-XXX where XXX is digits
                      if (value === '' || /^Quote-\d+$/.test(value)) {
                        setQuote((prev) => ({ ...prev, number: value }))
                      }
                    }}
                    onBlur={() => {
                      // Validate on blur - if invalid, revert to previous value
                      if (!/^Quote-\d+$/.test(quote.number) && quote.number !== '') {
                        toast({
                          title: 'Invalid Format',
                          description: 'Quote number must be in format Quote-XXX (e.g., Quote-001)',
                          variant: 'destructive',
                        })
                        // Revert to previous valid number or generate new one
                        generateQuoteNumber().then((newNumber) => {
                          setQuote((prev) => ({ ...prev, number: newNumber }))
                        })
                      }
                    }}
                    className={`mt-2 ${isQuoteNumberEditable ? 'bg-white text-slate-900' : 'bg-slate-50 text-slate-900'}`}
                    placeholder="Quote-001"
                  />
                </div>
                <div>
                  <Label htmlFor="quoteDate" className="text-slate-700">Date</Label>
                  <Input
                    id="quoteDate"
                    type="date"
                    value={quote.date}
                    onChange={(e) => {
                      const updated = { ...quote, date: e.target.value }
                      setQuote(updated)
                      validateQuoteState(updated)
                    }}
                    className={`mt-2 text-slate-900 ${validationErrors.some((e) => e.field === 'date') ? 'border-red-500' : ''
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="validUntil" className="text-slate-700">Valid Until (optional)</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={quote.validUntil || ''}
                    onChange={(e) => {
                      const updated = { ...quote, validUntil: e.target.value || undefined }
                      setQuote(updated)
                      validateQuoteState(updated)
                    }}
                    className={`mt-2 text-slate-900 ${validationErrors.some((e) => e.field === 'validUntil') ? 'border-red-500' : ''
                      }`}
                  />
                  {validationErrors
                    .filter((e) => e.field === 'validUntil')
                    .map((error, idx) => (
                      <p key={idx} className="text-xs text-red-600 mt-1">
                        {error.message}
                      </p>
                    ))}
                </div>
                <div>
                  <Label htmlFor="currency" className="text-slate-700">Currency</Label>
                  <Input
                    id="currency"
                    value={quote.currency}
                    disabled
                    className="mt-2 bg-slate-50 text-slate-900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer" className="text-slate-700">Select Customer</Label>
                <Select
                  value={quote.customer.id}
                  onValueChange={(value) => {
                    handleCustomerChange(value)
                  }}
                >
                  <SelectTrigger
                    className={`mt-2 ${validationErrors.some((e) => e.field === 'customer') ? 'border-red-500' : ''
                      }`}
                  >
                    <SelectValue placeholder="Select a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer, idx) => (
                      <SelectItem key={customer.id ?? `customer-${idx}`} value={customer.id}>
                        {customer.name} {customer.company && `(${customer.company})`}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-2 border-t">
                      <button type="button" className="text-blue-600 hover:underline text-sm" onClick={() => setShowAddCustomer(true)}>
                        + Add Customer
                      </button>
                    </div>
                  </SelectContent>
                </Select>
                {validationErrors
                  .filter((e) => e.field === 'customer')
                  .map((error, idx) => (
                    <p key={idx} className="text-xs text-red-600 mt-1">
                      {error.message}
                    </p>
                  ))}
              </div>

              {quote.customer.id && (
                <div className="p-4 bg-slate-50 rounded border border-slate-200">
                  <p className="font-semibold text-slate-900">{quote.customer.name}</p>
                  {quote.customer.company && <p className="text-sm text-slate-600">{quote.customer.company}</p>}
                  {quote.customer.address && <p className="text-sm text-slate-600">{quote.customer.address}</p>}
                  {quote.customer.email && <p className="text-sm text-slate-600">{quote.customer.email}</p>}
                  {quote.customer.phone && <p className="text-sm text-slate-600">{quote.customer.phone}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Customer Modal */}
          {showAddCustomer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-black/40" onClick={() => setShowAddCustomer(false)} />
              <div className="bg-white rounded p-6 z-10 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Add Customer</h3>
                <div className="space-y-2">
                  <input className="w-full border px-2 py-1 rounded" placeholder="Name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
                  <input className="w-full border px-2 py-1 rounded" placeholder="Company" value={newCustomerCompany} onChange={(e) => setNewCustomerCompany(e.target.value)} />
                  <input className="w-full border px-2 py-1 rounded" placeholder="Email" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} />
                  <input className="w-full border px-2 py-1 rounded" placeholder="Phone" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
                  <textarea className="w-full border px-2 py-1 rounded" placeholder="Address" value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button className="px-3 py-1 border rounded" onClick={() => setShowAddCustomer(false)}>Cancel</button>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={async () => {
                    if (!newCustomerName.trim()) {
                      toast({ title: 'Validation', description: 'Name is required', variant: 'destructive' })
                      return
                    }
                    const id = generateId()
                    const customer = {
                      id,
                      name: newCustomerName.trim(),
                      company: newCustomerCompany.trim(),
                      email: newCustomerEmail.trim(),
                      phone: newCustomerPhone.trim(),
                      address: newCustomerAddress.trim(),
                      createdAt: new Date().toISOString(),
                    }
                    try {
                      await saveCustomer(customer)
                      const updated = await getAllCustomers()
                      setCustomers(updated)
                      setQuote({ ...quote, customer })
                      setShowAddCustomer(false)
                      setNewCustomerName('')
                      setNewCustomerCompany('')
                      setNewCustomerEmail('')
                      setNewCustomerPhone('')
                      setNewCustomerAddress('')
                      toast({ title: 'Created', description: 'Customer created and selected' })
                    } catch (err) {
                      console.error('Failed to create customer', err)
                      toast({ title: 'Error', description: 'Failed to create customer', variant: 'destructive' })
                    }
                  }}>Create</button>
                </div>
              </div>
            </div>
          )}

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Line Items</CardTitle>
                  <CardDescription>Add vehicles and services to the quote</CardDescription>
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
                      <th className="text-center p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item, index) => {
                      const quantityLabel = item.rentalBasis === 'hourly' ? 'Qty (total hours)' : item.rentalBasis === 'monthly' ? 'Qty (total months)' : 'Qty'
                      const rateLabel = item.rentalBasis === 'hourly' ? 'Rate per hour' : item.rentalBasis === 'monthly' ? 'Rate per month' : 'Rate'
                      return (
                        <tr key={item.id ?? `quote-item-${index}`} className="border-b hover:bg-slate-50">
                          {visibleColumns.serialNumber !== false && (
                            <td className="p-2 text-center text-slate-700">
                              {item.serialNumber || index + 1}
                            </td>
                          )}
                          {visibleColumns.itemName !== false && (
                            <td className="p-2">
                              <Select
                                value={item.vehicleTypeId}
                                onValueChange={(value) => handleLineItemChange(item.id, 'vehicleTypeId', value)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select vehicle..." />
                                </SelectTrigger>
                                <SelectContent>
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
                            <td className="p-2 text-slate-700">
                              {item.description || '-'}
                            </td>
                          )}
                          {visibleColumns.rentalBasis !== false && (
                            <td className="p-2">
                              <Select
                                value={item.rentalBasis || ''}
                                onValueChange={(value) => handleLineItemChange(item.id, 'rentalBasis', value || undefined)}
                              >
                                <SelectTrigger className="h-8 w-32">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
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
                                    handleLineItemChange(item.id, 'quantity', val)
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
                                    handleLineItemChange(item.id, 'unitPrice', val)
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
                            <td className="p-2 text-right text-slate-700">
                              {(item.lineTaxAmount || 0).toFixed(2)}
                            </td>
                          )}
                          {visibleColumns.netAmount !== false && (
                            <td className="p-2 text-right text-slate-700 font-semibold">
                              {(item.lineTotal || 0).toFixed(2)}
                            </td>
                          )}
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveLineItem(item.id)}
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

              <Button onClick={handleAddLineItem} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Line Item
              </Button>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={quote.notes}
                onChange={(e) => setQuote({ ...quote, notes: e.target.value })}
                placeholder="Add any additional notes or terms..."
                rows={4}
                className="text-slate-900"
              />
            </CardContent>
          </Card>

          {/* Terms & Conditions */}
          <Card>
            <CardHeader>
              <CardTitle>Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                value={quote.terms || ''}
                onChange={(html) => setQuote({ ...quote, terms: html })}
                placeholder="Terms and conditions for this quote. Defaults are loaded from Admin Settings."
                rows={6}
              />
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
                  <span className="font-semibold text-slate-900">AED {quote.subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Tax:</span>
                  <span className="font-semibold text-slate-900">AED {quote.totalTax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold pt-2">
                <span className="text-slate-700">Total:</span>
                <span className="text-blue-600">AED {quote.total.toFixed(2)}</span>
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
                  onClick={() => handleSaveQuote({ redirectAfterSave: false })}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  {saving ? 'Saving...' : isEditMode ? 'Update Quote' : 'Create Quote'}
                </Button>
                <Link href="/quotations" className="block">
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
