'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { getAllVehicles, saveVehicle, deleteVehicle, generateId } from '@/lib/storage'
import type { Vehicle } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newType, setNewType] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newBasePrice, setNewBasePrice] = useState('')

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const allVehicles = await getAllVehicles()
        setVehicles(allVehicles)
      } catch (error) {
        console.error('Error loading vehicles:', error)
      } finally {
        setLoading(false)
      }
    }

    loadVehicles()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading vehicles...</div>
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

  const handleEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id)
    setNewType(vehicle.type)
    setNewDescription(vehicle.description || '')
    setNewBasePrice(String(vehicle.basePrice || ''))
    setShowAdd(true)
  }

  const handleSave = async () => {
    const vehicle: Vehicle = {
      id: editingId || generateId(),
      type: newType.trim(),
      description: newDescription.trim(),
      basePrice: parseFloat(newBasePrice) || undefined,
      createdAt: new Date().toISOString(),
    }
    try {
      await saveVehicle(vehicle)
      const updated = await getAllVehicles()
      setVehicles(updated)
      setNewType('')
      setNewDescription('')
      setNewBasePrice('')
      setEditingId(null)
      setShowAdd(false)
    } catch (err) {
      console.error('Failed to save vehicle', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await deleteVehicle(id)
        const updated = await getAllVehicles()
        setVehicles(updated)
      } catch (err) {
        console.error('Failed to delete vehicle', err)
      }
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Vehicles</h1>
          <p className="text-slate-500">Manage vehicle types and rates</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Vehicle Types ({vehicles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Base Price (AED)</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.length > 0 ? (
                  vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      {renderCell(vehicle.type)}
                      {renderCell(vehicle.description)}
                      <TableCell className="text-right text-slate-900 font-medium">{(vehicle.basePrice || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-center gap-2 flex justify-center">
                        <button onClick={() => handleEdit(vehicle)} className="text-blue-600 hover:text-blue-800">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(vehicle.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                      No vehicle types yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Vehicle Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowAdd(false); setEditingId(null) }} />
          <div className="bg-white rounded p-6 z-10 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit' : 'Add'} Vehicle Type</h3>
            <div className="space-y-2">
              <input className="w-full border px-2 py-1" placeholder="Type (e.g., Pickup Truck)" value={newType} onChange={(e) => setNewType(e.target.value)} />
              <textarea className="w-full border px-2 py-1" placeholder="Description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
              <input className="w-full border px-2 py-1" placeholder="Base Price (AED)" type="number" step="0.01" value={newBasePrice} onChange={(e) => setNewBasePrice(e.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => { setShowAdd(false); setEditingId(null); setNewType(''); setNewDescription(''); setNewBasePrice('') }}>Cancel</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
