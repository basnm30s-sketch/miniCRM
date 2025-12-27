'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Trash2, ArrowLeft, Download, Plus } from 'lucide-react'
import { getAllPayslips, getAllEmployees, deletePayslip, updatePayslipStatus } from '@/lib/storage'
import type { Payslip, Employee } from '@/lib/types'
import { useRouter } from 'next/navigation'
import ExcelJS from 'exceljs'

interface MonthSummary {
  month: string
  count: number
  totalNetPay: number
  totalOvertimePay: number
  totalDeductions: number
}

export default function PayslipsPage() {
  const router = useRouter()
  const [allPayslips, setAllPayslips] = useState<Payslip[]>([])
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'months' | 'employees'>('months')
  const [selectedMonthForView, setSelectedMonthForView] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [payslipsData, employeesData] = await Promise.all([
          getAllPayslips().catch(err => {
            console.error('Error loading payslips:', err)
            return [] // Return empty array on error
          }),
          getAllEmployees().catch(err => {
            console.error('Error loading employees:', err)
            return [] // Return empty array on error
          }),
        ])
        setAllPayslips(payslipsData || [])
        setEmployees(employeesData || [])
      } catch (error) {
        console.error('Error loading data:', error)
        setAllPayslips([])
        setEmployees([])
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Filter payslips based on selected month for employee view
  useEffect(() => {
    if (selectedMonthForView) {
      const filtered = allPayslips.filter(p => p.month === selectedMonthForView)
      setPayslips(filtered)
    } else {
      setPayslips([])
    }
  }, [selectedMonthForView, allPayslips])

  const getEmployeeName = (employeeId: string): string => {
    const employee = employees.find(e => e.id === employeeId)
    return employee?.name || 'Unknown'
  }

  const formatMonth = (month: string): string => {
    if (!month) return 'N/A'
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const formatMonthShort = (month: string): string => {
    if (!month) return 'N/A'
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    const monthName = date.toLocaleDateString('en-US', { month: 'short' })
    return `${monthName}-${year}`
  }

  // Get month summary for a specific month
  const getMonthSummary = (month: string): MonthSummary => {
    const monthPayslips = allPayslips.filter(p => p.month === month)
    return {
      month,
      count: monthPayslips.length,
      totalNetPay: monthPayslips.reduce((sum, p) => sum + (p.netPay || 0), 0),
      totalOvertimePay: monthPayslips.reduce((sum, p) => sum + (p.overtimePay || 0), 0),
      totalDeductions: monthPayslips.reduce((sum, p) => sum + (p.deductions || 0), 0),
    }
  }

  // Get all month summaries
  const getAllMonthSummaries = (): MonthSummary[] => {
    const months = new Set<string>()
    allPayslips.forEach(p => {
      if (p.month) months.add(p.month)
    })
    return Array.from(months)
      .sort()
      .reverse() // Most recent first
      .map(month => getMonthSummary(month))
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this payslip?')) {
      try {
        await deletePayslip(id)
        const updated = await getAllPayslips()
        setAllPayslips(updated)
        
        // If in employee view, check if there are any payslips left for the month
        if (viewMode === 'employees' && selectedMonthForView) {
          const remainingPayslips = updated.filter(p => p.month === selectedMonthForView)
          if (remainingPayslips.length === 0) {
            // No payslips left for this month, return to month view
            setViewMode('months')
            setSelectedMonthForView(null)
          }
        }
      } catch (err) {
        console.error('Failed to delete payslip', err)
        alert('Failed to delete payslip')
      }
    }
  }

  const handleMonthClick = (month: string) => {
    setSelectedMonthForView(month)
    setViewMode('employees')
  }

  const handleBackToMonths = () => {
    setViewMode('months')
    setSelectedMonthForView(null)
  }

  const handleTogglePaymentStatus = async (payslipId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'paid' ? 'processed' : 'paid'
      await updatePayslipStatus(payslipId, newStatus)
      
      // Refresh data
      const updated = await getAllPayslips()
      setAllPayslips(updated)
      
      // Show success message
      alert(`Payslip marked as ${newStatus}`)
    } catch (err) {
      console.error('Failed to update payslip status', err)
      alert('Failed to update payslip status. Please try again.')
    }
  }

  const handleMarkAllAsPaid = async () => {
    if (!selectedMonthForView) return
    
    const processedPayslips = payslips.filter(p => p.status === 'processed')
    if (processedPayslips.length === 0) {
      alert('All payslips are already paid')
      return
    }
    
    const confirmed = confirm(`Mark all ${processedPayslips.length} payslip(s) as paid?`)
    if (!confirmed) return
    
    try {
      // Update all processed payslips to paid
      await Promise.all(
        processedPayslips.map(p => updatePayslipStatus(p.id, 'paid'))
      )
      
      // Refresh data
      const updated = await getAllPayslips()
      setAllPayslips(updated)
      
      // Show success message
      alert(`All ${processedPayslips.length} payslip(s) marked as paid`)
    } catch (err) {
      console.error('Failed to mark all as paid', err)
      alert('Failed to mark all payslips as paid. Please try again.')
    }
  }

  // Calculate month summary statistics for the current view
  const getMonthSummaryStats = () => {
    if (payslips.length === 0) {
      return {
        totalEmployees: 0,
        totalNetPay: 0,
        totalOvertimePay: 0,
        totalDeductions: 0,
        averageNetPay: 0,
        employeesWithOvertime: 0,
        employeesWithDeductions: 0,
      }
    }

    const totalNetPay = payslips.reduce((sum, p) => sum + (p.netPay || 0), 0)
    const totalOvertimePay = payslips.reduce((sum, p) => sum + (p.overtimePay || 0), 0)
    const totalDeductions = payslips.reduce((sum, p) => sum + (p.deductions || 0), 0)
    const employeesWithOvertime = payslips.filter(p => p.overtimePay && p.overtimePay > 0).length
    const employeesWithDeductions = payslips.filter(p => p.deductions && p.deductions > 0).length

    return {
      totalEmployees: payslips.length,
      totalNetPay,
      totalOvertimePay,
      totalDeductions,
      averageNetPay: totalNetPay / payslips.length,
      employeesWithOvertime,
      employeesWithDeductions,
    }
  }

  const createPayslipSheet = (workbook: ExcelJS.Workbook, monthPayslips: Payslip[], sheetName: string) => {
    const worksheet = workbook.addWorksheet(sheetName)

    // Define columns with appropriate widths
    worksheet.columns = [
      { header: 'Employee', key: 'employee', width: 20 },
      { header: 'Base Salary (AED)', key: 'baseSalary', width: 18 },
      { header: 'Overtime Hours', key: 'overtimeHours', width: 15 },
      { header: 'Hourly Overtime Pay (AED)', key: 'overtimeRate', width: 22 },
      { header: 'Overtime Pay (AED)', key: 'overtimePay', width: 18 },
      { header: 'Deductions (AED)', key: 'deductions', width: 18 },
      { header: 'Net Pay (AED)', key: 'netPay', width: 18 },
      { header: 'Status', key: 'status', width: 12 },
    ]

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

    // Add data rows
    monthPayslips.forEach((payslip, index) => {
      const rowNumber = index + 2 // +2 because row 1 is header, data starts at row 2
      
      // Use numeric values for calculations (0 instead of '-' for empty values)
      const baseSalaryValue = payslip.baseSalary
      const overtimeHoursValue = payslip.overtimeHours || 0
      const overtimeRateValue = payslip.overtimeRate || 0
      const deductionsValue = payslip.deductions
      
      // Add row with data
      const row = worksheet.addRow({
        employee: getEmployeeName(payslip.employeeId),
        baseSalary: baseSalaryValue,
        overtimeHours: overtimeHoursValue,
        overtimeRate: overtimeRateValue,
        overtimePay: 0, // Placeholder, will be replaced with formula
        deductions: deductionsValue,
        netPay: 0, // Placeholder, will be replaced with formula
        status: payslip.status || 'draft',
      })
      
      // Set Overtime Pay column with formula: Overtime Hours × Hourly Overtime Pay
      // Column C = Overtime Hours, Column D = Hourly Overtime Pay, Column E = Overtime Pay
      const overtimePayCell = row.getCell(5) // Column E (Overtime Pay)
      overtimePayCell.value = {
        formula: `C${rowNumber}*D${rowNumber}`,
      }
      overtimePayCell.numFmt = '#,##0.00' // Format as number with 2 decimals
      
      // Set Net Pay column with formula: Base Salary + Overtime Pay - Deductions
      // Column B = Base Salary, Column E = Overtime Pay, Column F = Deductions, Column G = Net Pay
      const netPayCell = row.getCell(7) // Column G (Net Pay)
      netPayCell.value = {
        formula: `B${rowNumber}+E${rowNumber}-F${rowNumber}`,
      }
      netPayCell.numFmt = '#,##0.00' // Format as number with 2 decimals
    })

    // Style data rows - align numbers to right
    worksheet.getColumn('baseSalary').alignment = { horizontal: 'right' }
    worksheet.getColumn('baseSalary').numFmt = '#,##0.00' // Format as number with 2 decimals
    worksheet.getColumn('overtimeHours').alignment = { horizontal: 'right' }
    worksheet.getColumn('overtimeHours').numFmt = '#,##0.00' // Format as number with 2 decimals
    worksheet.getColumn('overtimeRate').alignment = { horizontal: 'right' }
    worksheet.getColumn('overtimeRate').numFmt = '#,##0.00' // Format as number with 2 decimals
    worksheet.getColumn('overtimePay').alignment = { horizontal: 'right' }
    worksheet.getColumn('overtimePay').numFmt = '#,##0.00' // Format as number with 2 decimals
    worksheet.getColumn('deductions').alignment = { horizontal: 'right' }
    worksheet.getColumn('deductions').numFmt = '#,##0.00' // Format as number with 2 decimals
    worksheet.getColumn('netPay').alignment = { horizontal: 'right' }
    worksheet.getColumn('netPay').font = { bold: true }
  }

  const handleExportToExcel = async () => {
    if (payslips.length === 0) {
      alert('No payslips to export')
      return
    }

    try {
      const workbook = new ExcelJS.Workbook()
      const sheetName = selectedMonthForView ? formatMonthShort(selectedMonthForView) : 'all'
      createPayslipSheet(workbook, payslips, sheetName)

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      // Download file
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `payslips-${sheetName}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export to Excel. Please try again.')
    }
  }

  const handleExportAllMonthsToExcel = async () => {
    if (monthSummaries.length === 0) {
      alert('No payslips to export')
      return
    }

    try {
      const workbook = new ExcelJS.Workbook()

      // Create a sheet for each month
      for (const summary of monthSummaries) {
        const monthPayslips = allPayslips.filter(p => p.month === summary.month)
        if (monthPayslips.length > 0) {
          const sheetName = formatMonthShort(summary.month)
          createPayslipSheet(workbook, monthPayslips, sheetName)
        }
      }

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      // Download file
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      link.download = `payslips-all-months-${dateStr}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export to Excel. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading payslips...</div>
      </div>
    )
  }

  const monthSummaries = getAllMonthSummaries()

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payslips</h1>
          <p className="text-slate-500">Manage employee payslips</p>
        </div>
        {viewMode === 'months' && (
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => router.push('/salary-calculation')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Payslips
          </Button>
        )}
      </div>

      {viewMode === 'months' ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Months ({monthSummaries.length})</CardTitle>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleExportAllMonthsToExcel}
                disabled={monthSummaries.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Count of Payslips</TableHead>
                    <TableHead className="text-right">Net Pay (AED)</TableHead>
                    <TableHead className="text-right">Net Overtime (AED)</TableHead>
                    <TableHead className="text-right">Net Deductions (AED)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthSummaries.length > 0 ? (
                    monthSummaries.map((summary) => (
                      <TableRow
                        key={summary.month}
                        onClick={() => handleMonthClick(summary.month)}
                        className="cursor-pointer hover:bg-slate-50"
                      >
                        <TableCell className="text-slate-900 font-medium">
                          {formatMonthShort(summary.month)}
                        </TableCell>
                        <TableCell className="text-right text-slate-600">{summary.count}</TableCell>
                        <TableCell className="text-right text-slate-600 font-semibold">
                          {summary.totalNetPay.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-slate-600">
                          {summary.totalOvertimePay.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-slate-600">
                          {summary.totalDeductions.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                        No payslips yet. Click "Generate Payslips" to create payslips.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {(() => {
            const stats = getMonthSummaryStats()
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-6">
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-3">
                    <div className="text-xs text-green-700 mb-1.5 font-medium">Total Net Pay</div>
                    <div className="text-xl font-bold text-green-900">{stats.totalNetPay.toFixed(2)} AED</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-3">
                    <div className="text-xs text-blue-700 mb-1.5 font-medium">Total Overtime Pay</div>
                    <div className="text-xl font-bold text-blue-900">{stats.totalOvertimePay.toFixed(2)} AED</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                  <CardContent className="p-3">
                    <div className="text-xs text-red-700 mb-1.5 font-medium">Total Deductions</div>
                    <div className="text-xl font-bold text-red-900">{stats.totalDeductions.toFixed(2)} AED</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-slate-500 mb-1.5 font-medium">Total Employees</div>
                    <div className="text-xl font-bold text-slate-900">{stats.totalEmployees}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-slate-500 mb-1.5 font-medium">Employees with Overtime</div>
                    <div className="text-xl font-bold text-slate-900">{stats.employeesWithOvertime}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-slate-500 mb-1.5 font-medium">Employees with Deductions</div>
                    <div className="text-xl font-bold text-slate-900">{stats.employeesWithDeductions}</div>
                  </CardContent>
                </Card>
              </div>
            )
          })()}
          <Button
            variant="ghost"
            onClick={handleBackToMonths}
            className="mb-4 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Months
          </Button>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  Payslips for {selectedMonthForView ? formatMonth(selectedMonthForView) : 'N/A'} ({payslips.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleMarkAllAsPaid}
                    disabled={payslips.filter(p => p.status === 'processed').length === 0}
                    title={payslips.filter(p => p.status === 'processed').length === 0 ? 'All payslips are paid' : 'Mark all processed payslips as paid'}
                  >
                    Mark All as Paid
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleExportToExcel}
                    disabled={payslips.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export to Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Base Salary (AED)</TableHead>
                      <TableHead className="text-right">Overtime Hours</TableHead>
                      <TableHead className="text-right">Hourly Overtime Pay (AED)</TableHead>
                      <TableHead className="text-right">Overtime Pay (AED)</TableHead>
                      <TableHead className="text-right">Deductions (AED)</TableHead>
                      <TableHead className="text-right">Net Pay (AED)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.length > 0 ? (
                      payslips.map((payslip) => (
                        <TableRow key={payslip.id}>
                          <TableCell className="text-slate-900 font-medium">
                            {getEmployeeName(payslip.employeeId)}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {payslip.baseSalary.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {payslip.overtimeHours ? payslip.overtimeHours.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {payslip.overtimeRate ? payslip.overtimeRate.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {payslip.overtimePay ? payslip.overtimePay.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {payslip.deductions.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-900">
                            {payslip.netPay.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTogglePaymentStatus(payslip.id, payslip.status || 'processed')
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer hover:opacity-80 hover:scale-105 ${
                                payslip.status === 'processed'
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : payslip.status === 'paid'
                                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                              title={
                                payslip.status === 'paid'
                                  ? 'Click to mark as processed'
                                  : payslip.status === 'processed'
                                  ? 'Click to mark as paid'
                                  : 'Click to change status'
                              }
                            >
                              {payslip.status || 'draft'}
                            </button>
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(payslip.id)
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                          No payslips found for this month.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
