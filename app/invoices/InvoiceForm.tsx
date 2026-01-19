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
import { toast } from '@/hooks/use-toast'
import { Plus, Trash2, FileText, Sheet, FileType, Pencil, ArrowLeft } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
    getAdminSettings,
    initializeAdminSettings,
    getAllCustomers,
    getAllVehicles,
    generateInvoiceNumber,
    generateId,
    saveInvoice,
    saveCustomer,
} from '@/lib/storage'
import { pdfRenderer } from '@/lib/pdf'
import { excelRenderer } from '@/lib/excel'
import { docxRenderer } from '@/lib/docx'
import { Invoice, InvoiceItem, AdminSettings, Customer, Vehicle } from '@/lib/types'
import {
    normalizeInvoiceStatus,
    validateInvoice,
    validateInvoiceForExport,
    ValidationError,
} from '@/lib/validation'
import { DEFAULT_INVOICE_COLUMNS } from '@/lib/doc-generator/line-item-columns'

interface InvoiceFormProps {
    initialData?: Invoice
    onSave?: (savedInvoice: Invoice) => void
    onCancel?: () => void
    quoteId?: string | null // For creating from Quote
}

export default function InvoiceForm({ initialData, onSave, onCancel, quoteId }: InvoiceFormProps) {
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
    const [isInvoiceNumberEditable, setIsInvoiceNumberEditable] = useState(false)
    const [showColumnCustomizer, setShowColumnCustomizer] = useState(false)
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => ({ ...DEFAULT_INVOICE_COLUMNS }))

    // Determine if editing based on props or internal logic
    const [invoice, setInvoice] = useState<Invoice>(() => {
        const defaults = {
            id: generateId(),
            number: '',
            date: new Date().toISOString().split('T')[0],
            dueDate: undefined,
            customerId: '', // Changed from customer object to customerId
            items: [
                {
                    id: generateId(),
                    vehicleTypeId: '',
                    vehicleTypeLabel: '',
                    quantity: 1,
                    unitPrice: 0,
                    taxPercent: 0,
                    amountReceived: 0,
                },
            ],
            subtotal: 0,
            tax: 0,
            total: 0,
            amountReceived: 0,
            status: 'draft',
            terms: '',
            notes: '',
        } as Invoice

        if (initialData) {
            return {
                ...defaults,
                ...initialData,
                // If initialData has a customer object, extract its ID. Otherwise, use customerId if present.
                customerId: initialData.customerId || '',
                status: normalizeInvoiceStatus(initialData.status),
            }
        }
        return defaults
    })

    const isEditMode = !!initialData || !!invoice.createdAt

    const snapshotInvoice = (inv: Invoice) => {
        // Exclude timestamp fields
        const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = inv as any
        return JSON.stringify(rest)
    }

    useEffect(() => {
        const isHtmlEmpty = (html?: string) => {
            if (!html) return true
            const text = html
                .replace(/&nbsp;/gi, ' ')
                .replace(/<[^>]*>/g, '')
                .trim()
            return text.length === 0
        }

        async function loadData() {
            try {
                const settings = await getAdminSettings()
                let currentSettings = settings

                if (settings) {
                    setAdminSettings(settings)
                } else {
                    const initialized = await initializeAdminSettings()
                    setAdminSettings(initialized)
                    currentSettings = initialized
                }

                const defaultInvoiceTerms = (currentSettings as any)?.defaultInvoiceTerms ?? currentSettings?.defaultTerms

                // If creating new (no initialData) and default terms exist, set them (without overwriting user edits)
                if (!initialData && defaultInvoiceTerms) {
                    setInvoice((prev) => {
                        if (!isHtmlEmpty(prev.terms)) return prev
                        return { ...prev, terms: defaultInvoiceTerms }
                    })
                }

                const customersData = await getAllCustomers()
                const vehiclesData = await getAllVehicles()

                setCustomers(customersData)
                setVehicles(vehiclesData)

                if (!initialData && !invoice.number) {
                    const newNumber = await generateInvoiceNumber()
                    setInvoice((prev) => ({ ...prev, number: newNumber }))
                }

                if (initialData) {
                    setSavedSnapshot(snapshotInvoice(initialData))
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

    // Calculate totals
    const calculateTotals = (items: InvoiceItem[], manualTax?: number): { subtotal: number; tax: number; total: number } => {
        let subtotal = 0
        let calculatedTax = 0

        items.forEach((item, index) => {
            const grossAmount = item.quantity * item.unitPrice
            const itemTax = grossAmount * ((item.taxPercent || 0) / 100)
            const lineTotal = grossAmount + itemTax

            item.grossAmount = grossAmount
            item.lineTaxAmount = itemTax
            item.lineTotal = lineTotal
            item.serialNumber = index + 1

            subtotal += grossAmount
            calculatedTax += itemTax
        })

        // Allow manual tax override if passed, otherwise use calculated
        const finalTax = manualTax !== undefined ? manualTax : calculatedTax
        const total = subtotal + finalTax

        return {
            subtotal,
            tax: finalTax,
            total,
        }
    }

    const handleAddLineItem = () => {
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
            amountReceived: 0,
        }

        const newItems = [...invoice.items, newItem]
        const totals = calculateTotals(newItems, invoice.tax) // Keep existing manual tax if any? Or recalculate? 
        // In original code, invoice.tax was editable. Let's assume we want to re-sum if not explicitly overridden, 
        // but the original had a separate Tax input that allowed override. 
        // For now, let's recalculate tax from items to be safe, unless we want to support manual tax override logic specifically.
        // The original code `handleTaxChange` suggests manual override.
        // Let's stick to standard calculation for add, but if user manually edited tax before, it might be tricky.
        // Standard approach: calculate from items.
        const standardTotals = calculateTotals(newItems)

        setInvoice({
            ...invoice,
            items: newItems,
            ...standardTotals,
        })
    }

    const handleRemoveLineItem = (itemId: string) => {
        const newItems = invoice.items.filter((item) => item.id !== itemId)
        const totals = calculateTotals(newItems) // Revert to calculated tax

        setInvoice({
            ...invoice,
            items: newItems,
            ...totals,
        })
    }

    const handleLineItemChange = (
        itemId: string,
        field: keyof InvoiceItem,
        value: any
    ) => {
        const newItems = invoice.items.map((item) => {
            if (item.id === itemId) {
                const updated = { ...item, [field]: value }

                if (field === 'vehicleNumber' && value) {
                    const vehicle = vehicles.find((v) => v.vehicleNumber === value)
                    if (vehicle) {
                        updated.vehicleTypeId = vehicle.id
                        updated.vehicleTypeLabel = vehicle.vehicleType || vehicle.vehicleNumber || ''
                        updated.vehicleType = vehicle.vehicleType
                        updated.make = vehicle.make
                        updated.model = vehicle.model
                        updated.year = vehicle.year
                        updated.basePrice = vehicle.basePrice
                        if (!updated.description) {
                            updated.description = vehicle.description || ''
                        }
                        // Auto-fill basePrice as unitPrice if unitPrice is 0 and basePrice exists
                        if (updated.unitPrice === 0 && vehicle.basePrice) {
                            updated.unitPrice = vehicle.basePrice
                        }
                    }
                }

                if (field === 'quantity' || field === 'unitPrice' || field === 'taxPercent') {
                    const grossAmount = (updated.quantity || 0) * (updated.unitPrice || 0)
                    const itemTax = grossAmount * ((updated.taxPercent || 0) / 100)
                    const lineTotal = grossAmount + itemTax

                    updated.grossAmount = grossAmount
                    updated.lineTaxAmount = itemTax
                    updated.lineTotal = lineTotal
                }

                return updated
            }
            return item
        })

        // Recalculate totals
        // Note: If user manually edited tax, we should probably respect it or reset it?
        // Let's reset to calculated tax when items change to avoid inconsistency
        const totals = calculateTotals(newItems)

        const updatedInvoice = {
            ...invoice,
            items: newItems,
            ...totals,
        }
        setInvoice(updatedInvoice)
        validateInvoiceState(updatedInvoice)
    }

    const handleTaxChange = (newTax: number) => {
        const total = (invoice.subtotal || 0) + newTax
        setInvoice({ ...invoice, tax: newTax, total })
    }

    // Real-time validation
    const validateInvoiceState = (invoiceToValidate: Invoice) => {
        const result = validateInvoiceForExport(invoiceToValidate)
        setValidationErrors(result.errors)
        setIsValidForExport(result.isValid)
    }

    useEffect(() => {
        validateInvoiceState(invoice)
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

    const selectedCustomerDisplay = useMemo(() => {
        if (!invoice.customerId) return null
        const customer = customers.find((c) => c.id === invoice.customerId)
        if (!customer) return null
        return `${customer.name}${customer.company ? ` (${customer.company})` : ''}`
    }, [invoice.customerId, customers])

    const handleCustomerChange = (customerId: string) => {
        if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') return

        // Just update the ID
        const updatedInvoice = {
            ...invoice,
            customerId: customerId,
        }
        setInvoice(updatedInvoice)
        validateInvoiceState(updatedInvoice)
    }

    const handleSaveInvoice = async (): Promise<boolean> => {
        const invoiceForSave: Invoice = {
            ...invoice,
            status: normalizeInvoiceStatus(invoice.status),
        }

        const validation = await validateInvoice(invoiceForSave, {
            checkUniqueness: true,
            excludeInvoiceId: isEditMode ? invoice.id : undefined,
            checkCustomerExists: true,
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
            const invoiceToSave: Invoice = {
                ...invoiceForSave,
                createdAt: invoice.createdAt || now,
                updatedAt: now,
            }
            await saveInvoice(invoiceToSave)
            setInvoice(invoiceToSave)
            setSavedSnapshot(snapshotInvoice(invoiceToSave))
            setIsDirty(false)
            toast({ title: 'Saved', description: `Invoice ${invoice.number} saved successfully` })
            setValidationErrors([])

            if (onSave) {
                onSave(invoiceToSave)
            }
            return true
        } catch (err) {
            console.error('Failed to save invoice:', err)
            toast({ title: 'Error', description: 'Failed to save invoice', variant: 'destructive' })
            return false
        } finally {
            setSaving(false)
        }
    }

    const ensureSavedForExport = async (): Promise<boolean> => {
        if (isEditMode && isDirty) {
            toast({ title: 'Update required', description: 'Please update/save before exporting', variant: 'destructive' })
            return false
        }
        if (!isEditMode && !invoice.createdAt) {
            return await handleSaveInvoice()
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
        const validation = validateInvoiceForExport(invoice)
        if (!validation.isValid) {
            setValidationErrors(validation.errors)
            return
        }

        setGenerating(true)
        try {
            // Get customer name for PDF
            const customerName = customers.find(c => c.id === invoice.customerId)?.name || 'Unknown'

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
        const validation = validateInvoiceForExport(invoice)
        if (!validation.isValid) {
            setValidationErrors(validation.errors)
            return
        }

        setGenerating(true)
        try {
            // Get customer name for Excel
            const customerName = customers.find(c => c.id === invoice.customerId)?.name || 'Unknown'

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
        const validation = validateInvoiceForExport(invoice)
        if (!validation.isValid) {
            setValidationErrors(validation.errors)
            return
        }

        setGenerating(true)
        try {
            // Get customer name for DOCX
            const customerName = customers.find(c => c.id === invoice.customerId)?.name || 'Unknown'

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
            <div className="flex items-center justify-center p-8">
                <p>Loading invoice editor...</p>
            </div>
        )
    }

    return (
        <div className="p-8">
            <div className="mb-4">
                <Link 
                    href="/invoices" 
                    className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-2"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Invoices
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">
                    {isEditMode ? 'Edit Invoice' : 'Create New Invoice'}
                </h1>
                <p className="text-slate-500 text-sm">
                    {isEditMode ? `Invoice ${invoice.number}` : 'Fill in the details'}
                </p>
            </div>

            {/* Invoice Details, Customer & Summary Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Invoice Details */}
                <Card>
                        <CardHeader className="py-3">
                            <CardTitle className="text-base">Invoice Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="invoiceNumber" className="text-slate-700 flex items-center gap-2 text-xs">
                                        Invoice Number
                                        {!isInvoiceNumberEditable && (
                                            <button
                                                type="button"
                                                onClick={() => setIsInvoiceNumberEditable(true)}
                                                className="text-blue-600 hover:text-blue-800"
                                                title="Edit invoice number"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        )}
                                    </Label>
                                    <Input
                                        id="invoiceNumber"
                                        value={invoice.number}
                                        disabled={!isInvoiceNumberEditable}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            if (value === '' || /^INV-\d+$/.test(value)) {
                                                setInvoice((prev) => ({ ...prev, number: value }))
                                            }
                                        }}
                                        className={`mt-1 h-8 ${isInvoiceNumberEditable ? 'bg-white' : 'bg-slate-50'}`}
                                        placeholder="INV-001"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="invoiceDate" className="text-slate-700 text-xs">Date</Label>
                                    <Input
                                        id="invoiceDate"
                                        type="date"
                                        value={invoice.date}
                                        onChange={(e) => {
                                            const updated = { ...invoice, date: e.target.value }
                                            setInvoice(updated)
                                            validateInvoiceState(updated)
                                        }}
                                        className={`mt-1 h-8 ${validationErrors.some((e) => e.field === 'date') ? 'border-red-500' : ''}`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="dueDate" className="text-slate-700 text-xs">Due Date</Label>
                                    <Input
                                        id="dueDate"
                                        type="date"
                                        value={invoice.dueDate || ''}
                                        onChange={(e) => {
                                            const updated = { ...invoice, dueDate: e.target.value || undefined }
                                            setInvoice(updated)
                                        }}
                                        className="mt-1 h-8"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="status" className="text-slate-700 text-xs">Status</Label>
                                    <Select
                                        value={normalizeInvoiceStatus(invoice.status)}
                                        onValueChange={(val: any) => setInvoice({ ...invoice, status: normalizeInvoiceStatus(val) })}
                                    >
                                        <SelectTrigger className="h-8 mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="invoice_sent">Invoice Sent</SelectItem>
                                            <SelectItem value="payment_received">Payment Received</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="quoteRef" className="text-slate-700 text-xs">Quote Reference (optional)</Label>
                                    <Input
                                        id="quoteRef"
                                        value={invoice.quoteNumber || ''}
                                        onChange={(e) => setInvoice({ ...invoice, quoteNumber: e.target.value })}
                                        className="h-8 mt-1"
                                        placeholder="Quote-001"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="poRef" className="text-slate-700 text-xs">PO Reference (optional)</Label>
                                    <Input
                                        id="poRef"
                                        value={invoice.purchaseOrderNumber || ''}
                                        onChange={(e) => setInvoice({ ...invoice, purchaseOrderNumber: e.target.value })}
                                        className="h-8 mt-1"
                                        placeholder="PO-001"
                                    />
                                </div>
                            </div>
                        </CardContent>
                </Card>

                {/* Customer Selection */}
                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-base">Customer</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="customer" className="text-slate-700 text-xs">Select Customer</Label>
                            <Select
                                value={invoice.customerId}
                                onValueChange={(value) => {
                                    handleCustomerChange(value)
                                }}
                            >
                                <SelectTrigger
                                    className={`mt-1 h-8 ${validationErrors.some((e) => e.field === 'customer') ? 'border-red-500' : ''}`}
                                >
                                    {selectedCustomerDisplay || (
                                        <span className="text-muted-foreground text-xs">Select a customer...</span>
                                    )}
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map((customer, idx) => (
                                        <SelectItem key={customer.id ?? `customer-${idx}`} value={customer.id}>
                                            {customer.name} {customer.company && `(${customer.company})`}
                                        </SelectItem>
                                    ))}
                                    <div className="px-2 py-2 border-t">
                                        <button type="button" className="text-blue-600 hover:underline text-xs" onClick={() => setShowAddCustomer(true)}>
                                            + Add Customer
                                        </button>
                                    </div>
                                </SelectContent>
                            </Select>
                        </div>

                        {invoice.customerId && (
                            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-sm">
                                <p className="font-semibold text-slate-900">
                                    {customers.find(c => c.id === invoice.customerId)?.name}
                                </p>
                                {customers.find(c => c.id === invoice.customerId)?.company && (
                                    <p className="text-xs text-slate-600">
                                        {customers.find(c => c.id === invoice.customerId)?.company}
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Summary Sidebar */}
                <Card className="sticky top-8 h-fit">
                    <CardHeader className="py-3">
                        <CardTitle className="text-base">Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1 pb-4 border-b text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Subtotal:</span>
                                <span className="font-semibold text-slate-900">AED {invoice.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">Tax:</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-600 text-xs">AED</span>
                                    <Input
                                        type="number"
                                        value={invoice.tax}
                                        onChange={(e) => handleTaxChange(parseFloat(e.target.value) || 0)}
                                        className="h-6 w-20 text-right text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between text-base font-bold pt-2">
                            <span className="text-slate-700">Total:</span>
                            <span className="text-blue-600">AED {invoice.total.toFixed(2)}</span>
                        </div>

                        <div className="space-y-1 pt-2 border-t text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Amount Received:</span>
                                <Input
                                    type="number"
                                    value={invoice.amountReceived || ''}
                                    onChange={(e) => setInvoice({ ...invoice, amountReceived: parseFloat(e.target.value) || 0 })}
                                    className="h-6 w-20 text-right text-xs"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Pending:</span>
                                <span className={`font-semibold ${((invoice.total || 0) - (invoice.amountReceived || 0)) > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                                    AED {((invoice.total || 0) - (invoice.amountReceived || 0)).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {validationErrors.length > 0 && (
                            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                <p className="font-semibold">Errors:</p>
                                <ul className="list-disc list-inside">
                                    {validationErrors.slice(0, 2).map((e, i) => <li key={i}>{e.message}</li>)}
                                    {validationErrors.length > 2 && <li>...and more</li>}
                                </ul>
                            </div>
                        )}

                        <div className="pt-4 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    onClick={handleDownloadPDF}
                                    disabled={!!exportDisabledReason}
                                    size="sm"
                                    className="bg-action-pdf hover:bg-action-pdf/90 text-white shadow-sm h-8 px-0"
                                    title="PDF"
                                >
                                    <FileText className="w-3 h-3" />
                                </Button>
                                <Button
                                    onClick={handleDownloadExcel}
                                    disabled={!!exportDisabledReason}
                                    size="sm"
                                    className="bg-action-excel hover:bg-action-excel/90 text-white shadow-sm h-8 px-0"
                                    title="Excel"
                                >
                                    <Sheet className="w-3 h-3" />
                                </Button>
                                <Button
                                    onClick={handleDownloadDocx}
                                    disabled={!!exportDisabledReason}
                                    size="sm"
                                    className="bg-action-word hover:bg-action-word/90 text-white shadow-sm h-8 px-0"
                                    title="Word"
                                >
                                    <FileType className="w-3 h-3" />
                                </Button>
                            </div>

                            <Button
                                onClick={() => handleSaveInvoice()}
                                disabled={saving}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md h-9"
                            >
                                {saving ? 'Saving...' : 'Save Invoice'}
                            </Button>

                            {onCancel && (
                                <Button
                                    variant="outline"
                                    onClick={onCancel}
                                    className="w-full shadow-sm hover:bg-slate-50 h-9"
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add Customer Modal */}
                    {showAddCustomer && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <div className="fixed inset-0 bg-black/40" onClick={() => setShowAddCustomer(false)} />
                            <div className="bg-white rounded p-6 z-10 w-full max-w-md shadow-xl">
                                <h3 className="text-lg font-semibold mb-4">Add Customer</h3>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="invoice-customer-name" className="text-slate-700 text-sm mb-1 block">Name</Label>
                                        <Input 
                                            id="invoice-customer-name"
                                            placeholder="Name" 
                                            value={newCustomerName} 
                                            onChange={(e) => setNewCustomerName(e.target.value)} 
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="invoice-customer-company" className="text-slate-700 text-sm mb-1 block">Company</Label>
                                        <Input 
                                            id="invoice-customer-company"
                                            placeholder="Company" 
                                            value={newCustomerCompany} 
                                            onChange={(e) => setNewCustomerCompany(e.target.value)} 
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="invoice-customer-email" className="text-slate-700 text-sm mb-1 block">Email</Label>
                                        <Input 
                                            id="invoice-customer-email"
                                            placeholder="Email" 
                                            value={newCustomerEmail} 
                                            onChange={(e) => setNewCustomerEmail(e.target.value)} 
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="invoice-customer-phone" className="text-slate-700 text-sm mb-1 block">Phone</Label>
                                        <Input 
                                            id="invoice-customer-phone"
                                            placeholder="Phone" 
                                            value={newCustomerPhone} 
                                            onChange={(e) => setNewCustomerPhone(e.target.value)} 
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="invoice-customer-address" className="text-slate-700 text-sm mb-1 block">Address</Label>
                                        <Textarea 
                                            id="invoice-customer-address"
                                            placeholder="Address" 
                                            value={newCustomerAddress} 
                                            onChange={(e) => setNewCustomerAddress(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setShowAddCustomer(false)}>Cancel</Button>
                                    <Button onClick={async () => {
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
                                            setCustomers(updated)
                                            setInvoice({ ...invoice, customerId: customer.id })
                                            setShowAddCustomer(false)
                                            // Reset fields
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
                                    }}>Create</Button>
                                </div>
                            </div>
                        </div>
                    )}

            {/* Line Items - Full Width */}
            <Card className="mb-6">
                        <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Line Items</CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowColumnCustomizer(true)}
                                    className="h-8 text-xs"
                                >
                                    Customize Columns
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-100 border-b">
                                        <tr>
                                            {visibleColumns.serialNumber !== false && <th className="text-center p-2">#</th>}
                                            {visibleColumns.vehicleNumber !== false && <th className="text-left p-2">Vehicle</th>}
                                            {visibleColumns.vehicleType !== false && <th className="text-left p-2">Type</th>}
                                            {visibleColumns.makeModel !== false && <th className="text-left p-2">Make/Model</th>}
                                            {visibleColumns.year !== false && <th className="text-center p-2">Year</th>}
                                            {visibleColumns.basePrice !== false && <th className="text-right p-2">Base Price</th>}
                                            {visibleColumns.description !== false && <th className="text-left p-2">Description</th>}
                                            {visibleColumns.rentalBasis !== false && <th className="text-center p-2">Basis</th>}
                                            {visibleColumns.quantity !== false && <th className="text-right p-2">Qty</th>}
                                            {visibleColumns.rate !== false && <th className="text-right p-2">Rate</th>}
                                            {visibleColumns.grossAmount !== false && <th className="text-right p-2">Gross</th>}
                                            {visibleColumns.tax !== false && <th className="text-right p-2">Tax%</th>}
                                            {visibleColumns.netAmount !== false && <th className="text-right p-2">Net</th>}
                                            {visibleColumns.amountReceived !== false && <th className="text-right p-2">Received</th>}
                                            <th className="text-center p-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoice.items.map((item, index) => {
                                            return (
                                                <tr key={item.id ?? `invoice-item-${index}`} className="border-b hover:bg-slate-50">
                                                    {visibleColumns.serialNumber !== false && (
                                                        <td className="p-2 text-center text-slate-700">
                                                            {item.serialNumber || index + 1}
                                                        </td>
                                                    )}
                                            {visibleColumns.vehicleNumber !== false && (
                                                <td className="p-2 min-w-[100px]">
                                                    <Select
                                                        value={item.vehicleNumber || ''}
                                                        onValueChange={(value) => handleLineItemChange(item.id, 'vehicleNumber', value)}
                                                    >
                                                        <SelectTrigger className="h-7 text-xs">
                                                            <SelectValue placeholder="Vehicle..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {vehicles.map((vehicle, idx) => {
                                                                const displayText = vehicle.make && vehicle.model && vehicle.year
                                                                    ? `${vehicle.vehicleNumber || 'Unknown'} - ${vehicle.make} ${vehicle.model} (${vehicle.year})`
                                                                    : vehicle.make && vehicle.model
                                                                    ? `${vehicle.vehicleNumber || 'Unknown'} - ${vehicle.make} ${vehicle.model}`
                                                                    : vehicle.vehicleNumber || 'Unknown'
                                                                return (
                                                                    <SelectItem key={vehicle.id ?? `vehicle-${idx}`} value={vehicle.vehicleNumber || ''}>
                                                                        {displayText}
                                                                    </SelectItem>
                                                                )
                                                            })}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                            )}
                                            {visibleColumns.vehicleType !== false && (
                                                <td className="p-2 text-left text-slate-700 min-w-[80px]">
                                                    {item.vehicleType || '-'}
                                                </td>
                                            )}
                                            {visibleColumns.makeModel !== false && (
                                                <td className="p-2 text-left text-slate-700 min-w-[120px]">
                                                    {item.make && item.model ? `${item.make} ${item.model}` : '-'}
                                                </td>
                                            )}
                                            {visibleColumns.year !== false && (
                                                <td className="p-2 text-center text-slate-700 min-w-[60px]">
                                                    {item.year || '-'}
                                                </td>
                                            )}
                                            {visibleColumns.basePrice !== false && (
                                                <td className="p-2 text-right text-slate-700 min-w-[80px]">
                                                    {item.basePrice ? item.basePrice.toFixed(2) : '-'}
                                                </td>
                                            )}
                                                    {visibleColumns.description !== false && (
                                                        <td className="p-2 min-w-[120px]">
                                                            <Input
                                                                value={item.description || ''}
                                                                onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                                                                className="h-7 text-xs"
                                                            />
                                                        </td>
                                                    )}
                                                    {visibleColumns.rentalBasis !== false && (
                                                        <td className="p-2 min-w-[90px]">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div>
                                                                        <Select
                                                                            value={item.rentalBasis || ''}
                                                                            onValueChange={(value) => handleLineItemChange(item.id, 'rentalBasis', value || undefined)}
                                                                        >
                                                                            <SelectTrigger className="h-7 text-xs">
                                                                                <SelectValue placeholder="-" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="hourly">Hourly</SelectItem>
                                                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Rental basis: Hourly (rate per hour) or Monthly (rate per month)</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </td>
                                                    )}
                                                    {visibleColumns.quantity !== false && (
                                                        <td className="p-2 text-right w-[60px]">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={item.quantity && item.quantity > 0 ? item.quantity : ''}
                                                                onChange={(e) => handleLineItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                                className="h-7 text-xs text-right px-1"
                                                            />
                                                        </td>
                                                    )}
                                                    {visibleColumns.rate !== false && (
                                                        <td className="p-2 text-right w-[80px]">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={item.unitPrice && item.unitPrice > 0 ? item.unitPrice : ''}
                                                                onChange={(e) => handleLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                                className="h-7 text-xs text-right px-1"
                                                            />
                                                        </td>
                                                    )}
                                                    {visibleColumns.grossAmount !== false && (
                                                        <td className="p-2 text-right text-slate-700 w-[80px]">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help">{(item.grossAmount || 0).toFixed(2)}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Gross = Quantity × Rate</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </td>
                                                    )}
                                                    {visibleColumns.tax !== false && (
                                                        <td className="p-2 text-right w-[60px]">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div>
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            value={item.taxPercent}
                                                                            onChange={(e) => handleLineItemChange(item.id, 'taxPercent', parseFloat(e.target.value) || 0)}
                                                                            className="h-7 text-xs text-right px-1"
                                                                        />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Tax percentage (0-100%). Tax = Gross × Tax% / 100</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </td>
                                                    )}
                                                    {visibleColumns.netAmount !== false && (
                                                        <td className="p-2 text-right text-slate-700 font-semibold w-[80px]">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help">{(item.lineTotal || 0).toFixed(2)}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Net = Gross + Tax</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </td>
                                                    )}
                                                    {visibleColumns.amountReceived !== false && (
                                                        <td className="p-2 text-right w-[80px]">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={item.amountReceived && item.amountReceived > 0 ? item.amountReceived : ''}
                                                                onChange={(e) => handleLineItemChange(item.id, 'amountReceived', parseFloat(e.target.value) || 0)}
                                                                className="h-7 text-xs text-right px-1"
                                                                placeholder="0.00"
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="p-2 text-center w-[40px]">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveLineItem(item.id)}
                                                            className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <Button onClick={handleAddLineItem} variant="outline" size="sm" className="w-full text-xs h-8">
                                <Plus className="w-3 h-3 mr-2" />
                                Add Line Item
                            </Button>
                        </CardContent>
            </Card>

            {/* Terms & Conditions - Full Width */}
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-base">Terms &amp; Conditions</CardTitle>
                    <CardDescription className="text-xs">
                        Defaults come from Admin Settings. Editing here overrides the default for this invoice.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RichTextEditor
                        value={invoice.terms || ''}
                        onChange={(html) => setInvoice({ ...invoice, terms: html })}
                        placeholder="Enter terms and conditions..."
                        rows={8}
                    />
                </CardContent>
            </Card>

            {/* Additional Notes - Full Width */}
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={invoice.notes}
                        onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
                        placeholder="Add notes..."
                        rows={3}
                        className="text-xs"
                    />
                </CardContent>
            </Card>

            {/* Column Customization Dialog */}
            <Dialog open={showColumnCustomizer} onOpenChange={setShowColumnCustomizer}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Customize Columns</DialogTitle>
                        <DialogDescription>
                            Select columns to display
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        {[
                            { key: 'serialNumber', label: 'Sl. no.' },
                            { key: 'vehicleNumber', label: 'Vehicle number' },
                            { key: 'vehicleType', label: 'Vehicle Type' },
                            { key: 'makeModel', label: 'Make/Model' },
                            { key: 'year', label: 'Year' },
                            { key: 'basePrice', label: 'Base Price' },
                            { key: 'description', label: 'Description' },
                            { key: 'rentalBasis', label: 'Rental basis' },
                            { key: 'quantity', label: 'Qty' },
                            { key: 'rate', label: 'Rate' },
                            { key: 'grossAmount', label: 'Gross amount' },
                            { key: 'tax', label: 'Tax %' },
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
                                <Label htmlFor={col.key} className="font-normal cursor-pointer text-sm">
                                    {col.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
