'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

const mockPayslips = [
  {
    id: 1,
    month: 'November 2025',
    employee: 'Ahmed Al Mansouri',
    baseSalary: 5000.0,
    deductions: 500.0,
    netPay: 4500.0,
    status: 'Processed',
  },
  {
    id: 2,
    month: 'November 2025',
    employee: 'Fatima Al Kaabi',
    baseSalary: 4000.0,
    deductions: 400.0,
    netPay: 3600.0,
    status: 'Processed',
  },
]

export default function PayslipsPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payslips</h1>
          <p className="text-slate-500">Manage employee payslips</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Generate Payslips
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payslips ({mockPayslips.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Base Salary (AED)</TableHead>
                  <TableHead className="text-right">Deductions (AED)</TableHead>
                  <TableHead className="text-right">Net Pay (AED)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPayslips.map((payslip) => (
                  <TableRow key={payslip.id}>
                    <TableCell className="text-slate-900 font-medium">{payslip.month}</TableCell>
                    <TableCell className="text-slate-900">{payslip.employee}</TableCell>
                    <TableCell className="text-right text-slate-600">{payslip.baseSalary.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-slate-600">{payslip.deductions.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      AED {payslip.netPay.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {payslip.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
