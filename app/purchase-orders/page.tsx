'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2, Download } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { getAllPurchaseOrders, deletePurchaseOrder, getAllVendors, getAdminSettings } from '@/lib/storage'
import { pdfRenderer } from '@/lib/pdf'
import type { PurchaseOrder, Vendor, AdminSettings } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [poToDelete, setPoToDelete] = useState<string | null>(null)

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
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading purchase orders...</div>
      </div>
    )
  }

  const handleDeleteClick = (id: string) => {
    setPoToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!poToDelete) return
    try {
      await deletePurchaseOrder(poToDelete)
      await reloadData()
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

  const renderCell = (content: string | React.ReactNode, maxLength: number = 50) => {
    const text = typeof content === 'string' ? content : ''
    if (text.length > maxLength) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help truncate">{text}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">{text}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
    return content
  }

  const getVendorName = (vendorId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId)
    return vendor?.name || '-'
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  const reloadData = async () => {
    try {
      const [allPos, allVendors] = await Promise.all([
        getAllPurchaseOrders(),
        getAllVendors(),
      ])
      setPos(allPos)
      setVendors(allVendors)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({ title: 'Error', description: 'Failed to load purchase orders', variant: 'destructive' })
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-500">Manage purchase orders from vendors</p>
        </div>
        <Link href="/purchase-orders/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create PO
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Purchase Orders ({pos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pos.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No purchase orders yet. Create your first PO to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount (AED)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono font-semibold text-slate-900">
                        {renderCell(po.number)}
                      </TableCell>
                      <TableCell className="text-slate-900">{getVendorName(po.vendorId)}</TableCell>
                      <TableCell className="text-slate-600">{po.date}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        AED {po.amount?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(po.status)}`}>
                          {po.status || 'draft'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Link href={`/purchase-orders/create?id=${po.id}`}>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPDF(po)}
                            title="Save PDF"
                            className="p-2 h-8 w-8 text-green-600 hover:text-green-700"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(po.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this purchase order? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
