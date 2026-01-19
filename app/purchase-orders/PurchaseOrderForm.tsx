'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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
import { FileText, Plus, Trash2, Sheet, FileType, ArrowLeft } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
    savePurchaseOrder,
    getAllVendors,
    getAllVehicles,
    generateId,
    getAdminSettings,
    initializeAdminSettings,
} from '@/lib/storage'
import { pdfRenderer } from '@/lib/pdf'
import { excelRenderer } from '@/lib/excel'
import { docxRenderer } from '@/lib/docx'
import type { PurchaseOrder, Vendor, AdminSettings, POItem, Vehicle } from '@/lib/types'
import type { ValidationError } from '@/lib/validation'
import { DEFAULT_PO_COLUMNS } from '@/lib/doc-generator/line-item-columns'

interface PurchaseOrderFormProps {
    initialData?: PurchaseOrder
    onSave?: (savedPO: PurchaseOrder) => void
    onCancel?: () => void
}

export default function PurchaseOrderForm({ initialData, onSave, onCancel }: PurchaseOrderFormProps) {
    // Use initialData if provided, otherwise default state
    const [po, setPo] = useState<PurchaseOrder>(initialData || {
        id: generateId(),
        number: '', // will be set in effect if not provided
        date: new Date().toISOString().split('T')[0],
        vendorId: '',
        items: [{ id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0 }],
        subtotal: 0,
        tax: 0,
        amount: 0,
        currency: 'AED',
        status: 'draft',
        terms: '',
        createdAt: '', // will be set on save if empty
    })

    // Determine edit mode based on if initialData was provided or if we have a createdAt date
    const isEditMode = !!initialData || !!po.createdAt

    const [vendors, setVendors] = useState<Vendor[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [generating, setGenerating] = useState(false)

    // Track saved state
    const [hasBeenSaved, setHasBeenSaved] = useState(isEditMode)

    const snapshotPO = (p: PurchaseOrder) => {
        // Exclude timestamp fields so they don't cause dirty state flips
        const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = p as any
        return JSON.stringify(rest)
    }

    const [savedSnapshot, setSavedSnapshot] = useState<string | null>(initialData ? snapshotPO(initialData) : null)
    const [isDirty, setIsDirty] = useState(false)
    const [isValidForExport, setIsValidForExport] = useState(false)
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
    const [showColumnCustomizer, setShowColumnCustomizer] = useState(false)
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => ({ ...DEFAULT_PO_COLUMNS }))

    useEffect(() => {
        const isHtmlEmpty = (html?: string) => {
            if (!html) return true
            const text = html
                .replace(/&nbsp;/gi, ' ')
                .replace(/<[^>]*>/g, '')
                .trim()
            return text.length === 0
        }

        const loadData = async () => {
            try {
                const [vendorsData, vehiclesData, settingsData] = await Promise.all([
                    getAllVendors(),
                    getAllVehicles(),
                    getAdminSettings(),
                ])
                setVendors(vendorsData)
                setVehicles(vehiclesData)

                // Ensure admin settings exist so default terms can be applied
                let currentSettings = settingsData
                if (!currentSettings) {
                    currentSettings = await initializeAdminSettings()
                }
                setAdminSettings(currentSettings)

                const defaultPOTerms = (currentSettings as any)?.defaultPurchaseOrderTerms ?? currentSettings?.defaultTerms

                // If creating new and default terms exist, set them (without overwriting user edits)
                if (!isEditMode && defaultPOTerms) {
                    setPo((prev) => {
                        if (!isHtmlEmpty(prev.terms)) return prev
                        return { ...prev, terms: defaultPOTerms }
                    })
                }

                // Generate PO number if new and not already set
                if (!isEditMode && !po.number) {
                    const poNumber = `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`
                    setPo((prev) => ({
                        ...prev,
                        number: poNumber,
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

    const calculateTotals = (items: POItem[]) => {
        let subTotal = 0
        let totalTax = 0

        items.forEach((item, index) => {
            // Calculate gross amount (quantity * unitPrice)
            const grossAmount = item.quantity * item.unitPrice

            // Calculate tax as percentage
            const taxPercent = item.taxPercent !== undefined && item.taxPercent !== null ? item.taxPercent : 0
            const itemTax = grossAmount * (taxPercent / 100)

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

        const total = subTotal + totalTax
        return { subtotal: subTotal, tax: totalTax, total }
    }

    // Real-time validation
    const validatePOState = (poToValidate: PurchaseOrder) => {
        const errors: ValidationError[] = []

        if (!poToValidate.number) {
            errors.push({ field: 'number', message: 'PO number is required' })
        }
        if (!poToValidate.vendorId) {
            errors.push({ field: 'vendorId', message: 'Vendor must be selected' })
        }
        if (!poToValidate.items || poToValidate.items.length === 0) {
            errors.push({ field: 'items', message: 'At least one line item is required' })
        } else {
            poToValidate.items.forEach((item, index) => {
                const hasDescription = item.description && item.description.trim() !== ''
                const hasVehicle = item.vehicleNumber && item.vehicleNumber.trim() !== ''
                if (!hasDescription && !hasVehicle) {
                    errors.push({ field: `items[${index}]`, message: 'Line item must have either vehicle number or description' })
                }
                if (item.unitPrice <= 0) {
                    errors.push({ field: `items[${index}].unitPrice`, message: 'Line item price must be greater than zero' })
                }
            })
        }
        const totals = calculateTotals(poToValidate.items)
        if (totals.total <= 0) {
            errors.push({ field: 'total', message: 'PO total must be greater than zero' })
        }

        setValidationErrors(errors)
        setIsValidForExport(errors.length === 0)
    }

    useEffect(() => {
        validatePOState(po)
        if (!savedSnapshot) {
            // If never saved, and has data entered, it's dirty? 
            // Actually, if savedSnapshot is null (new PO), any change from default makes it dirty or just different.
            // But let's follow the previous logic: newly created -> not dirty until saved once? 
            // Or rather simple: if snapshot exists, compare. If not, maybe treat as dirty if specific fields filled?
            // The original code set dirty to false initially.
            setIsDirty(false)
            return
        }
        setIsDirty(snapshotPO(po) !== savedSnapshot)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [po, savedSnapshot])

    const exportDisabledReason = useMemo(() => {
        if (generating) return 'Generating...'
        if (isEditMode && isDirty) return 'Update to enable export'
        if (!isValidForExport) return 'Complete required fields to enable export'
        return null
    }, [generating, isEditMode, isDirty, isValidForExport])

    const exportTitle = useMemo(() => {
        if (exportDisabledReason) return exportDisabledReason
        if (!isEditMode && !hasBeenSaved) return 'Will create this record, then download.'
        return ''
    }, [exportDisabledReason, isEditMode, hasBeenSaved])

    const handleAddLineItem = () => {
        const newItem: POItem = {
            id: generateId(),
            serialNumber: po.items.length + 1,
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
        const newItems = [...po.items, newItem]
        const totals = calculateTotals(newItems)
        setPo({ ...po, items: newItems, ...totals, amount: totals.total })
    }

    const handleRemoveLineItem = (itemId: string) => {
        const updated = po.items.filter((item) => item.id !== itemId)
        const totals = calculateTotals(updated)
        setPo({ ...po, items: updated, ...totals, amount: totals.total })
    }

    const handleLineItemChange = (itemId: string, field: keyof POItem, value: any) => {
        const updated = po.items.map((item) => {
            if (item.id !== itemId) return item

            const updatedItem = { ...item, [field]: value }

            // If changing vehicle number, find vehicle and update related fields
            if (field === 'vehicleNumber' && value) {
                const vehicle = vehicles.find((v) => v.vehicleNumber === value)
                if (vehicle) {
                    updatedItem.vehicleTypeId = vehicle.id
                    updatedItem.vehicleTypeLabel = vehicle.vehicleType || vehicle.vehicleNumber || ''
                    updatedItem.vehicleType = vehicle.vehicleType
                    updatedItem.make = vehicle.make
                    updatedItem.model = vehicle.model
                    updatedItem.year = vehicle.year
                    updatedItem.basePrice = vehicle.basePrice
                    // Auto-fill description from vehicle if not already set
                    if (!updatedItem.description) {
                        updatedItem.description = vehicle.description || ''
                    }
                    // Auto-fill basePrice as unitPrice if unitPrice is 0 and basePrice exists
                    if (updatedItem.unitPrice === 0 && vehicle.basePrice) {
                        updatedItem.unitPrice = vehicle.basePrice
                    }
                }
            }

            // If changing vehicle type (for backward compatibility)
            if (field === 'vehicleTypeId' && value) {
                const vehicle = vehicles.find((v) => v.id === value)
                if (vehicle) {
                    updatedItem.vehicleTypeLabel = vehicle.vehicleType || vehicle.vehicleNumber || ''
                    updatedItem.vehicleNumber = vehicle.vehicleNumber || ''
                    updatedItem.vehicleType = vehicle.vehicleType
                    updatedItem.make = vehicle.make
                    updatedItem.model = vehicle.model
                    updatedItem.year = vehicle.year
                    updatedItem.basePrice = vehicle.basePrice
                    if (!updatedItem.description) {
                        updatedItem.description = vehicle.description || ''
                    }
                    // Auto-fill basePrice as unitPrice if unitPrice is 0 and basePrice exists
                    if (updatedItem.unitPrice === 0 && vehicle.basePrice) {
                        updatedItem.unitPrice = vehicle.basePrice
                    }
                }
            }

            // Recalculate item totals when relevant fields change
            if (field === 'quantity' || field === 'unitPrice' || field === 'taxPercent' || field === 'tax') {
                const grossAmount = (updatedItem.quantity || 0) * (updatedItem.unitPrice || 0)
                const taxPercent = updatedItem.taxPercent !== undefined && updatedItem.taxPercent !== null ? updatedItem.taxPercent : 0
                const itemTax = grossAmount * (taxPercent / 100)
                const lineTotal = grossAmount + itemTax

                updatedItem.grossAmount = grossAmount
                updatedItem.lineTaxAmount = itemTax
                updatedItem.lineTotal = lineTotal
                updatedItem.total = lineTotal
            }

            return updatedItem
        })
        const totals = calculateTotals(updated)
        const updatedPO = { ...po, items: updated, ...totals, amount: totals.total }
        setPo(updatedPO)
        validatePOState(updatedPO)
    }

    const handleSave = async (opts?: { redirectAfterSave?: boolean }): Promise<boolean> => {
        // Validation
        if (!po.number) {
            toast({ title: 'Error', description: 'PO number is required', variant: 'destructive' })
            return false
        }

        if (!po.vendorId) {
            toast({ title: 'Error', description: 'Vendor is required', variant: 'destructive' })
            return false
        }

        if (po.items.length === 0 || po.items.some((item) => !item.description || item.unitPrice <= 0)) {
            toast({ title: 'Error', description: 'Please add at least one line item with description and price', variant: 'destructive' })
            return false
        }

        try {
            setSaving(true)
            const totals = calculateTotals(po.items)
            const poToSave: PurchaseOrder = {
                ...po,
                createdAt: po.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                subtotal: totals.subtotal,
                tax: totals.tax,
                amount: totals.total,
            }
            await savePurchaseOrder(poToSave)
            setPo(poToSave)
            setSavedSnapshot(snapshotPO(poToSave))
            setIsDirty(false)
            setHasBeenSaved(true)
            setValidationErrors([])
            toast({
                title: 'Success',
                description: isEditMode ? 'Purchase order updated successfully' : 'Purchase order created successfully',
            })

            if (onSave) {
                onSave(poToSave)
            }
            return true
        } catch (err) {
            console.error('Error saving PO:', err)
            toast({ title: 'Error', description: 'Failed to save purchase order', variant: 'destructive' })
            return false
        } finally {
            setSaving(false)
        }
    }

    const ensureSavedForExport = async (): Promise<boolean> => {
        // Edit mode: require save if dirty
        if (isEditMode && isDirty) {
            toast({ title: 'Update required', description: 'Please update/save before exporting', variant: 'destructive' })
            return false
        }

        // New mode: auto-save if not saved yet
        if (!isEditMode && !hasBeenSaved) {
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

        if (!isValidForExport) {
            toast({ title: 'Validation', description: 'Please fix validation errors', variant: 'destructive' })
            return
        }

        const vendor = vendors.find((v) => v.id === po.vendorId)
        const vendorName = vendor?.name || 'Unknown Vendor'
        const totals = calculateTotals(po.items)
        const poForExport: PurchaseOrder = { ...po, subtotal: totals.subtotal, tax: totals.tax, amount: totals.total }

        setGenerating(true)
        try {
            const pdfBlob = await pdfRenderer.renderPurchaseOrderToPdf(poForExport, adminSettings, vendorName)
            const filename = `po-${po.number}.pdf`
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
        if (!isValidForExport) return

        const vendor = vendors.find((v) => v.id === po.vendorId)
        const vendorName = vendor?.name || 'Unknown Vendor'
        const poForExport: PurchaseOrder = { ...po, ...calculateTotals(po.items) }

        setGenerating(true)
        try {
            const excelBlob = await excelRenderer.renderPurchaseOrderToExcel(poForExport, adminSettings, vendorName)
            const filename = `po-${po.number}.xlsx`
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
        if (!isValidForExport) return

        const vendor = vendors.find((v) => v.id === po.vendorId)
        const vendorName = vendor?.name || 'Unknown Vendor'
        const poForExport: PurchaseOrder = { ...po, ...calculateTotals(po.items) }

        setGenerating(true)
        try {
            const docxBlob = await docxRenderer.renderPurchaseOrderToDocx(poForExport, adminSettings, vendorName)
            const filename = `po-${po.number}.docx`
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
                <p>Loading PO editor...</p>
            </div>
        )
    }

    const selectedVendor = vendors.find((v) => v.id === po.vendorId)

    return (
        <div className="p-8">
            <div className="mb-4">
                <Link 
                    href="/purchase-orders" 
                    className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-2"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Purchase Orders
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">
                    {isEditMode ? 'Edit Purchase Order' : 'Create New Purchase Order'}
                </h1>
                <p className="text-slate-500 text-sm">
                    {isEditMode ? `PO ${po.number}` : 'Fill in the details'}
                </p>
            </div>

            {/* PO Details, Vendor & Summary Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {/* PO Details */}
                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-base">Purchase Order Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <Label htmlFor="number" className="text-slate-700 text-xs">
                                    PO Number
                                </Label>
                                <Input
                                    id="number"
                                    value={po.number}
                                    disabled
                                    className="mt-1 h-8 bg-slate-50"
                                />
                            </div>
                            <div>
                                <Label htmlFor="status" className="text-slate-700 text-xs">
                                    Status
                                </Label>
                                <Select
                                    value={po.status || 'draft'}
                                    onValueChange={(val) => setPo({ ...po, status: val })}
                                >
                                    <SelectTrigger className="mt-1 h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="sent">Sent</SelectItem>
                                        <SelectItem value="accepted">Accepted</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <Label htmlFor="date" className="text-slate-700 text-xs">
                                    PO Date
                                </Label>
                                <Input
                                    type="date"
                                    value={po.date}
                                    onChange={(e) => setPo({ ...po, date: e.target.value })}
                                    className="mt-1 h-8"
                                />
                            </div>
                            <div>
                                <Label htmlFor="amount" className="text-slate-700 text-xs">
                                    Amount (AED)
                                </Label>
                                <Input
                                    value={po.amount?.toFixed(2) || '0.00'}
                                    disabled
                                    className="mt-1 h-8 bg-slate-50 font-mono"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Vendor Selection */}
                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-base">Vendor</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="vendor" className="text-slate-700 text-xs">
                                Select Vendor *
                            </Label>
                            <Select
                                value={po.vendorId || ''}
                                onValueChange={(val) => setPo({ ...po, vendorId: val })}
                            >
                                <SelectTrigger className={`mt-1 h-8 ${!po.vendorId ? 'border-red-500' : ''}`}>
                                    <SelectValue placeholder="Select Vendor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors.map((v, idx) => (
                                        <SelectItem key={v.id ?? `v-${idx}`} value={v.id}>
                                            {v.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {po.vendorId && selectedVendor && (
                            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-sm">
                                <p className="font-semibold text-slate-900">{selectedVendor.name}</p>
                                {selectedVendor.contactPerson && (
                                    <p className="text-xs text-slate-600">{selectedVendor.contactPerson}</p>
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
                                <span className="font-semibold text-slate-900">AED {(po.subtotal || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Tax:</span>
                                <span className="font-semibold text-slate-900">AED {(po.tax || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex justify-between text-base font-bold pt-2">
                            <span className="text-slate-700">Total:</span>
                            <span className="text-blue-600">AED {(po.amount || 0).toFixed(2)}</span>
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
                                onClick={() => handleSave()}
                                disabled={saving}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md h-9"
                            >
                                {saving ? 'Saving...' : 'Save Purchase Order'}
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
                                        {po.items.map((item, index) => {
                                            return (
                                                <tr key={item.id ?? `po-item-${index}`} className="border-b hover:bg-slate-50">
                                                    {visibleColumns.serialNumber !== false && (
                                                        <td className="p-2 text-center text-slate-700">
                                                            {item.serialNumber || index + 1}
                                                        </td>
                                                    )}
                                                    {visibleColumns.vehicleNumber !== false && (
                                                        <td className="p-2 min-w-[100px]">
                                                            <Select
                                                                value={item.vehicleNumber || '__manual__'}
                                                                onValueChange={(value) => handleLineItemChange(item.id, 'vehicleNumber', value === '__manual__' ? '' : value)}
                                                            >
                                                                <SelectTrigger className="h-7 text-xs">
                                                                    <SelectValue placeholder="Vehicle..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="__manual__">Manual Entry</SelectItem>
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
                                                                            value={item.rentalBasis || '__none__'}
                                                                            onValueChange={(value) => handleLineItemChange(item.id, 'rentalBasis', value === '__none__' ? undefined : value)}
                                                                        >
                                                                            <SelectTrigger className="h-7 text-xs">
                                                                                <SelectValue placeholder="-" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="__none__">None</SelectItem>
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

            {/* Column Customization Dialog */}
            <Dialog open={showColumnCustomizer} onOpenChange={setShowColumnCustomizer}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Customize Columns</DialogTitle>
                        <DialogDescription>
                            Select which columns to display
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
                                        setVisibleColumns((prev) => ({
                                            ...prev,
                                            [col.key]: checked !== false,
                                        }))
                                    }}
                                />
                                <Label htmlFor={col.key} className="text-sm font-normal cursor-pointer">
                                    {col.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Terms & Conditions - Full Width */}
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-base">Terms &amp; Conditions</CardTitle>
                    <CardDescription className="text-xs">
                        Defaults come from Admin Settings. Editing here overrides the default for this purchase order.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RichTextEditor
                        value={po.terms || ''}
                        onChange={(html) => setPo({ ...po, terms: html })}
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
                        value={po.notes || ''}
                        onChange={(e) => setPo({ ...po, notes: e.target.value })}
                        placeholder="Add notes..."
                        rows={3}
                        className="text-xs"
                    />
                </CardContent>
            </Card>
        </div>
    )
}
