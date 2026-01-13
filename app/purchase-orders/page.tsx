'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import PurchaseOrderForm from '@/app/purchase-orders/PurchaseOrderForm'
import { getAllPurchaseOrders, deletePurchaseOrder, getAllVendors, getAdminSettings, savePurchaseOrder } from '@/lib/storage'
import { pdfRenderer } from '@/lib/pdf'
import { excelRenderer } from '@/lib/excel'
import { docxRenderer } from '@/lib/docx'
import type { PurchaseOrder, Vendor, AdminSettings } from '@/lib/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
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
  Edit2,
  Trash2,
  FileText,
  ChevronDown,
  Share2,
  Download,
  FileSpreadsheet,
  File as FileIcon,
  Truck
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [poToDelete, setPoToDelete] = useState<string | null>(null)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allPos, allVendors, settings] = await Promise.all([
          getAllPurchaseOrders(),
          getAllVendors(),
          getAdminSettings(),
        ])
        setPos(allPos)
        setVendors(allVendors)
        setAdminSettings(settings)
        // Auto-select first PO if available
        if (allPos.length > 0) {
          setSelectedPO((prev) => prev || allPos[0])
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleDeleteClick = (id: string) => {
    setPoToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!poToDelete) return
    try {
      await deletePurchaseOrder(poToDelete)
      const updatedPos = pos.filter((po) => po.id !== poToDelete)
      setPos(updatedPos)
      // Clear selection if deleted PO was selected
      if (selectedPO?.id === poToDelete) {
        setSelectedPO(updatedPos.length > 0 ? updatedPos[0] : null)
        setIsEditing(false)
      }
      toast({ title: 'Success', description: 'Purchase order deleted successfully' })
    } catch (err) {
      console.error('Error deleting PO:', err)
      toast({ title: 'Error', description: 'Failed to delete purchase order', variant: 'destructive' })
    } finally {
      setDeleteDialogOpen(false)
      setPoToDelete(null)
    }
  }

  const handleDownloadPDF = async (po: PurchaseOrder) => {
    try {
      if (!adminSettings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }
      const vendor = vendors.find((v) => v.id === po.vendorId)
      const vendorName = vendor?.name || 'Unknown Vendor'
      const blob = await pdfRenderer.renderPurchaseOrderToPdf(po, adminSettings, vendorName)
      pdfRenderer.downloadPdf(blob, `po-${po.number}.pdf`)
      toast({ title: 'Success', description: 'PDF downloaded successfully' })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' })
    }
  }

  const handleDownloadExcel = async (po: PurchaseOrder) => {
    try {
      if (!adminSettings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }
      const vendor = vendors.find((v) => v.id === po.vendorId)
      const vendorName = vendor?.name || 'Unknown Vendor'
      const blob = await excelRenderer.renderPurchaseOrderToExcel(po, adminSettings, vendorName)
      excelRenderer.downloadExcel(blob, `po-${po.number}.xlsx`)
      toast({ title: 'Success', description: 'Excel file downloaded successfully' })
    } catch (error) {
      console.error('Error generating Excel:', error)
      toast({ title: 'Error', description: 'Failed to generate Excel file', variant: 'destructive' })
    }
  }

  const handleDownloadDocx = async (po: PurchaseOrder) => {
    try {
      if (!adminSettings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }
      const vendor = vendors.find((v) => v.id === po.vendorId)
      const vendorName = vendor?.name || 'Unknown Vendor'
      const blob = await docxRenderer.renderPurchaseOrderToDocx(po, adminSettings, vendorName)
      docxRenderer.downloadDocx(blob, `po-${po.number}.docx`)
      toast({ title: 'Success', description: 'Word document downloaded successfully' })
    } catch (error) {
      console.error('Error generating DOCX:', error)
      toast({ title: 'Error', description: 'Failed to generate Word document', variant: 'destructive' })
    }
  }

  const getVendorName = (vendorId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId)
    return vendor?.name || '-'
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'sent':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  const handlePOSave = (savedPO: PurchaseOrder) => {
    setPos((prev) => prev.map((po) => (po.id === savedPO.id ? savedPO : po)))
    setSelectedPO(savedPO)
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-slate-500 animate-pulse">Loading purchase orders...</div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500">Manage and track purchase orders to vendors</p>
        </div>
        <Link href="/purchase-orders/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Create PO
          </Button>
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane - List View */}
        <div className="w-[380px] border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
          <div className="p-3 bg-slate-50/50 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
              All Orders ({pos.length})
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {pos.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p className="text-sm">No purchase orders found.</p>
                <Link href="/purchase-orders/create" className="text-blue-600 hover:underline mt-2 text-sm inline-block">
                  Create your first PO
                </Link>
              </div>
            ) : (
              pos.map((po) => {
                const isSelected = selectedPO?.id === po.id

                return (
                  <div
                    key={po.id}
                    className={`group px-4 py-3 cursor-pointer transition-all duration-200 border-l-[3px] hover:bg-slate-50 ${isSelected
                      ? 'bg-blue-50/60 border-blue-600'
                      : 'border-transparent hover:border-slate-300'
                      }`}
                    onClick={() => {
                      setSelectedPO(po)
                      setIsEditing(false)
                    }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-mono text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                        {po.number}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        AED {po.amount?.toFixed(2) || '0.00'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm text-slate-700 font-medium truncate pr-2">
                        {getVendorName(po.vendorId)}
                      </div>
                      <div className="text-xs text-slate-400 whitespace-nowrap">
                        {po.date}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 rounded-sm font-medium ${getStatusColor(po.status)}`}>
                        {po.status || 'Draft'}
                      </Badge>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Pane - Detail View */}
        <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col">
          {selectedPO ? (
            isEditing ? (
              <div className="h-full overflow-y-auto bg-white">
                <PurchaseOrderForm
                  initialData={selectedPO}
                  onSave={handlePOSave}
                  onCancel={() => setIsEditing(false)}
                />
              </div>
            ) : (
              <>
                {/* Header Actions */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-start shadow-sm z-10">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-slate-900">{selectedPO.number}</h2>
                      <Badge variant="outline" className={`${getStatusColor(selectedPO.status)}`}>
                        {selectedPO.status || 'Draft'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span>{getVendorName(selectedPO.vendorId)}</span>
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
                        <DropdownMenuItem onClick={() => handleDownloadPDF(selectedPO)}>
                          <FileText className="w-4 h-4 mr-2 text-red-500" />
                          PDF Document
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadExcel(selectedPO)}>
                          <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                          Excel Spreadsheet
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadDocx(selectedPO)}>
                          <FileIcon className="w-4 h-4 mr-2 text-blue-600" />
                          Word Document
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>


                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => handleDeleteClick(selectedPO.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>



                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                  {/* Vendor Details */}
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                      <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Vendor Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="block text-slate-500 text-xs mb-1">Vendor Name</span>
                        <span className="font-medium text-slate-900">{getVendorName(selectedPO.vendorId)}</span>
                      </div>
                      {selectedPO.vendor && (
                        <>
                          {selectedPO.vendor.contactPerson && (
                            <div>
                              <span className="block text-slate-500 text-xs mb-1">Contact Person</span>
                              <span className="text-slate-900">{selectedPO.vendor.contactPerson}</span>
                            </div>
                          )}
                          {selectedPO.vendor.email && (
                            <div>
                              <span className="block text-slate-500 text-xs mb-1">Email</span>
                              <span className="text-slate-900">{selectedPO.vendor.email}</span>
                            </div>
                          )}
                          {selectedPO.vendor.phone && (
                            <div>
                              <span className="block text-slate-500 text-xs mb-1">Phone</span>
                              <span className="text-slate-900">{selectedPO.vendor.phone}</span>
                            </div>
                          )}
                          {selectedPO.vendor.address && (
                            <div className="col-span-2">
                              <span className="block text-slate-500 text-xs mb-1">Address</span>
                              <span className="text-slate-900">{selectedPO.vendor.address}</span>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Items Table */}
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                      <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Order Items</CardTitle>
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
                          {selectedPO.items?.map((item) => {
                            const itemTotal = item.quantity * item.unitPrice
                            const taxAmount = item.tax || item.lineTaxAmount || 0
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50">
                                <td className="py-3 px-4 font-medium text-slate-700">{item.description || item.vehicleTypeLabel || 'N/A'}</td>
                                <td className="py-3 px-4 text-right text-slate-600">{item.quantity}</td>
                                <td className="py-3 px-4 text-right text-slate-600">AED {item.unitPrice.toFixed(2)}</td>
                                <td className="py-3 px-4 text-right text-slate-500 text-xs">AED {taxAmount.toFixed(2)}</td>
                                <td className="py-3 px-4 text-right font-semibold text-slate-900">AED {(itemTotal + taxAmount).toFixed(2)}</td>
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
                          <span>AED {(selectedPO.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Tax</span>
                          <span>AED {(selectedPO.tax || 0).toFixed(2)}</span>
                        </div>
                        <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-baseline">
                          <span className="font-semibold text-slate-900">Total</span>
                          <span className="text-xl font-bold text-slate-900">AED {(selectedPO.amount || 0).toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Notes */}
                  {selectedPO.notes && (
                    <Card className="shadow-sm border-slate-200">
                      <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Notes</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedPO.notes}</p>
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
              <p className="text-lg font-medium text-slate-600">No purchase order selected</p>
              <p className="text-sm max-w-xs text-center mt-2">
                Select a purchase order from the list to view details or create a new one.
              </p>
              <Link href="/purchase-orders/create" className="mt-6">
                <Button variant="outline">Create New PO</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this purchase order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete PO
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
