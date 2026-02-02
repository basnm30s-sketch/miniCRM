'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { getAllVendors, saveVendor, deleteVendor, generateId } from '@/lib/storage'
import type { Vendor } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newContactPerson, setNewContactPerson] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newBankDetails, setNewBankDetails] = useState('')
  const [newPaymentTerms, setNewPaymentTerms] = useState('')

  useEffect(() => {
    const loadVendors = async () => {
      try {
        const allVendors = await getAllVendors()
        setVendors(allVendors)
      } catch (error) {
        console.error('Error loading vendors:', error)
      } finally {
        setLoading(false)
      }
    }

    loadVendors()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading vendors...</div>
      </div>
    )
  }

  const renderCell = (value: string | undefined) => (
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

  const handleEdit = (vendor: Vendor) => {
    setEditingId(vendor.id)
    setNewName(vendor.name)
    setNewContactPerson(vendor.contactPerson || '')
    setNewEmail(vendor.email || '')
    setNewPhone(vendor.phone || '')
    setNewAddress(vendor.address || '')
    setNewBankDetails(vendor.bankDetails || '')
    setNewPaymentTerms(vendor.paymentTerms || '')
    setShowAdd(true)
  }

  const handleSave = async () => {
    // Validate name field
    if (!newName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Vendor name is required',
        variant: 'destructive',
      })
      return
    }

    const vendor: Vendor = {
      id: editingId || generateId(),
      name: newName.trim(),
      contactPerson: newContactPerson.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
      address: newAddress.trim(),
      bankDetails: newBankDetails.trim(),
      paymentTerms: newPaymentTerms.trim(),
      createdAt: editingId ? vendors.find(v => v.id === editingId)?.createdAt : undefined,
    }
    try {
      await saveVendor(vendor)
      const updated = await getAllVendors()
      setVendors(updated)
      setNewName('')
      setNewContactPerson('')
      setNewEmail('')
      setNewPhone('')
      setNewAddress('')
      setNewBankDetails('')
      setNewPaymentTerms('')
      setEditingId(null)
      setShowAdd(false)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { entity: 'vendors' } }))
      }
    } catch (err) {
      console.error('Failed to save vendor', err)
      toast({
        title: 'Error',
        description: 'Failed to save vendor',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this vendor?')) {
      try {
        await deleteVendor(id)
        const updated = await getAllVendors()
        setVendors(updated)

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { entity: 'vendors' } }))
        }
      } catch (err) {
        console.error('Failed to delete vendor', err)
      }
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Vendors</h1>
          <p className="text-slate-500">Manage your vendors</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Vendors ({vendors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.length > 0 ? (
                  vendors.map((vendor, index) => (
                    <TableRow key={vendor.id || `vendor-${index}`}>
                      {renderCell(vendor.name)}
                      {renderCell(vendor.contactPerson)}
                      {renderCell(vendor.email)}
                      {renderCell(vendor.phone)}
                      <TableCell className="text-center gap-2 flex justify-center">
                        <button onClick={() => handleEdit(vendor)} className="text-primary hover:text-primary/90">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(vendor.id || `vendor-${index}`)} className="text-destructive hover:text-destructive/90">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                      No vendors yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Vendor Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowAdd(false); setEditingId(null) }} />
          <div className="bg-white rounded-lg shadow-xl z-10 w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10 rounded-t-lg">
              <h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'Add'} Vendor</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="vendor-name" className="text-slate-700 text-sm mb-1 block">Name</Label>
                  <input 
                    id="vendor-name"
                    className="w-full border px-2 py-1" 
                    placeholder="Name" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="vendor-contact-person" className="text-slate-700 text-sm mb-1 block">Contact Person</Label>
                  <input 
                    id="vendor-contact-person"
                    className="w-full border px-2 py-1" 
                    placeholder="Contact Person" 
                    value={newContactPerson} 
                    onChange={(e) => setNewContactPerson(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="vendor-email" className="text-slate-700 text-sm mb-1 block">Email</Label>
                  <input 
                    id="vendor-email"
                    className="w-full border px-2 py-1" 
                    placeholder="Email" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="vendor-phone" className="text-slate-700 text-sm mb-1 block">Phone</Label>
                  <input 
                    id="vendor-phone"
                    className="w-full border px-2 py-1" 
                    placeholder="Phone" 
                    value={newPhone} 
                    onChange={(e) => setNewPhone(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="vendor-address" className="text-slate-700 text-sm mb-1 block">Address</Label>
                  <textarea 
                    id="vendor-address"
                    className="w-full border px-2 py-1" 
                    placeholder="Address" 
                    value={newAddress} 
                    onChange={(e) => setNewAddress(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="vendor-bank-details" className="text-slate-700 text-sm mb-1 block">Bank Details</Label>
                  <textarea 
                    id="vendor-bank-details"
                    className="w-full border px-2 py-1" 
                    placeholder="Bank Details" 
                    value={newBankDetails} 
                    onChange={(e) => setNewBankDetails(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="vendor-payment-terms" className="text-slate-700 text-sm mb-1 block">Payment Terms</Label>
                  <textarea 
                    id="vendor-payment-terms"
                    className="w-full border px-2 py-1" 
                    placeholder="Payment Terms" 
                    value={newPaymentTerms} 
                    onChange={(e) => setNewPaymentTerms(e.target.value)} 
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0 bg-white z-10 rounded-b-lg">
              <button className="px-3 py-1 border rounded" onClick={() => { setShowAdd(false); setEditingId(null); setNewName(''); setNewContactPerson(''); setNewEmail(''); setNewPhone(''); setNewAddress(''); setNewBankDetails(''); setNewPaymentTerms('') }}>Cancel</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
