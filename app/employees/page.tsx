'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { getAllEmployees, saveEmployee, deleteEmployee, generateId } from '@/lib/storage'
import type { Employee } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [newRole, setNewRole] = useState('')
  const [paymentType, setPaymentType] = useState<'hourly' | 'monthly' | ''>('')
  const [newHourlyRate, setNewHourlyRate] = useState('')
  const [newSalary, setNewSalary] = useState('')
  const [newOvertimeRate, setNewOvertimeRate] = useState('')
  const [newBankDetails, setNewBankDetails] = useState('')

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const allEmployees = await getAllEmployees()
        // Filter out employees with null/undefined/empty IDs and log warnings
        const validEmployees = allEmployees.filter((emp, index) => {
          if (!emp.id || (typeof emp.id === 'string' && emp.id.trim() === '')) {
            console.warn(`Employee at index ${index} has no ID and will be skipped:`, emp)
            return false
          }
          return true
        })
        setEmployees(validEmployees)
        
        // Show warning if any employees were filtered out
        const invalidCount = allEmployees.length - validEmployees.length
        if (invalidCount > 0) {
          toast({
            title: 'Warning',
            description: `${invalidCount} employee(s) with invalid IDs were found and hidden. Please contact support to clean up the database.`,
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Error loading employees:', error)
        toast({ title: 'Error', description: 'Failed to load employees', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    loadEmployees()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading employees...</div>
      </div>
    )
  }

  const renderCell = (value: string | number | undefined) => (
    <TableCell className="text-slate-600 truncate max-w-[200px]">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <span className="block truncate" title={String(value) || 'N/A'}>
              {value || 'N/A'}
            </span>
          </TooltipTrigger>
          <TooltipContent>{value || 'N/A'}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TableCell>
  )

  const handleEdit = (emp: Employee) => {
    // Validate ID before editing
    if (!emp.id || (typeof emp.id === 'string' && emp.id.trim() === '')) {
      toast({ 
        title: 'Error', 
        description: 'Cannot edit employee: Invalid employee ID', 
        variant: 'destructive' 
      })
      return
    }
    
    setEditingId(emp.id)
    setNewName(emp.name)
    setNewEmployeeId(emp.employeeId)
    setNewRole(emp.role || '')

    // Determine payment type from existing data
    if (emp.paymentType) {
      setPaymentType(emp.paymentType)
    } else if (emp.hourlyRate && emp.salary) {
      // Both exist - default to hourly but user can change
      setPaymentType('hourly')
    } else if (emp.hourlyRate) {
      setPaymentType('hourly')
    } else if (emp.salary) {
      setPaymentType('monthly')
    } else {
      setPaymentType('')
    }

    setNewHourlyRate(String(emp.hourlyRate || ''))
    setNewSalary(String(emp.salary || ''))
    setNewOvertimeRate(String(emp.overtimeRate || ''))
    setNewBankDetails(emp.bankDetails || '')
    setShowAdd(true)
  }

  const handleSave = async () => {
    // Validate name field
    if (!newName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Employee name is required',
        variant: 'destructive',
      })
      return
    }

    // If payment type is selected, validate corresponding pay field
    if (paymentType === 'hourly') {
      if (!newHourlyRate.trim() || isNaN(parseFloat(newHourlyRate)) || parseFloat(newHourlyRate) <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Hourly Pay is required when Hourly payment type is selected',
          variant: 'destructive',
        })
        return
      }
    }

    if (paymentType === 'monthly') {
      if (!newSalary.trim() || isNaN(parseFloat(newSalary)) || parseFloat(newSalary) <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Monthly Pay is required when Monthly payment type is selected',
          variant: 'destructive',
        })
        return
      }
    }

    // Ensure ID is always generated
    const employeeId = editingId || generateId()
    if (!employeeId) {
      toast({ title: 'Error', description: 'Failed to generate employee ID', variant: 'destructive' })
      return
    }

    const emp: Employee = {
      id: employeeId,
      name: newName.trim(),
      employeeId: newEmployeeId.trim(),
      role: newRole.trim(),
      paymentType: paymentType ? (paymentType as 'hourly' | 'monthly') : undefined,
      hourlyRate: paymentType === 'hourly' ? (parseFloat(newHourlyRate) || undefined) : undefined,
      salary: paymentType === 'monthly' ? (parseFloat(newSalary) || undefined) : undefined,
      overtimeRate: newOvertimeRate ? (parseFloat(newOvertimeRate) || undefined) : undefined,
      bankDetails: newBankDetails.trim(),
      createdAt: new Date().toISOString(),
    }
    try {
      await saveEmployee(emp)
      const updated = await getAllEmployees()
      // Filter again to ensure no invalid employees
      const validUpdated = updated.filter(emp => emp.id && (typeof emp.id !== 'string' || emp.id.trim() !== ''))
      setEmployees(validUpdated)
      setNewName('')
      setNewEmployeeId('')
      setNewRole('')
      setPaymentType('')
      setNewHourlyRate('')
      setNewSalary('')
      setNewOvertimeRate('')
      setNewBankDetails('')
      setEditingId(null)
      setShowAdd(false)
      toast({ title: 'Success', description: editingId ? 'Employee updated successfully' : 'Employee created successfully' })
    } catch (err: any) {
      console.error('Failed to save employee', err)
      toast({ title: 'Error', description: err?.message || 'Failed to save employee', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string | null | undefined) => {
    // Validate ID before attempting delete
    if (!id || (typeof id === 'string' && id.trim() === '')) {
      toast({ 
        title: 'Error', 
        description: 'Cannot delete employee: Invalid employee ID', 
        variant: 'destructive' 
      })
      return
    }

    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteEmployee(id)
        const updated = await getAllEmployees()
        // Filter again to ensure no invalid employees
        const validUpdated = updated.filter(emp => emp.id && (typeof emp.id !== 'string' || emp.id.trim() !== ''))
        setEmployees(validUpdated)
        toast({ title: 'Success', description: 'Employee deleted successfully' })
      } catch (err: any) {
        console.error('Failed to delete employee', err)
        const errorMessage = err?.message || 'Failed to delete employee'
        toast({ 
          title: 'Error', 
          description: errorMessage.includes('referenced') 
            ? 'Cannot delete employee: Employee is referenced in payslips or other records'
            : 'Failed to delete employee. Please try again.',
          variant: 'destructive' 
        })
      }
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-500">Manage employee information</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Employees ({employees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Pay Rate (AED)</TableHead>
                  <TableHead>Pay Basis</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? (
                  employees
                    .filter((emp) => {
                      // Filter out any employees with invalid IDs (shouldn't happen, but safety check)
                      const hasValidId = emp.id && (typeof emp.id !== 'string' || emp.id.trim() !== '')
                      if (!hasValidId) {
                        console.warn('Employee without ID found during render:', emp)
                      }
                      return hasValidId
                    })
                    .map((emp, index) => {
                      const isValidId = emp.id && (typeof emp.id !== 'string' || emp.id.trim() !== '')
                      
                      return (
                        <TableRow key={emp.id || `emp-${index}`}>
                          {renderCell(emp.name)}
                          {renderCell(emp.employeeId)}
                          {renderCell(emp.role)}
                          {renderCell(
                            emp.paymentType === 'hourly'
                              ? emp.hourlyRate
                              : emp.paymentType === 'monthly'
                                ? emp.salary
                                : emp.hourlyRate || emp.salary || 'N/A'
                          )}
                          {renderCell(
                            emp.paymentType
                              ? emp.paymentType.toLowerCase() === 'hourly'
                                ? 'Hourly'
                                : emp.paymentType.toLowerCase() === 'monthly'
                                  ? 'Monthly'
                                  : emp.paymentType.charAt(0).toUpperCase() + emp.paymentType.slice(1).toLowerCase()
                              : 'N/A'
                          )}
                          <TableCell className="text-center gap-2 flex justify-center">
                            <button 
                              onClick={() => handleEdit(emp)} 
                              className="text-primary hover:text-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={!isValidId}
                              title={!isValidId ? 'Cannot edit: Invalid ID' : 'Edit employee'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(emp.id)} 
                              className="text-destructive hover:text-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={!isValidId}
                              title={!isValidId ? 'Cannot delete: Invalid ID' : 'Delete employee'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      No employees yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Employee Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowAdd(false); setEditingId(null) }} />
          <div className="bg-white rounded-lg shadow-xl z-10 w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10 rounded-t-lg">
              <h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'Add'} Employee</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="employee-name" className="text-slate-700 text-sm mb-1 block">Name <span className="text-red-500">*</span></Label>
                  <input 
                    id="employee-name"
                    className="w-full border px-2 py-1 rounded" 
                    placeholder="Name" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="employee-id" className="text-slate-700 text-sm mb-1 block">Employee ID</Label>
                  <input 
                    id="employee-id"
                    className="w-full border px-2 py-1 rounded" 
                    placeholder="Employee ID" 
                    value={newEmployeeId} 
                    onChange={(e) => setNewEmployeeId(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="employee-role" className="text-slate-700 text-sm mb-1 block">Role</Label>
                  <input 
                    id="employee-role"
                    className="w-full border px-2 py-1 rounded" 
                    placeholder="Role" 
                    value={newRole} 
                    onChange={(e) => setNewRole(e.target.value)} 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm mb-1 block">Payment Type</Label>
                  <RadioGroup value={paymentType} onValueChange={(value) => setPaymentType(value as 'hourly' | 'monthly')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hourly" id="hourly" />
                      <Label htmlFor="hourly" className="font-normal cursor-pointer">Hourly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="monthly" id="monthly" />
                      <Label htmlFor="monthly" className="font-normal cursor-pointer">Monthly</Label>
                    </div>
                  </RadioGroup>
                </div>

                {paymentType === 'hourly' && (
                  <div>
                    <Label htmlFor="employee-hourly-rate" className="text-slate-700 text-sm mb-1 block">Hourly Pay <span className="text-red-500">*</span></Label>
                    <input
                      id="employee-hourly-rate"
                      className="w-full border px-2 py-1 rounded"
                      placeholder="Hourly Pay"
                      type="number"
                      step="0.01"
                      value={newHourlyRate}
                      onChange={(e) => setNewHourlyRate(e.target.value)}
                    />
                  </div>
                )}

                {paymentType === 'monthly' && (
                  <div>
                    <Label htmlFor="employee-salary" className="text-slate-700 text-sm mb-1 block">Monthly Pay <span className="text-red-500">*</span></Label>
                    <input
                      id="employee-salary"
                      className="w-full border px-2 py-1 rounded"
                      placeholder="Monthly Pay"
                      type="number"
                      step="0.01"
                      value={newSalary}
                      onChange={(e) => setNewSalary(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="employee-overtime-rate" className="text-slate-700 text-sm mb-1 block">Overtime Rate (AED/hr)</Label>
                  <input
                    id="employee-overtime-rate"
                    className="w-full border px-2 py-1 rounded"
                    placeholder="Overtime Rate (AED/hr)"
                    type="number"
                    step="0.01"
                    value={newOvertimeRate}
                    onChange={(e) => setNewOvertimeRate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="employee-bank-details" className="text-slate-700 text-sm mb-1 block">Bank Details</Label>
                  <textarea 
                    id="employee-bank-details"
                    className="w-full border px-2 py-1 rounded" 
                    placeholder="Bank Details" 
                    value={newBankDetails} 
                    onChange={(e) => setNewBankDetails(e.target.value)} 
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0 bg-white z-10 rounded-b-lg">
              <button className="px-3 py-1 border rounded" onClick={() => { setShowAdd(false); setEditingId(null); setNewName(''); setNewEmployeeId(''); setNewRole(''); setPaymentType(''); setNewHourlyRate(''); setNewSalary(''); setNewOvertimeRate(''); setNewBankDetails('') }}>Cancel</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

