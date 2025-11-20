'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { getAllEmployees, saveEmployee, deleteEmployee, generateId } from '@/lib/storage'
import type { Employee } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newHourlyRate, setNewHourlyRate] = useState('')
  const [newSalary, setNewSalary] = useState('')
  const [newBankDetails, setNewBankDetails] = useState('')

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
    setEditingId(emp.id)
    setNewName(emp.name)
    setNewEmployeeId(emp.employeeId)
    setNewRole(emp.role || '')
    setNewHourlyRate(String(emp.hourlyRate || ''))
    setNewSalary(String(emp.salary || ''))
    setNewBankDetails(emp.bankDetails || '')
    setShowAdd(true)
  }

  const handleSave = async () => {
    const emp: Employee = {
      id: editingId || generateId(),
      name: newName.trim(),
      employeeId: newEmployeeId.trim(),
      role: newRole.trim(),
      hourlyRate: parseFloat(newHourlyRate) || undefined,
      salary: parseFloat(newSalary) || undefined,
      bankDetails: newBankDetails.trim(),
      createdAt: new Date().toISOString(),
    }
    try {
      await saveEmployee(emp)
      const updated = await getAllEmployees()
      setEmployees(updated)
      setNewName('')
      setNewEmployeeId('')
      setNewRole('')
      setNewHourlyRate('')
      setNewSalary('')
      setNewBankDetails('')
      setEditingId(null)
      setShowAdd(false)
    } catch (err) {
      console.error('Failed to save employee', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteEmployee(id)
        const updated = await getAllEmployees()
        setEmployees(updated)
      } catch (err) {
        console.error('Failed to delete employee', err)
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
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? (
                  employees.map((emp) => (
                    <TableRow key={emp.id}>
                      {renderCell(emp.name)}
                      {renderCell(emp.employeeId)}
                      {renderCell(emp.role)}
                      {renderCell(emp.hourlyRate)}
                      <TableCell className="text-center gap-2 flex justify-center">
                        <button onClick={() => handleEdit(emp)} className="text-blue-600 hover:text-blue-800">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(emp.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 py-8">
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
          <div className="bg-white rounded p-6 z-10 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit' : 'Add'} Employee</h3>
            <div className="space-y-2">
              <input className="w-full border px-2 py-1" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input className="w-full border px-2 py-1" placeholder="Employee ID" value={newEmployeeId} onChange={(e) => setNewEmployeeId(e.target.value)} />
              <input className="w-full border px-2 py-1" placeholder="Role" value={newRole} onChange={(e) => setNewRole(e.target.value)} />
              <input className="w-full border px-2 py-1" placeholder="Hourly Rate" type="number" step="0.01" value={newHourlyRate} onChange={(e) => setNewHourlyRate(e.target.value)} />
              <input className="w-full border px-2 py-1" placeholder="Salary" type="number" step="0.01" value={newSalary} onChange={(e) => setNewSalary(e.target.value)} />
              <textarea className="w-full border px-2 py-1" placeholder="Bank Details" value={newBankDetails} onChange={(e) => setNewBankDetails(e.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => { setShowAdd(false); setEditingId(null); setNewName(''); setNewEmployeeId(''); setNewRole(''); setNewHourlyRate(''); setNewSalary(''); setNewBankDetails('') }}>Cancel</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
