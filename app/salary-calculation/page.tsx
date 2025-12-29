'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ArrowLeft, ArrowRight, CheckCircle2, X } from 'lucide-react'
import { getAllEmployees, savePayslip, generateId, getPayslipsByMonth, deletePayslip } from '@/lib/storage'
import type { Employee, SalaryCalculation, Payslip } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface WorkflowState {
  currentStep: number
  selectedMonth: string
  selectedYear: number
  calculateForAll: boolean | null
  selectedEmployees: string[]
  overtimeEmployees: string[]
  overtimeData: Record<string, { hours: number; rate: number; pay: number }>
  deductions: Record<string, number>
  standardHours: number
}

const TOTAL_STEPS = 5

export default function SalaryCalculationPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)
  const [standardHoursInput, setStandardHoursInput] = useState<string>('160') // Local string state for input
  const [state, setState] = useState<WorkflowState>({
    currentStep: 1,
    selectedMonth: '',
    selectedYear: new Date().getFullYear(),
    calculateForAll: null,
    selectedEmployees: [],
    overtimeEmployees: [],
    overtimeData: {},
    deductions: {},
    standardHours: 160, // Default: 8 hours/day × 20 days = 160 hours/month
  })

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const allEmployees = await getAllEmployees()
        setEmployees(allEmployees)
      } catch (error) {
        console.error('Error loading employees:', error)
      } finally {
        setLoading(false)
      }
    }
    loadEmployees()
  }, [])

  // Initialize month to current month
  useEffect(() => {
    if (!state.selectedMonth) {
      const now = new Date()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      setState(prev => ({ ...prev, selectedMonth: `${now.getFullYear()}-${month}` }))
    }
  }, [state.selectedMonth])


  const formatMonth = (month: string): string => {
    if (!month) return 'N/A'
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const formatRemarks = (overtimePay: number | undefined, deductions: number): string => {
    const parts: string[] = []
    if (overtimePay && overtimePay > 0) {
      parts.push(`Overtime Pay = ${overtimePay.toFixed(2)} AED`)
    }
    if (deductions > 0) {
      parts.push(`Deductions = ${deductions.toFixed(2)} AED`)
    }
    return parts.join(', ')
  }

  const calculateSalaries = (): SalaryCalculation[] => {
    return state.selectedEmployees.map(empId => {
      const employee = employees.find(e => e.id === empId)
      if (!employee) throw new Error(`Employee ${empId} not found`)

      let basePay = 0
      if (employee.paymentType === 'hourly') {
        basePay = (employee.hourlyRate || 0) * state.standardHours
      } else if (employee.paymentType === 'monthly') {
        basePay = employee.salary || 0
      }

      const overtimeInfo = state.overtimeData[empId]
      const overtimePay = overtimeInfo?.pay || 0
      const deductions = state.deductions[empId] || 0
      const netPay = basePay + overtimePay - deductions

      return {
        employeeId: empId,
        employee,
        basePay,
        overtimeHours: overtimeInfo?.hours,
        overtimeRate: overtimeInfo?.rate,
        overtimePay: overtimePay > 0 ? overtimePay : undefined,
        deductions,
        netPay,
      }
    })
  }

  const handleNext = async () => {
    if (state.currentStep < TOTAL_STEPS) {
      // Check for existing payslips on step 1
      if (state.currentStep === 1) {
        if (!state.selectedMonth || !state.selectedMonth.match(/^\d{4}-\d{2}$/)) {
          alert('Please select a valid month (YYYY-MM format)')
          return
        }

        try {
          const existingPayslips = await getPayslipsByMonth(state.selectedMonth)
          if (existingPayslips && existingPayslips.length > 0) {
            const monthDisplay = formatMonth(state.selectedMonth)
            const shouldOverwrite = confirm(
              `Payslips already generated for the month "${monthDisplay}". Do you want to overwrite?`
            )
            
            if (!shouldOverwrite) {
              // Navigate to payslips page
              router.push('/payslips')
              return
            }
            // If user confirms, proceed with the workflow (existing payslips will be overwritten when saved)
          }
        } catch (error) {
          console.error('Error checking existing payslips:', error)
          // Continue with workflow even if check fails
        }
      }

      let nextStep = state.currentStep + 1
      
      // Auto-select all employees when entering step 2 (employee selection)
      if (state.currentStep === 1 && nextStep === 2) {
        if (state.selectedEmployees.length === 0 && employees.length > 0) {
          setState(prev => ({ 
            ...prev, 
            currentStep: nextStep,
            selectedEmployees: employees.map(e => e.id)
          }))
          return
        }
      }
      
      // No skip logic needed - step 3 now combines selection and entry
      
      setState(prev => ({ ...prev, currentStep: nextStep }))
    }
  }

  const handleBack = () => {
    if (state.currentStep > 1) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }))
    }
  }

  const handleEmployeeToggle = (empId: string) => {
    setState(prev => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.includes(empId)
        ? prev.selectedEmployees.filter(id => id !== empId)
        : [...prev.selectedEmployees, empId],
    }))
  }

  const handleSelectAllEmployees = () => {
    const allSelected = employees.length > 0 && state.selectedEmployees.length === employees.length
    setState(prev => ({
      ...prev,
      selectedEmployees: allSelected ? [] : employees.map(e => e.id),
    }))
  }

  const handleOvertimeToggle = (empId: string) => {
    setState(prev => {
      const isCurrentlySelected = prev.overtimeEmployees.includes(empId)
      if (isCurrentlySelected) {
        // Unchecking: Remove from overtimeEmployees and clear data
        const { [empId]: removed, ...restData } = prev.overtimeData
        return {
          ...prev,
          overtimeEmployees: prev.overtimeEmployees.filter(id => id !== empId),
          overtimeData: restData,
        }
      } else {
        // Checking: Add to overtimeEmployees and initialize data
        return {
          ...prev,
          overtimeEmployees: [...prev.overtimeEmployees, empId],
          overtimeData: {
            ...prev.overtimeData,
            [empId]: { hours: 0, rate: 0, pay: 0 },
          },
        }
      }
    })
  }

  const handleSelectAllOvertimeEmployees = () => {
    const availableEmployees = employees.filter(emp => state.selectedEmployees.includes(emp.id))
    const allSelected = availableEmployees.length > 0 && 
      state.overtimeEmployees.length === availableEmployees.length
    setState(prev => {
      if (allSelected) {
        // Deselect all: Clear overtime data for all employees
        const clearedData: Record<string, { hours: number; rate: number; pay: number }> = {}
        return {
          ...prev,
          overtimeEmployees: [],
          overtimeData: clearedData,
        }
      } else {
        // Select all: Initialize overtime data for all available employees
        const newData: Record<string, { hours: number; rate: number; pay: number }> = {}
        availableEmployees.forEach(emp => {
          newData[emp.id] = prev.overtimeData[emp.id] || { hours: 0, rate: 0, pay: 0 }
        })
        return {
          ...prev,
          overtimeEmployees: availableEmployees.map(e => e.id),
          overtimeData: { ...prev.overtimeData, ...newData },
        }
      }
    })
  }

  const handleOvertimeChange = (empId: string, field: 'hours' | 'rate', value: number) => {
    setState(prev => {
      const current = prev.overtimeData[empId] || { hours: 0, rate: 0, pay: 0 }
      const updated = { ...current, [field]: value }
      updated.pay = updated.hours * updated.rate
      return {
        ...prev,
        overtimeData: { ...prev.overtimeData, [empId]: updated },
      }
    })
  }

  const handleDeductionChange = (empId: string, value: number) => {
    setState(prev => ({
      ...prev,
      deductions: { ...prev.deductions, [empId]: value || 0 },
    }))
  }

  const handleSavePayslips = async () => {
    if (saving) return // Prevent double submission
    
    // Validate data before saving
    if (!state.selectedMonth || !state.selectedMonth.match(/^\d{4}-\d{2}$/)) {
      alert('Please select a valid month (YYYY-MM format)')
      return
    }

    if (state.selectedEmployees.length === 0) {
      alert('Please select at least one employee')
      return
    }

    setSaving(true)
    try {
      // Delete existing payslips for this month before saving new ones (overwrite)
      const existingPayslips = await getPayslipsByMonth(state.selectedMonth)
      if (existingPayslips && existingPayslips.length > 0) {
        // Delete all existing payslips for this month
        await Promise.all(existingPayslips.map(p => deletePayslip(p.id)))
      }

      const calculations = calculateSalaries()
      const [year, month] = state.selectedMonth.split('-')

      // Validate calculations
      for (const calc of calculations) {
        if (!calc.employeeId) {
          throw new Error(`Invalid employee ID for calculation`)
        }
        if (isNaN(calc.basePay) || isNaN(calc.netPay)) {
          throw new Error(`Invalid calculation values for employee ${calc.employee.name}`)
        }
        if (calc.netPay < 0) {
          console.warn(`Warning: Negative net pay for employee ${calc.employee.name}`)
        }
      }

      // Save all payslips
      const savePromises = calculations.map(async (calc) => {
        const payslip: Payslip = {
          id: generateId(),
          employeeId: calc.employeeId,
          month: state.selectedMonth,
          year: parseInt(year),
          baseSalary: calc.basePay,
          overtimeHours: calc.overtimeHours,
          overtimeRate: calc.overtimeRate,
          overtimePay: calc.overtimePay,
          deductions: calc.deductions,
          netPay: calc.netPay,
          status: 'processed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        return savePayslip(payslip)
      })

      await Promise.all(savePromises)
      
      setSavedSuccessfully(true)
      setState(prev => ({ ...prev, currentStep: 5 }))
    } catch (error: any) {
      console.error('Failed to save payslips:', error)
      const errorMessage = error?.message || 'Failed to save payslips. Please try again.'
      alert(`Error: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  const canProceed = (): boolean => {
    switch (state.currentStep) {
      case 1:
        return !!state.selectedMonth
      case 2:
        return state.selectedEmployees.length > 0 // Require at least one employee
      case 3:
        // Validate that all checked employees have valid overtime data
        if (state.overtimeEmployees.length === 0) return true // No overtime is valid
        return state.overtimeEmployees.every(
          empId => state.overtimeData[empId]?.hours > 0 && state.overtimeData[empId]?.rate > 0
        )
      case 4:
        return true // Deductions are optional
      case 5:
        return true // Review step
      default:
        return false
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading employees...</div>
      </div>
    )
  }

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="month" className="text-xl font-semibold">Select Month for Salary Calculation</Label>
              <Input
                id="month"
                type="month"
                value={state.selectedMonth}
                onChange={(e) => setState(prev => ({ ...prev, selectedMonth: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="standardHours" className="text-xl font-semibold">Standard Hours per Month (for hourly employees)</Label>
              <Input
                id="standardHours"
                type="text"
                inputMode="numeric"
                value={standardHoursInput}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  // Only allow numeric characters and empty string
                  if (rawValue === '' || /^\d+$/.test(rawValue)) {
                    setStandardHoursInput(rawValue);
                    // Only update numeric state if value is valid
                    const parsed = parseFloat(rawValue);
                    if (!Number.isNaN(parsed) && rawValue !== '') {
                      setState(prev => ({ ...prev, standardHours: parsed }));
                    }
                  }
                }}
                onBlur={(e) => {
                  const rawValue = e.target.value;
                  // Apply default if empty on blur
                  if (rawValue === '' || Number.isNaN(parseFloat(rawValue)) || parseFloat(rawValue) < 1) {
                    setStandardHoursInput('160');
                    setState(prev => ({ ...prev, standardHours: 160 }));
                  } else {
                    // Ensure input and state are in sync
                    const parsed = parseFloat(rawValue);
                    if (!Number.isNaN(parsed)) {
                      setStandardHoursInput(String(parsed));
                      setState(prev => ({ ...prev, standardHours: parsed }));
                    }
                  }
                }}
                className="mt-2"
              />
              <p className="text-sm text-slate-500 mt-1">Default: 160 hours (8 hours/day × 20 days)</p>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-xl font-semibold">Select Employees</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllEmployees}
                className="text-sm"
              >
                {state.selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            {state.selectedEmployees.length === 0 && (
              <p className="text-sm text-red-600">Please select at least one employee to proceed.</p>
            )}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead>Pay Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <Checkbox
                          checked={state.selectedEmployees.includes(emp.id)}
                          onCheckedChange={() => handleEmployeeToggle(emp.id)}
                        />
                      </TableCell>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell>{emp.employeeId}</TableCell>
                      <TableCell>
                        {emp.paymentType === 'hourly' ? 'Hourly' : emp.paymentType === 'monthly' ? 'Monthly' : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {emp.paymentType === 'hourly'
                          ? `${emp.hourlyRate || 0} AED/hr`
                          : emp.paymentType === 'monthly'
                          ? `${emp.salary || 0} AED/month`
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-slate-500">
              Selected: {state.selectedEmployees.length} of {employees.length} employee(s)
            </p>
          </div>
        )

      case 3:
        const availableEmployees = employees.filter(emp => state.selectedEmployees.includes(emp.id))
        const allOvertimeSelected = availableEmployees.length > 0 && 
          state.overtimeEmployees.length === availableEmployees.length
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-xl font-semibold">Select Employees Who Worked Overtime & Enter Details</Label>
              {availableEmployees.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllOvertimeEmployees}
                  className="text-sm"
                >
                  {allOvertimeSelected ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
            <p className="text-sm text-slate-500">
              Select employees from the {state.selectedEmployees.length} selected employee(s) who worked overtime and enter their overtime hours and rate.
            </p>
            {state.overtimeEmployees.length > 0 && state.overtimeEmployees.some(empId => {
              const data = state.overtimeData[empId]
              return !data || data.hours <= 0 || data.rate <= 0
            }) && (
              <p className="text-sm text-red-600">
                Please enter valid overtime hours and rate for all selected employees.
              </p>
            )}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Overtime Hours</TableHead>
                    <TableHead>Overtime Rate (AED/hr)</TableHead>
                    <TableHead>Overtime Pay (AED)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableEmployees.length > 0 ? (
                    availableEmployees.map((emp) => {
                      const isSelected = state.overtimeEmployees.includes(emp.id)
                      const overtime = state.overtimeData[emp.id] || { hours: 0, rate: 0, pay: 0 }
                      return (
                        <TableRow key={emp.id}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleOvertimeToggle(emp.id)}
                            />
                          </TableCell>
                          <TableCell>{emp.name}</TableCell>
                          <TableCell>{emp.employeeId}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              value={isSelected ? (overtime.hours || '') : ''}
                              onChange={(e) => handleOvertimeChange(emp.id, 'hours', parseFloat(e.target.value) || 0)}
                              className="w-24"
                              disabled={!isSelected}
                              placeholder={isSelected ? '0' : ''}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={isSelected ? (overtime.rate || '') : ''}
                              onChange={(e) => handleOvertimeChange(emp.id, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-32"
                              disabled={!isSelected}
                              placeholder={isSelected ? '0.00' : ''}
                            />
                          </TableCell>
                          <TableCell className="font-semibold">
                            {isSelected ? overtime.pay.toFixed(2) : '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-4">
                        No employees selected. Please go back and select employees first.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-slate-500">
              Selected: {state.overtimeEmployees.length} of {availableEmployees.length} employee(s) for overtime
            </p>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <Label className="text-xl font-semibold">Enter Deductions</Label>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Deductions (AED)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees
                    .filter(emp => state.selectedEmployees.includes(emp.id))
                    .map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell>{emp.name}</TableCell>
                        <TableCell>{emp.employeeId}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={state.deductions[emp.id] || ''}
                            onChange={(e) => handleDeductionChange(emp.id, parseFloat(e.target.value) || 0)}
                            className="w-32"
                            placeholder="0.00"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )

      case 5:
        const calculations = calculateSalaries()
        if (savedSuccessfully) {
          return (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-semibold">Payslips Generated Successfully!</h3>
              <p className="text-slate-600">
                {calculations.length} payslip(s) have been saved to the database.
              </p>
              <div className="flex gap-4 justify-center mt-6">
                <Button onClick={() => router.push('/payslips')} className="bg-blue-600 hover:bg-blue-700">
                  View Payslips
                </Button>
                <Button 
                  onClick={() => {
                    setStandardHoursInput('160')
                    setState({
                      currentStep: 1,
                      selectedMonth: '',
                      selectedYear: new Date().getFullYear(),
                      calculateForAll: null,
                      selectedEmployees: [],
                      overtimeEmployees: [],
                      overtimeData: {},
                      deductions: {},
                      standardHours: 160,
                    })
                    setSavedSuccessfully(false)
                  }} 
                  variant="outline"
                >
                  Calculate Again
                </Button>
              </div>
            </div>
          )
        }
        return (
          <div className="space-y-4">
            <Label className="text-xl font-semibold">Review & Calculate Salaries</Label>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead className="text-right">Base Pay</TableHead>
                    <TableHead className="text-right">Overtime Hours</TableHead>
                    <TableHead className="text-right">Overtime Pay</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right font-semibold">Net Pay</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculations.map((calc) => (
                    <TableRow key={calc.employeeId}>
                      <TableCell>{calc.employee.name}</TableCell>
                      <TableCell>{calc.employee.employeeId}</TableCell>
                      <TableCell>
                        {calc.employee.paymentType === 'hourly' ? 'Hourly' : calc.employee.paymentType === 'monthly' ? 'Monthly' : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">{calc.basePay.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{calc.overtimeHours?.toFixed(2) || '-'}</TableCell>
                      <TableCell className="text-right">{calc.overtimePay?.toFixed(2) || '-'}</TableCell>
                      <TableCell className="text-right">{calc.deductions.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">{calc.netPay.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {formatRemarks(calc.overtimePay, calc.deductions)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Total Employees:</strong> {calculations.length} |{' '}
                <strong>Total Net Pay:</strong> {calculations.reduce((sum, c) => sum + c.netPay, 0).toFixed(2)} AED
              </p>
            </div>
          </div>
        )


      default:
        return null
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Salary Calculation</h1>
        <p className="text-slate-500">Monthly salary computation workflow</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Step {state.currentStep} of {TOTAL_STEPS}</CardTitle>
            <div className="flex gap-2">
              {state.currentStep === 1 ? (
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/payslips')}
                  className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              ) : (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              {state.currentStep < TOTAL_STEPS && state.currentStep !== 5 && (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {state.currentStep === 5 && !savedSuccessfully && (
                <Button
                  onClick={handleSavePayslips}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Calculate & Save
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="min-h-[400px]">{renderStepContent()}</div>
        </CardContent>
      </Card>
    </div>
  )
}

