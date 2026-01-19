'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import PurchaseOrderForm from '@/app/purchase-orders/PurchaseOrderForm'
import { getAllPurchaseOrders, deletePurchaseOrder, getAllVendors, getAdminSettings, savePurchaseOrder } from '@/lib/storage'
import { useAdminSettings } from '@/hooks/use-admin-settings'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useRouter } from 'next/navigation'
import { Edit3 } from 'lucide-react'
import { TwoPaneListHeader } from '@/components/TwoPaneListHeader'
import { ReadOnlyLineItemsTable } from '@/components/doc-generator/ReadOnlyLineItemsTable'
import { DEFAULT_PO_COLUMNS } from '@/lib/doc-generator/line-item-columns'

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const [pos, setPos] = useState<PurchaseOrder[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const { data: adminSettings, isLoading: settingsLoading } = useAdminSettings()
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [poToDelete, setPoToDelete] = useState<string | null>(null)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  const useTwoPane = useMemo(() => {
    // Backward-compatible default: true when unset
    return adminSettings?.showPurchaseOrdersTwoPane !== false
  }, [adminSettings?.showPurchaseOrdersTwoPane])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allPos, allVendors] = await Promise.all([
          getAllPurchaseOrders(),
          getAllVendors(),
        ])
        setPos(allPos)
        setVendors(allVendors)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (!useTwoPane) return
    if (pos.length === 0) return

    setSelectedPO((prev) => {
      if (prev && pos.some((p) => p.id === prev.id)) return prev
      return pos[0]
    })
  }, [useTwoPane, pos])

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
      const settings = adminSettings || (await getAdminSettings())
      if (!settings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }
      const vendor = vendors.find((v) => v.id === po.vendorId)
      const vendorName = vendor?.name || 'Unknown Vendor'
      const blob = await pdfRenderer.renderPurchaseOrderToPdf(po, settings, vendorName)
      pdfRenderer.downloadPdf(blob, `po-${po.number}.pdf`)
      toast({ title: 'Success', description: 'PDF downloaded successfully' })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' })
    }
  }

  const handleDownloadExcel = async (po: PurchaseOrder) => {
    try {
      const settings = adminSettings || (await getAdminSettings())
      if (!settings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }
      const vendor = vendors.find((v) => v.id === po.vendorId)
      const vendorName = vendor?.name || 'Unknown Vendor'
      const blob = await excelRenderer.renderPurchaseOrderToExcel(po, settings, vendorName)
      excelRenderer.downloadExcel(blob, `po-${po.number}.xlsx`)
      toast({ title: 'Success', description: 'Excel file downloaded successfully' })
    } catch (error) {
      console.error('Error generating Excel:', error)
      toast({ title: 'Error', description: 'Failed to generate Excel file', variant: 'destructive' })
    }
  }

  const handleDownloadDocx = async (po: PurchaseOrder) => {
    try {
      const settings = adminSettings || (await getAdminSettings())
      if (!settings) {
        toast({ title: 'Error', description: 'Admin settings not configured', variant: 'destructive' })
        return
      }
      const vendor = vendors.find((v) => v.id === po.vendorId)
      const vendorName = vendor?.name || 'Unknown Vendor'
      const blob = await docxRenderer.renderPurchaseOrderToDocx(po, settings, vendorName)
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

  // Helper functions for table display
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return 'AED 0.00'
    return `AED ${amount.toFixed(2)}`
  }

  const getVendorDetails = (vendorId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId)
    if (!vendor) return null
    return {
      name: vendor.name,
      contactPerson: vendor.contactPerson,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address
    }
  }

  const handlePOSave = (savedPO: PurchaseOrder) => {
    setPos((prev) => prev.map((po) => (po.id === savedPO.id ? savedPO : po)))
    setSelectedPO(savedPO)
    setIsEditing(false)
  }

  if (loading || settingsLoading) {
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
        {!useTwoPane && (
          <Link href="/purchase-orders/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Create PO
            </Button>
          </Link>
        )}
      </div>

      {useTwoPane ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Pane - List View */}
          <div className="w-[380px] border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
          <TwoPaneListHeader
            title="All Orders"
            count={pos.length}
            action={
              <Link href="/purchase-orders/create">
                <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create PO
                </Button>
              </Link>
            }
          />

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
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                  {/* Vendor Details & Summary Group */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Vendor Details */}
                    <Card className="col-span-2 shadow-sm border-slate-200">
                      <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Vendor Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="block text-slate-500 text-xs mb-1">Vendor Name</span>
                          <span className="font-medium text-slate-900">{getVendorName(selectedPO.vendorId)}</span>
                        </div>
                        {(() => {
                          const vendor = getVendorDetails(selectedPO.vendorId)
                          if (!vendor) return null
                          return (
                            <>
                              {vendor.contactPerson && (
                                <div>
                                  <span className="block text-slate-500 text-xs mb-1">Contact Person</span>
                                  <span className="text-slate-900">{vendor.contactPerson}</span>
                                </div>
                              )}
                              {vendor.email && (
                                <div>
                                  <span className="block text-slate-500 text-xs mb-1">Email</span>
                                  <span className="text-slate-900">{vendor.email}</span>
                                </div>
                              )}
                              {vendor.phone && (
                                <div>
                                  <span className="block text-slate-500 text-xs mb-1">Phone</span>
                                  <span className="text-slate-900">{vendor.phone}</span>
                                </div>
                              )}
                              {vendor.address && (
                                <div className="col-span-2">
                                  <span className="block text-slate-500 text-xs mb-1">Details</span>
                                  <span className="text-slate-900">{vendor.address}</span>
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

                  {/* Line Items - Full Width */}
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
                      <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Line Items</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3">
                      <ReadOnlyLineItemsTable
                        variant="purchaseOrder"
                        items={(selectedPO.items || []) as any}
                        visibleColumns={DEFAULT_PO_COLUMNS}
                      />
                    </CardContent>
                  </Card>

                  {/* Additional Info (Terms/Notes) */}
                  {(selectedPO.terms || selectedPO.notes) && (
                    <div className="grid grid-cols-1 gap-4">
                      {selectedPO.notes && (
                        <Card className="shadow-sm border-slate-200">
                          <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Notes</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3">
                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedPO.notes}</p>
                          </CardContent>
                        </Card>
                      )}

                      {selectedPO.terms && (
                        <Card className="shadow-sm border-slate-200">
                          <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Terms & Conditions</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3">
                            <div className={`prose prose-sm max-w-none text-slate-600 ${!showTerms ? 'line-clamp-4' : ''}`}
                              dangerouslySetInnerHTML={{ __html: selectedPO.terms }}
                            />
                            {selectedPO.terms.length > 200 && (
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
      ) : (
        // List-only table view
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <Card>
            <CardHeader>
              <CardTitle>All Purchase Orders ({pos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                          No purchase orders found.
                          <Link href="/purchase-orders/create" className="text-blue-600 hover:underline mt-2 text-sm inline-block">
                            Create your first purchase order
                          </Link>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pos.map((po) => {
                        const vendorDetails = getVendorDetails(po.vendorId)
                        const vendorTooltip = vendorDetails ? [
                          vendorDetails.name,
                          vendorDetails.contactPerson && `Contact: ${vendorDetails.contactPerson}`,
                          vendorDetails.email && `Email: ${vendorDetails.email}`,
                          vendorDetails.phone && `Phone: ${vendorDetails.phone}`,
                          vendorDetails.address && `Address: ${vendorDetails.address}`
                        ].filter(Boolean).join('\n') : 'Unknown Vendor'
                        
                        return (
                          <TableRow key={po.id}>
                            <TableCell className="font-mono text-sm font-medium text-slate-900">
                              {po.number}
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="max-w-[200px]">
                                      <div className="font-medium text-slate-900 truncate">
                                        {vendorDetails?.name || 'Unknown Vendor'}
                                      </div>
                                      {vendorDetails?.contactPerson && (
                                        <div className="text-xs text-slate-500 truncate mt-0.5">
                                          {vendorDetails.contactPerson}
                                        </div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="whitespace-pre-line max-w-xs">
                                    {vendorTooltip}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="text-slate-600">{po.date}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${getStatusColor(po.status)}`}>
                                {po.status || 'Draft'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs">
                                {po.items?.length || 0} {(po.items?.length || 0) === 1 ? 'item' : 'items'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              {formatCurrency(po.subtotal)}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              {formatCurrency(po.tax)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-slate-900">
                              {formatCurrency(po.amount)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/purchase-orders/create?id=${po.id}`)}
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
                                    <DropdownMenuItem onClick={() => handleDownloadPDF(po)}>
                                      <FileText className="w-4 h-4 mr-2 text-red-500" />
                                      PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownloadExcel(po)}>
                                      <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                                      Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownloadDocx(po)}>
                                      <FileIcon className="w-4 h-4 mr-2 text-blue-600" />
                                      Word
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(po.id)}
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



