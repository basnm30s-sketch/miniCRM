'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAllInvoices, getAllPurchaseOrders, getAllCustomers, getAllVendors } from '@/lib/storage'
import type { Invoice } from '@/lib/storage'
import type { PurchaseOrder, Customer, Vendor } from '@/lib/types'

interface CustomerReceivable {
  customerName: string
  outstanding: number
}

interface VendorPayable {
  vendorName: string
  pending: number
}

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allInvoices, allPurchaseOrders, allCustomers, allVendors] = await Promise.all([
          getAllInvoices(),
          getAllPurchaseOrders(),
          getAllCustomers(),
          getAllVendors(),
        ])
        setInvoices(allInvoices)
        setPurchaseOrders(allPurchaseOrders)
        setCustomers(allCustomers)
        setVendors(allVendors)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate customer receivables from invoices with 'invoice_sent' status
  // Use pending amount (total - amountReceived) instead of total
  const sentInvoices = invoices.filter((invoice) => invoice.status === 'invoice_sent')
  const customerReceivables: Map<string, number> = new Map()
  
  sentInvoices.forEach((invoice) => {
    if (invoice.customerId) {
      const customer = customers.find((c) => c.id === invoice.customerId)
      const customerName = customer?.company || customer?.name || 'Unknown'
      const total = invoice.total || 0
      const amountReceived = invoice.amountReceived || 0
      const pending = total - amountReceived
      const current = customerReceivables.get(customerName) || 0
      customerReceivables.set(customerName, current + pending)
    }
  })

  const receivablesList: CustomerReceivable[] = Array.from(customerReceivables.entries()).map(
    ([customerName, outstanding]) => ({
      customerName,
      outstanding,
    })
  )

  const totalReceivables = sentInvoices.reduce((sum, invoice) => {
    const total = invoice.total || 0
    const amountReceived = invoice.amountReceived || 0
    return sum + (total - amountReceived)
  }, 0)

  // Calculate vendor payables from purchase orders with 'accepted' status
  const acceptedPurchaseOrders = purchaseOrders.filter((po) => po.status === 'accepted')
  const vendorPayablesMap: Map<string, number> = new Map()
  
  acceptedPurchaseOrders.forEach((po) => {
    if (po.vendorId) {
      const vendor = vendors.find((v) => v.id === po.vendorId)
      const vendorName = vendor?.name || 'Unknown'
      const current = vendorPayablesMap.get(vendorName) || 0
      vendorPayablesMap.set(vendorName, current + (po.amount || 0))
    }
  })

  const vendorPayables: VendorPayable[] = Array.from(vendorPayablesMap.entries()).map(
    ([vendorName, pending]) => ({
      vendorName,
      pending,
    })
  )

  const totalPayables = acceptedPurchaseOrders.reduce((sum, po) => sum + (po.amount || 0), 0)

  // Mock salary due
  const salaryDue = 0.00

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">ALMSAR ALZAKI TRANSPORT AND MAINTENANCE</h1>
        <p className="text-slate-500">Dashboard</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Customer Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">AED {totalReceivables.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">Total outstanding receivables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Vendor Payables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">AED {totalPayables.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">Total owed to vendors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Salary Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">AED {salaryDue.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">Current cycle</p>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-2 gap-6">
        {/* Receivable by Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receivables by Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Outstanding (AED)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivablesList.length > 0 ? (
                  receivablesList.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-slate-900 font-medium">{item.customerName}</TableCell>
                      <TableCell className="text-right">{item.outstanding.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-500 py-4">
                      No data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payable by Vendor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payables by Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Pending (AED)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorPayables.length > 0 ? (
                  vendorPayables.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-slate-900 font-medium">{item.vendorName}</TableCell>
                      <TableCell className="text-right">{item.pending.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-500 py-4">
                      No data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
