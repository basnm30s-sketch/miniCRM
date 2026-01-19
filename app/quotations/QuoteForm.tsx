'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
    getCustomerById,
    getAllVehicles,
    generateQuoteNumber,
    generateId,
    saveQuote,
    saveCustomer,
} from '@/lib/storage'
import { pdfRenderer } from '@/lib/pdf'
import { excelRenderer } from '@/lib/excel'
import { docxRenderer } from '@/lib/docx'
import { Quote, QuoteLineItem, AdminSettings, Customer, Vehicle } from '@/lib/types'
import { validateQuote, validateQuoteForExport, ValidationError } from '@/lib/validation'
import { DEFAULT_QUOTE_COLUMNS } from '@/lib/doc-generator/line-item-columns'

interface QuoteFormProps {
    initialData?: Quote
    onSave?: (savedQuote: Quote) => void
    onCancel?: () => void
}

export default function QuoteForm({ initialData, onSave, onCancel }: QuoteFormProps) {
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
    const getVisibleColumnsStorageKey = (quoteId: string | undefined) => 
        quoteId ? `quote-visible-columns-${quoteId}` : 'quote-visible-columns-global'
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => ({ ...DEFAULT_QUOTE_COLUMNS }))

    // Determine if editing based on props or internal logic
    const [quote, setQuote] = useState<Quote>(initialData || {
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

    const isEditMode = !!initialData || !!quote.createdAt

    const customerHydrateSeqRef = useRef(0)
    const lastHydratedCustomerIdRef = useRef<string | null>(null)

    const normalizeCustomer = (c: any): Customer => {
        return {
            id: typeof c?.id === 'string' ? c.id : '',
            name: typeof c?.name === 'string' ? c.name : '',
            company: typeof c?.company === 'string' ? c.company : (c?.company ?? '') ? String(c.company ?? '') : '',
            email: typeof c?.email === 'string' ? c.email : (c?.email ?? '') ? String(c.email ?? '') : '',
            phone: typeof c?.phone === 'string' ? c.phone : (c?.phone ?? '') ? String(c.phone ?? '') : '',
            address: typeof c?.address === 'string' ? c.address : (c?.address ?? '') ? String(c.address ?? '') : '',
            createdAt: typeof c?.createdAt === 'string' ? c.createdAt : undefined,
            updatedAt: typeof c?.updatedAt === 'string' ? c.updatedAt : undefined,
        } as Customer
    }

    const hydrateCustomerById = async (customerId: string) => {
        if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') return

        const seq = ++customerHydrateSeqRef.current
        try {
            const fetched = await getCustomerById(customerId)
            if (seq !== customerHydrateSeqRef.current) return

            if (!fetched) return
            const normalized = normalizeCustomer(fetched)

            setQuote((prev) => {
                if (prev.customer?.id !== customerId) return prev
                // Avoid needless state churn
                const prevNormalized = normalizeCustomer(prev.customer)
                const same =
                    prevNormalized.id === normalized.id &&
                    prevNormalized.name === normalized.name &&
                    prevNormalized.company === normalized.company &&
                    prevNormalized.email === normalized.email &&
                    prevNormalized.phone === normalized.phone &&
                    prevNormalized.address === normalized.address
                if (same) return prev
                const updated = { ...prev, customer: normalized }
                // Keep validation in sync after hydration
                validateQuoteState(updated)
                return updated
            })

            // Keep in-memory list in sync (helps dropdown display and future selections)
            setCustomers((prev) => {
                const idx = prev.findIndex((c) => c.id === customerId)
                if (idx < 0) return prev
                const next = [...prev]
                next[idx] = { ...(prev[idx] as any), ...(normalized as any) }
                return next
            })
        } catch (err) {
            // Hydration is best-effort; don’t block editing
            console.warn('Failed to hydrate customer details:', err)
        }
    }

    const snapshotQuote = (q: Quote) => {
        // Exclude timestamp fields so they don't cause dirty state flips
        const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = q as any
        return JSON.stringify(rest)
    }

    useEffect(() => {
        // Restore column preferences from localStorage (per-quote if editing, global if creating)
        if (typeof window !== 'undefined') {
            const quoteId = initialData?.id || quote.id
            const storageKey = getVisibleColumnsStorageKey(quoteId)
            
            // Try per-quote setting first
            let stored = localStorage.getItem(storageKey)
            
            // If editing and no per-quote setting exists, try global fallback
            if (!stored && initialData) {
                stored = localStorage.getItem('quote-visible-columns-global')
            }
            
            // If still nothing, use defaults
            if (stored) {
                try {
                    const parsed = JSON.parse(stored)
                    if (parsed && typeof parsed === 'object') {
                        setVisibleColumns((prev) => ({ ...prev, ...parsed }))
                    }
                } catch {
                    // ignore invalid stored data
                }
            }
        }

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
                // Load admin settings
                const settings = await getAdminSettings()
                let currentSettings = settings

                if (settings) {
                    setAdminSettings(settings)
                } else {
                    const initialized = await initializeAdminSettings()
                    setAdminSettings(initialized)
                    currentSettings = initialized
                }

                // If creating new (no initialData) and default terms exist, set them (without overwriting user edits)
                if (!initialData && currentSettings?.defaultTerms) {
                    setQuote((prev) => {
                        if (!isHtmlEmpty(prev.terms)) return prev
                        return { ...prev, terms: currentSettings.defaultTerms }
                    })
                }

                // Load customers and vehicles
                const customersData = await getAllCustomers()
                const vehiclesData = await getAllVehicles()

                setCustomers(customersData)
                setVehicles(vehiclesData)

                // If creating new (no initialData or number), generate number
                if (!initialData && !quote.number) {
                    const newNumber = await generateQuoteNumber()
                    setQuote((prev) => ({ ...prev, number: newNumber }))
                }

                if (initialData) {
                    setSavedSnapshot(snapshotQuote(initialData))
                }

            } catch (err) {
                console.error('Failed to load data:', err)
                toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' })
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, []) // Remove initialData dependency to prevent resetting on every render if parent passes new obj ref

    useEffect(() => {
        // Persist column preferences (per-quote if editing, global if creating)
        if (typeof window !== 'undefined') {
            const quoteId = quote.id
            const storageKey = getVisibleColumnsStorageKey(quoteId)
            localStorage.setItem(storageKey, JSON.stringify(visibleColumns))
            
            // Also update global setting for new quotes
            if (!initialData && !quote.createdAt) {
                localStorage.setItem('quote-visible-columns-global', JSON.stringify(visibleColumns))
            }
        }
    }, [visibleColumns, quote.id, initialData, quote.createdAt])

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
                console.log('[Quote Line Item Validation]', {
                    itemId: item.id,
                    fieldBeingChanged: field,
                    currentValues: {
                      description: item.description || 'MISSING',
                      vehicleNumber: item.vehicleNumber || 'MISSING',
                      rentalBasis: item.rentalBasis || 'MISSING',
                      quantity: item.quantity || 'MISSING',
                      unitPrice: item.unitPrice || 'MISSING',
                      taxPercent: item.taxPercent || 'MISSING',
                      grossAmount: item.grossAmount || 'MISSING',
                      lineTaxAmount: item.lineTaxAmount || 'MISSING',
                      lineTotal: item.lineTotal || 'MISSING',
                    }
                  })

                // If changing vehicle number, find vehicle and update related fields
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
                        // Auto-fill description from vehicle if not already set
                        if (!updated.description) {
                            updated.description = vehicle.description || ''
                        }
                        // Auto-fill basePrice as unitPrice if unitPrice is 0 and basePrice exists
                        if (updated.unitPrice === 0 && vehicle.basePrice) {
                            updated.unitPrice = vehicle.basePrice
                        }
                    }
                }

                // If changing vehicle type (for backward compatibility), update the label, vehicle number, and description
                if (field === 'vehicleTypeId' && value) {
                    const vehicle = vehicles.find((v) => v.id === value)
                    if (vehicle) {
                        updated.vehicleTypeLabel = vehicle.vehicleType || vehicle.vehicleNumber || ''
                        updated.vehicleNumber = vehicle.vehicleNumber || ''
                        updated.vehicleType = vehicle.vehicleType
                        updated.make = vehicle.make
                        updated.model = vehicle.model
                        updated.year = vehicle.year
                        updated.basePrice = vehicle.basePrice
                        // Auto-fill description from vehicle if not already set
                        if (!updated.description) {
                            updated.description = vehicle.description || ''
                        }
                        // Auto-fill basePrice as unitPrice if unitPrice is 0 and basePrice exists
                        if (updated.unitPrice === 0 && vehicle.basePrice) {
                            updated.unitPrice = vehicle.basePrice
                        }
                    }
                }

                // Recalculate item totals when relevant fields change
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

    const selectedCustomerDisplay = useMemo(() => {
        if (!quote.customer?.id) return null
        const customer = customers.find((c) => c.id === quote.customer.id) || quote.customer
        const name = (customer?.name || '').trim()
        const company = (customer?.company || '').trim()
        if (!name && !company) return null
        if (name && company) return `${name} (${company})`
        return name || company
    }, [quote.customer?.id, customers])

    const handleCustomerChange = (customerId: string) => {
        // Validate customerId is a non-empty string
        if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') {
            console.warn('Invalid customer ID provided:', customerId)
            return
        }

        const selectedCustomer = customers.find((c) => c.id === customerId)
        const normalizedSelected = selectedCustomer
            ? normalizeCustomer(selectedCustomer)
            : normalizeCustomer({ id: customerId })

        const updatedQuote = {
            ...quote,
            customer: normalizedSelected,
        }
        setQuote(updatedQuote)
        validateQuoteState(updatedQuote)
        void hydrateCustomerById(customerId)
    }

    // Ensure customer details are hydrated in edit mode or when switching customers quickly
    useEffect(() => {
        const id = quote.customer?.id
        if (!id) return
        if (lastHydratedCustomerIdRef.current === id) return
        lastHydratedCustomerIdRef.current = id
        void hydrateCustomerById(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quote.customer?.id])

    const handleSaveQuote = async (): Promise<boolean> => {
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
            
            // Persist column preferences for this specific quote
            if (typeof window !== 'undefined') {
                const storageKey = getVisibleColumnsStorageKey(quoteToSave.id)
                localStorage.setItem(storageKey, JSON.stringify(visibleColumns))
            }
            
            toast({ title: 'Saved', description: `Quote ${quote.number} saved successfully` })
            setValidationErrors([])

            if (onSave) {
                onSave(quoteToSave)
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

        // Create mode: save first
        if (!isEditMode && !quote.createdAt) {
            return await handleSaveQuote()
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a2d24118-0d4e-4bd9-9024-cfa44163c9ac', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: 'debug-session',
                    runId: 'pre-fix-1',
                    hypothesisId: 'H1',
                    location: 'QuoteForm.tsx:handleDownloadPDF',
                    message: 'Download PDF from QuoteForm with visibleColumns',
                    data: {
                        quoteId: quote.id,
                        visibleColumns,
                    },
                    timestamp: Date.now(),
                }),
            }).catch(() => {})
            // #endregion agent log

            const pdfBlob = await pdfRenderer.renderQuoteToPdf(quote, adminSettings, { visibleColumns })
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
            <div className="mb-4">
                <Link 
                    href="/quotations" 
                    className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-2"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Quotations
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">
                    {isEditMode ? 'Edit Quotation' : 'Create New Quotation'}
                </h1>
                <p className="text-slate-500 text-sm">
                    {isEditMode ? `Quote ${quote.number}` : 'Fill in the details'}
                </p>
            </div>

            {/* Quote Details, Customer & Summary Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Quote Details */}
                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-base">Quote Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <Label htmlFor="quoteNumber" className="text-slate-700 flex items-center gap-2 text-xs">
                                    Quote Number
                                    {!isQuoteNumberEditable && (
                                        <button
                                            type="button"
                                            onClick={() => setIsQuoteNumberEditable(true)}
                                            className="text-blue-600 hover:text-blue-800"
                                            title="Edit quote number"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                    )}
                                </Label>
                                <Input
                                    id="quoteNumber"
                                    value={quote.number}
                                    disabled={!isQuoteNumberEditable}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        if (value === '' || /^Quote-\d+$/.test(value)) {
                                            setQuote((prev) => ({ ...prev, number: value }))
                                        }
                                    }}
                                    className={`mt-1 h-8 ${isQuoteNumberEditable ? 'bg-white' : 'bg-slate-50'}`}
                                    placeholder="Quote-001"
                                />
                            </div>
                            <div>
                                <Label htmlFor="quoteDate" className="text-slate-700 text-xs">Date</Label>
                                <Input
                                    id="quoteDate"
                                    type="date"
                                    value={quote.date}
                                    onChange={(e) => {
                                        const updated = { ...quote, date: e.target.value }
                                        setQuote(updated)
                                        validateQuoteState(updated)
                                    }}
                                    className={`mt-1 h-8 ${validationErrors.some((e) => e.field === 'date') ? 'border-red-500' : ''}`}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <Label htmlFor="validUntil" className="text-slate-700 text-xs">Valid Until (optional)</Label>
                                <Input
                                    id="validUntil"
                                    type="date"
                                    value={quote.validUntil || ''}
                                    onChange={(e) => {
                                        const updated = { ...quote, validUntil: e.target.value || undefined }
                                        setQuote(updated)
                                        validateQuoteState(updated)
                                    }}
                                    className="mt-1 h-8"
                                />
                            </div>
                            <div>
                                <Label htmlFor="currency" className="text-slate-700 text-xs">Currency</Label>
                                <Input
                                    id="currency"
                                    value={quote.currency}
                                    disabled
                                    className="mt-1 h-8 bg-slate-50"
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
                                value={quote.customer.id}
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

                        {quote.customer.id && (
                            (() => {
                                const displayCustomer =
                                    customers.find((c) => c.id === quote.customer.id) || quote.customer
                                const name = (displayCustomer?.name || '').trim()
                                const company = (displayCustomer?.company || '').trim()
                                const email = (displayCustomer?.email || '').trim()
                                const phone = (displayCustomer?.phone || '').trim()
                                const address = (displayCustomer?.address || '').trim()

                                return (
                                    <div className="p-3 bg-slate-50 rounded border border-slate-200 text-sm">
                                        <p className="font-semibold text-slate-900">
                                            {name || company || 'N/A'}
                                        </p>
                                        {name && company && (
                                            <p className="text-xs text-slate-600">{company}</p>
                                        )}

                                        <div className="mt-2 space-y-1 text-xs">
                                            <div className="flex justify-between gap-3">
                                                <span className="text-slate-500">Email</span>
                                                <span className="text-slate-900 truncate">{email || '—'}</span>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <span className="text-slate-500">Phone</span>
                                                <span className="text-slate-900 truncate">{phone || '—'}</span>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <span className="text-slate-500">Address</span>
                                                <span className="text-slate-900 text-right line-clamp-2">
                                                    {address || '—'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })()
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
                                <span className="font-semibold text-slate-900">AED {quote.subTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Tax:</span>
                                <span className="font-semibold text-slate-900">AED {quote.totalTax.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex justify-between text-base font-bold pt-2">
                            <span className="text-slate-700">Total:</span>
                            <span className="text-blue-600">AED {quote.total.toFixed(2)}</span>
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
                                onClick={() => handleSaveQuote()}
                                disabled={saving}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md h-9"
                            >
                                {saving ? 'Saving...' : 'Save Quote'}
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
                                    <th className="text-center p-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {quote.items.map((item, index) => {
                                    return (
                                        <tr key={item.id ?? `quote-item-${index}`} className="border-b hover:bg-slate-50">
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
                                                                    value={item.taxPercent && item.taxPercent > 0 ? item.taxPercent : ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value
                                                                        handleLineItemChange(item.id, 'taxPercent', val === '' ? 0 : parseFloat(val) || 0)
                                                                    }}
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

            {/* Additional Notes - Full Width */}
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-base">Terms &amp; Conditions</CardTitle>
                    <CardDescription className="text-xs">
                        Defaults come from Admin Settings. Editing here overrides the default for this quotation.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RichTextEditor
                        value={quote.terms || ''}
                        onChange={(html) => setQuote({ ...quote, terms: html })}
                        placeholder="Enter terms and conditions..."
                        rows={8}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={quote.notes}
                        onChange={(e) => setQuote({ ...quote, notes: e.target.value })}
                        placeholder="Add notes..."
                        rows={3}
                        className="text-xs"
                    />
                </CardContent>
            </Card>

            {/* Add Customer Modal */}
            {showAddCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setShowAddCustomer(false)} />
                    <div className="bg-white rounded p-6 z-10 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-semibold mb-4">Add Customer</h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="quote-customer-name" className="text-slate-700 text-sm mb-1 block">Name</Label>
                                <Input 
                                    id="quote-customer-name"
                                    placeholder="Name" 
                                    value={newCustomerName} 
                                    onChange={(e) => setNewCustomerName(e.target.value)} 
                                />
                            </div>
                            <div>
                                <Label htmlFor="quote-customer-company" className="text-slate-700 text-sm mb-1 block">Company</Label>
                                <Input 
                                    id="quote-customer-company"
                                    placeholder="Company" 
                                    value={newCustomerCompany} 
                                    onChange={(e) => setNewCustomerCompany(e.target.value)} 
                                />
                            </div>
                            <div>
                                <Label htmlFor="quote-customer-email" className="text-slate-700 text-sm mb-1 block">Email</Label>
                                <Input 
                                    id="quote-customer-email"
                                    placeholder="Email" 
                                    value={newCustomerEmail} 
                                    onChange={(e) => setNewCustomerEmail(e.target.value)} 
                                />
                            </div>
                            <div>
                                <Label htmlFor="quote-customer-phone" className="text-slate-700 text-sm mb-1 block">Phone</Label>
                                <Input 
                                    id="quote-customer-phone"
                                    placeholder="Phone" 
                                    value={newCustomerPhone} 
                                    onChange={(e) => setNewCustomerPhone(e.target.value)} 
                                />
                            </div>
                            <div>
                                <Label htmlFor="quote-customer-address" className="text-slate-700 text-sm mb-1 block">Address</Label>
                                <Textarea 
                                    id="quote-customer-address"
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
                                    setQuote({ ...quote, customer })
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
