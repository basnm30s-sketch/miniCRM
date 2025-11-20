'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAllQuotes } from '@/lib/storage'
import type { Quote } from '@/lib/types'

interface CustomerReceivable {
  customerName: string
  outstanding: number
}

interface VendorPayable {
  vendorName: string
  pending: number
}

export default function DashboardPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const allQuotes = await getAllQuotes()
        setQuotes(allQuotes)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate customer receivables
  const customerReceivables: Map<string, number> = new Map()
  quotes.forEach((quote) => {
    const customerName = quote.customer?.company || quote.customer?.name || 'Unknown'
    const current = customerReceivables.get(customerName) || 0
    customerReceivables.set(customerName, current + quote.total)
  })

  const receivablesList: CustomerReceivable[] = Array.from(customerReceivables.entries()).map(
    ([customerName, outstanding]) => ({
      customerName,
      outstanding,
    })
  )

  const totalReceivables = Array.from(customerReceivables.values()).reduce((a, b) => a + b, 0)

  // Mock vendor payables data
  const vendorPayables: VendorPayable[] = [
    { vendorName: 'Hertz Rental', pending: 1890.0 },
    { vendorName: 'SafeDrive Co', pending: 0.0 },
  ]

  const totalPayables = vendorPayables.reduce((sum, v) => sum + v.pending, 0)

  // Mock salary due
  const salaryDue = 5000.0

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
        <h1 className="text-3xl font-bold text-slate-900">Car Rental System</h1>
        <p className="text-slate-500">Managed locally</p>
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
            <CardTitle className="text-lg">Receivable by Customer</CardTitle>
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
            <CardTitle className="text-lg">Payable by Vendor</CardTitle>
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
                {vendorPayables.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-slate-900 font-medium">{item.vendorName}</TableCell>
                    <TableCell className="text-right">{item.pending.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
