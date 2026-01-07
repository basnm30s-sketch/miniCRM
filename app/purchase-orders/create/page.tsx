'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ArrowLeft, FileText, Plus, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  getPurchaseOrderById,
  getAllPurchaseOrders,
  savePurchaseOrder,
  getAllVendors,
  generateId,
  getAdminSettings,
} from '@/lib/storage'
import { pdfRenderer } from '@/lib/pdf'
import type { PurchaseOrder, Vendor, AdminSettings, POItem } from '@/lib/types'

export default function CreatePurchaseOrderPage() {
  const [po, setPo] = useState<PurchaseOrder>({
    id: '',
    number: '',
    date: new Date().toISOString().split('T')[0],
    vendorId: '',
    items: [{ id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0 }],
    subtotal: 0,
    tax: 0,
    amount: 0,
    currency: 'AED',
    status: 'draft',
    createdAt: new Date().toISOString(),
  })

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [hasBeenSaved, setHasBeenSaved] = useState(false)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isValidForExport, setIsValidForExport] = useState(false)

  const snapshotPO = (p: PurchaseOrder) => {
    // Exclude timestamp fields so they don't cause dirty state flips
    const { createdAt: _createdAt, ...rest } = p as any
    return JSON.stringify(rest)
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vendorsData, settingsData] = await Promise.all([
          getAllVendors(),
          getAdminSettings(),
        ])
        setVendors(vendorsData)
        setAdminSettings(settingsData)

        // Check if editing existing PO
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
        const poId = urlParams?.get('id')

        if (poId) {
          const existing = await getPurchaseOrderById(poId)
          if (existing) {
            setPo(existing)
            setIsEditMode(true)
            setHasBeenSaved(true)
            setSavedSnapshot(snapshotPO(existing))
            setIsDirty(false)
          }
        } else {
          // Generate PO number for new PO
          const poNumber = `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`
          setPo((prev) => ({
            ...prev,
            id: generateId(),
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
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const tax = items.reduce((sum, item) => sum + (item.tax || 0), 0)
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  const validatePOForExport = (p: PurchaseOrder) => {
    if (!p.number) return false
    if (!p.vendorId) return false
    if (!p.items || p.items.length === 0) return false
    if (p.items.some((item) => !item.description || item.unitPrice <= 0)) return false
    const totals = calculateTotals(p.items)
    if (!totals.total || totals.total <= 0) return false
    return true
  }

  useEffect(() => {
    setIsValidForExport(validatePOForExport(po))
    if (!savedSnapshot) {
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
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    }
    setPo({ ...po, items: [...po.items, newItem] })
  }

  const handleRemoveLineItem = (itemId: string) => {
    const updated = po.items.filter((item) => item.id !== itemId)
    const totals = calculateTotals(updated)
    setPo({ ...po, items: updated, ...totals, amount: totals.total })
  }

  const handleLineItemChange = (itemId: string, field: keyof POItem, value: any) => {
    const updated = po.items.map((item) => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value }
        // Recalculate total for this item
        const lineTotal = updatedItem.quantity * updatedItem.unitPrice + (updatedItem.tax || 0)
        updatedItem.total = lineTotal
        return updatedItem
      }
      return item
    })
    const totals = calculateTotals(updated)
    setPo({ ...po, items: updated, ...totals, amount: totals.total })
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
        subtotal: totals.subtotal,
        tax: totals.tax,
        amount: totals.total,
      }
      await savePurchaseOrder(poToSave)
      setPo(poToSave)
      setSavedSnapshot(snapshotPO(poToSave))
      setIsDirty(false)
      setHasBeenSaved(true)
      toast({
        title: 'Success',
        description: isEditMode ? 'Purchase order updated successfully' : 'Purchase order created successfully',
      })
      if (!isEditMode) setIsEditMode(true)
      if (opts?.redirectAfterSave !== false) {
        // Redirect to PO list
        window.location.href = '/purchase-orders'
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
    if (isEditMode && isDirty) {
      toast({ title: 'Update required', description: 'Please update/save before exporting', variant: 'destructive' })
      return false
    }

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

    if (!po.vendorId) {
      toast({ title: 'Validation', description: 'Please select a vendor', variant: 'destructive' })
      return
    }

    const totals = calculateTotals(po.items)
    if (!totals.total || totals.total <= 0) {
      toast({ title: 'Validation', description: 'Please add at least one line item with price', variant: 'destructive' })
      return
    }

    const vendor = vendors.find((v) => v.id === po.vendorId)
    const vendorName = vendor?.name || 'Unknown Vendor'
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
        <Link href="/purchase-orders">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">
          {isEditMode ? 'Edit Purchase Order' : 'Create New Purchase Order'}
        </h1>
        <p className="text-slate-500 mt-1">
          {isEditMode ? `PO ${po.number}` : 'Fill in the details below'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="col-span-2 space-y-6">
          {/* PO Details */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="number" className="text-slate-700">
                    PO Number
                  </Label>
                  <input
                    id="number"
                    type="text"
                    value={po.number}
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
                    value={po.status || 'draft'}
                    onChange={(e) => setPo({ ...po, status: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date" className="text-slate-700">
                    PO Date
                  </Label>
                  <input
                    id="date"
                    type="date"
                    value={po.date}
                    onChange={(e) => setPo({ ...po, date: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900"
                  />
                </div>
                <div>
                  <Label htmlFor="vendor" className="text-slate-700">
                    Vendor *
                  </Label>
                  <select
                    id="vendor"
                    value={po.vendorId || ''}
                    onChange={(e) => setPo({ ...po, vendorId: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900"
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((v, idx) => (
                      <option key={v.id ?? `vendor-${idx}`} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="amount" className="text-slate-700">
                  Amount (AED) *
                </Label>
                <input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={po.amount || ''}
                  disabled
                  className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-slate-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>Add line items for this purchase order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Unit Price (AED)</th>
                      <th className="text-right p-2">Tax (AED)</th>
                      <th className="text-right p-2">Total (AED)</th>
                      <th className="text-center p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item, idx) => (
                      <tr key={item.id ?? `po-item-${idx}`} className="border-b hover:bg-slate-50">
                        <td className="p-2">
                          <Input
                            type="text"
                            placeholder="Item description"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                            className="h-8 text-slate-900"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="h-8 w-16 text-right text-slate-900"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="h-8 w-24 text-right text-slate-900"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.tax || ''}
                            onChange={(e) => handleLineItemChange(item.id, 'tax', parseFloat(e.target.value) || 0)}
                            className="h-8 w-24 text-right text-slate-900"
                          />
                        </td>
                        <td className="p-2 text-right font-semibold text-slate-900">
                          {item.total.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveLineItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                            disabled={po.items.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
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
                placeholder="Add any additional notes or instructions..."
                value={po.notes || ''}
                onChange={(e) => setPo({ ...po, notes: e.target.value })}
                rows={4}
                className="text-slate-900"
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
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold text-slate-900">AED {(po.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax:</span>
                  <span className="font-semibold text-slate-900">AED {(po.tax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span className="text-slate-900">AED {po.amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-slate-600">Status:</span>
                  <span className="font-semibold text-slate-900">{po.status || 'draft'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Vendor:</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {vendors.find((v) => v.id === po.vendorId)?.name || '-'}
                  </span>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button
                  onClick={handleDownloadPDF}
                  disabled={!!exportDisabledReason}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  title={exportTitle}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {generating ? 'Generating PDF...' : 'Save PDF'}
                </Button>
                <Button
                  onClick={() => handleSave({ redirectAfterSave: true })}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? 'Saving...' : isEditMode ? 'Update PO' : 'Create PO'}
                </Button>
                <Link href="/purchase-orders" className="block">
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
