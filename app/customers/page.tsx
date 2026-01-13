'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { getAllCustomers, saveCustomer, deleteCustomer, generateId } from '@/lib/storage'
import type { Customer } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAddress, setNewAddress] = useState('')

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const allCustomers = await getAllCustomers()
        setCustomers(allCustomers)
      } catch (error) {
        console.error('Error loading customers:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCustomers()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading customers...</div>
      </div>
    )
  }

  const renderCell = (field: keyof Customer, value: string | undefined) => (
    <TableCell className="text-slate-600 truncate max-w-[200px]">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <span className="block truncate" title={value || 'N/A'}>
              {value || 'N/A'}
            </span>
          </TooltipTrigger>
          <TooltipContent>{value || 'N/A'}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TableCell>
  )

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id)
    setNewName(customer.name)
    setNewCompany(customer.company || '')
    setNewEmail(customer.email || '')
    setNewPhone(customer.phone || '')
    setNewAddress(customer.address || '')
    setShowAdd(true)
  }

  const handleSave = async () => {
    const isUpdate = editingId !== null
    const customer = {
      id: editingId || generateId(),
      name: newName.trim(),
      company: newCompany.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
      address: newAddress.trim(),
      createdAt: new Date().toISOString(),
    }
    try {
      // Pass isUpdate flag to avoid unnecessary existence check for new customers
      await saveCustomer(customer, isUpdate)
      const updated = await getAllCustomers()
      setCustomers(updated)
      // reset
      setNewName('')
      setNewCompany('')
      setNewEmail('')
      setNewPhone('')
      setNewAddress('')
      setEditingId(null)
      setShowAdd(false)
    } catch (err) {
      console.error('Failed to save customer', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteCustomer(id)
        const updated = await getAllCustomers()
        setCustomers(updated)
      } catch (err) {
        console.error('Failed to delete customer', err)
      }
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500">Manage your customers</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-md" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      {renderCell('name', customer.name)}
                      {renderCell('company', customer.company)}
                      {renderCell('email', customer.email)}
                      {renderCell('phone', customer.phone)}
                      {renderCell('address', customer.address)}
                      <TableCell className="text-center gap-2 flex justify-center">
                        <button onClick={() => handleEdit(customer)} className="text-primary hover:text-primary/90">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(customer.id)} className="text-destructive hover:text-destructive/90">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      No customers yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Add/Edit Customer Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowAdd(false); setEditingId(null) }} />
          <div className="bg-white rounded p-6 z-10 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit' : 'Add'} Customer</h3>
            <div className="space-y-2">
              <input className="w-full border px-2 py-1" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input className="w-full border px-2 py-1" placeholder="Company" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
              <input className="w-full border px-2 py-1" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <input className="w-full border px-2 py-1" placeholder="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              <textarea className="w-full border px-2 py-1" placeholder="Address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => { setShowAdd(false); setEditingId(null); setNewName(''); setNewCompany(''); setNewEmail(''); setNewPhone(''); setNewAddress('') }}>Cancel</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
