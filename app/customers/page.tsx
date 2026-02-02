'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/use-customers'
import type { Customer } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

export default function CustomersPage() {
  const { data: customers = [], isLoading: loading, error } = useCustomers()
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deleteMutation = useDeleteCustomer()
  
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAddress, setNewAddress] = useState('')

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading customers...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-500">Error loading customers: {error.message}</div>
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
    // Validate name field
    if (!newName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Customer name is required',
        variant: 'destructive',
      })
      return
    }

    const isUpdate = editingId !== null
    try {
      let result
      if (isUpdate && editingId) {
        result = await updateMutation.mutateAsync({
          id: editingId,
          data: {
            name: newName.trim(),
            company: newCompany.trim() || null,
            email: newEmail.trim() || null,
            phone: newPhone.trim() || null,
            address: newAddress.trim() || null,
          },
        })
      } else {
        result = await createMutation.mutateAsync({
          id: crypto.randomUUID(),
          name: newName.trim(),
          company: newCompany.trim() || null,
          email: newEmail.trim() || null,
          phone: newPhone.trim() || null,
          address: newAddress.trim() || null,
        })
      }

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save customer',
          variant: 'destructive',
        })
        return
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { entity: 'customers' } }))
      }

      // Reset form
      setNewName('')
      setNewCompany('')
      setNewEmail('')
      setNewPhone('')
      setNewAddress('')
      setEditingId(null)
      setShowAdd(false)
    } catch (err) {
      console.error('Failed to save customer', err)
      toast({
        title: 'Error',
        description: 'Failed to save customer',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        const result = await deleteMutation.mutateAsync(id)
        if (!result.success) {
          toast({
            title: 'Error',
            description: result.error || 'Failed to delete customer',
            variant: 'destructive',
          })
          return
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { entity: 'customers' } }))
        }
      } catch (err) {
        console.error('Failed to delete customer', err)
        toast({
          title: 'Error',
          description: 'Failed to delete customer',
          variant: 'destructive',
        })
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
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer-name" className="text-slate-700 text-sm mb-1 block">Name</Label>
                <input 
                  id="customer-name"
                  className="w-full border px-2 py-1" 
                  placeholder="Name" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="customer-company" className="text-slate-700 text-sm mb-1 block">Company</Label>
                <input 
                  id="customer-company"
                  className="w-full border px-2 py-1" 
                  placeholder="Company" 
                  value={newCompany} 
                  onChange={(e) => setNewCompany(e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="customer-email" className="text-slate-700 text-sm mb-1 block">Email</Label>
                <input 
                  id="customer-email"
                  className="w-full border px-2 py-1" 
                  placeholder="Email" 
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="customer-phone" className="text-slate-700 text-sm mb-1 block">Phone</Label>
                <input 
                  id="customer-phone"
                  className="w-full border px-2 py-1" 
                  placeholder="Phone" 
                  value={newPhone} 
                  onChange={(e) => setNewPhone(e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="customer-address" className="text-slate-700 text-sm mb-1 block">Address</Label>
                <textarea 
                  id="customer-address"
                  className="w-full border px-2 py-1" 
                  placeholder="Address" 
                  value={newAddress} 
                  onChange={(e) => setNewAddress(e.target.value)} 
                />
              </div>
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
