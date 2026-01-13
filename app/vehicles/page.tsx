'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2, Car, AlertCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { getAllVehicles, saveVehicle, deleteVehicle, generateId, getVehicleProfitability, getAllVehicleTransactions, saveVehicleTransaction } from '@/lib/storage'
import type { Vehicle, VehicleFuelType, VehicleStatus } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'

// Form field state
interface VehicleForm {
  vehicleNumber: string
  vehicleType: string
  make: string
  model: string
  year: string
  color: string
  purchasePrice: string
  purchaseDate: string
  currentValue: string
  insuranceCostMonthly: string
  financingCostMonthly: string
  odometerReading: string
  lastServiceDate: string
  nextServiceDue: string
  fuelType: string
  status: string
  registrationExpiry: string
  insuranceExpiry: string
  description: string
  basePrice: string
  notes: string
}

const emptyForm: VehicleForm = {
  vehicleNumber: '',
  vehicleType: '',
  make: '',
  model: '',
  year: '',
  color: '',
  purchasePrice: '',
  purchaseDate: '',
  currentValue: '',
  insuranceCostMonthly: '',
  financingCostMonthly: '',
  odometerReading: '',
  lastServiceDate: '',
  nextServiceDue: '',
  fuelType: '',
  status: 'active',
  registrationExpiry: '',
  insuranceExpiry: '',
  description: '',
  basePrice: '',
  notes: '',
}

const fuelTypeOptions: VehicleFuelType[] = ['petrol', 'diesel', 'electric', 'hybrid']
const statusOptions: VehicleStatus[] = ['active', 'maintenance', 'sold', 'retired']

const statusColors: Record<VehicleStatus, string> = {
  active: 'bg-green-100 text-green-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  sold: 'bg-slate-100 text-slate-800',
  retired: 'bg-red-100 text-red-800',
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<VehicleForm>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [profitabilityData, setProfitabilityData] = useState<Record<string, any>>({})
  const [expandedSections, setExpandedSections] = useState({
    identification: true,
    financial: false,
    operational: false,
    compliance: false,
  })

  useEffect(() => {
    loadVehicles()
  }, [])

  useEffect(() => {
    if (vehicles.length > 0) {
      loadProfitabilityData()
    }
  }, [vehicles])

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

  const loadProfitabilityData = async () => {
    const data: Record<string, any> = {}
    for (const vehicle of vehicles) {
      try {
        const profitability = await getVehicleProfitability(vehicle.id)
        data[vehicle.id] = profitability
      } catch (error) {
        console.error(`Error loading profitability for vehicle ${vehicle.id}:`, error)
      }
    }
    setProfitabilityData(data)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading vehicles...</div>
      </div>
    )
  }

  const renderCell = (value: string | number | undefined) => (
    <TableCell className="text-slate-600 truncate max-w-[150px]">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <span className="block truncate" title={String(value) || 'N/A'}>
              {value || '—'}
            </span>
          </TooltipTrigger>
          <TooltipContent>{value || 'N/A'}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TableCell>
  )

  const handleEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id)
    setForm({
      vehicleNumber: vehicle.vehicleNumber || '',
      vehicleType: vehicle.vehicleType || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year?.toString() || '',
      color: vehicle.color || '',
      purchasePrice: vehicle.purchasePrice?.toString() || '',
      purchaseDate: vehicle.purchaseDate || '',
      currentValue: vehicle.currentValue?.toString() || '',
      insuranceCostMonthly: vehicle.insuranceCostMonthly?.toString() || '',
      financingCostMonthly: vehicle.financingCostMonthly?.toString() || '',
      odometerReading: vehicle.odometerReading?.toString() || '',
      lastServiceDate: vehicle.lastServiceDate || '',
      nextServiceDue: vehicle.nextServiceDue || '',
      fuelType: vehicle.fuelType || '',
      status: vehicle.status || 'active',
      registrationExpiry: vehicle.registrationExpiry || '',
      insuranceExpiry: vehicle.insuranceExpiry || '',
      description: vehicle.description || '',
      basePrice: vehicle.basePrice?.toString() || '',
      notes: vehicle.notes || '',
    })
    setShowAdd(true)
    setError(null)
  }

  const handleSave = async () => {
    // Validate required field
    if (!form.vehicleNumber.trim()) {
      setError('Vehicle Number is required')
      return
    }

    const vehicleId = editingId || generateId()
    const vehicle: Vehicle = {
      id: vehicleId,
      vehicleNumber: form.vehicleNumber.trim(),
      vehicleType: form.vehicleType.trim() || undefined,
      make: form.make.trim() || undefined,
      model: form.model.trim() || undefined,
      year: form.year ? parseInt(form.year) : undefined,
      color: form.color.trim() || undefined,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
      purchaseDate: form.purchaseDate || undefined,
      currentValue: form.currentValue ? parseFloat(form.currentValue) : undefined,
      insuranceCostMonthly: form.insuranceCostMonthly ? parseFloat(form.insuranceCostMonthly) : undefined,
      financingCostMonthly: form.financingCostMonthly ? parseFloat(form.financingCostMonthly) : undefined,
      odometerReading: form.odometerReading ? parseFloat(form.odometerReading) : undefined,
      lastServiceDate: form.lastServiceDate || undefined,
      nextServiceDue: form.nextServiceDue || undefined,
      fuelType: (form.fuelType as VehicleFuelType) || undefined,
      status: (form.status as VehicleStatus) || 'active',
      registrationExpiry: form.registrationExpiry || undefined,
      insuranceExpiry: form.insuranceExpiry || undefined,
      description: form.description.trim() || undefined,
      basePrice: form.basePrice ? parseFloat(form.basePrice) : undefined,
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    }

    try {
      await saveVehicle(vehicle)
      
      // Optional: Auto-create expense entry for purchase price
      if (vehicle.purchasePrice && vehicle.purchasePrice > 0 && vehicle.purchaseDate) {
        try {
          // Check if expense entry already exists for this purchase
          const existingTransactions = await getAllVehicleTransactions(vehicleId)
          const purchaseExpenseExists = existingTransactions.some(
            t => t.transactionType === 'expense' && 
                 t.category === 'Purchase' && 
                 Math.abs(t.amount - vehicle.purchasePrice) < 0.01
          )
          
          if (!purchaseExpenseExists) {
            // Ask user if they want to create expense entry
            const shouldCreate = confirm(
              `Would you like to create an expense entry for the purchase price of ${vehicle.purchasePrice.toFixed(2)} AED?`
            )
            
            if (shouldCreate) {
              await saveVehicleTransaction({
                id: generateId(),
                vehicleId: vehicleId,
                transactionType: 'expense',
                category: 'Purchase',
                amount: vehicle.purchasePrice,
                date: vehicle.purchaseDate,
                month: vehicle.purchaseDate.substring(0, 7),
                description: `Vehicle purchase: ${vehicle.vehicleNumber}`,
              })
            }
          }
        } catch (err) {
          // Don't fail vehicle save if expense creation fails
          console.error('Failed to create purchase expense entry:', err)
        }
      }
      
      await loadVehicles()
      closeModal()
    } catch (err: any) {
      console.error('Failed to save vehicle', err)
      setError(err?.message || 'Failed to save vehicle')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await deleteVehicle(id)
        await loadVehicles()
      } catch (err: any) {
        alert(err?.message || 'Failed to delete vehicle')
      }
    }
  }

  const closeModal = () => {
    setShowAdd(false)
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const updateForm = (field: keyof VehicleForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (error) setError(null)
  }

  const inputClass = "w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1"

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Fleet Management</h1>
          <p className="text-slate-500">Manage your vehicle fleet and track expenses</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setShowAdd(true); setError(null) }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            All Vehicles ({vehicles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle #</TableHead>
                  <TableHead>Make / Model</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Base Price (AED)</TableHead>
                  <TableHead className="text-right">Current Month Profit</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.length > 0 ? (
                  vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium text-slate-900">{vehicle.vehicleNumber}</TableCell>
                      {renderCell(vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : vehicle.make || vehicle.model)}
                      {renderCell(vehicle.year)}
                      {renderCell(vehicle.vehicleType)}
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[vehicle.status || 'active']}`}>
                          {vehicle.status || 'active'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-slate-900 font-medium">
                        {vehicle.basePrice ? vehicle.basePrice.toFixed(2) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {profitabilityData[vehicle.id]?.currentMonth ? (
                          <div className="flex items-center justify-end gap-1">
                            {profitabilityData[vehicle.id].currentMonth.profit >= 0 ? (
                              <>
                                <TrendingUp className="w-4 h-4 text-green-600" />
                                <span className="text-green-600 font-medium">
                                  {profitabilityData[vehicle.id].currentMonth.profit.toFixed(2)} AED
                                </span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="w-4 h-4 text-red-600" />
                                <span className="text-red-600 font-medium">
                                  {Math.abs(profitabilityData[vehicle.id].currentMonth.profit).toFixed(2)} AED
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          {/* <Link href={`/vehicle-finances/${vehicle.id}`} className="inline-block">
                            <span className="text-green-600 hover:text-green-800 cursor-pointer inline-flex" title="View Profitability">
                              <DollarSign className="w-4 h-4" /> 
                            </span>
                          </Link> */}
                          <button onClick={() => handleEdit(vehicle)} className="text-blue-600 hover:text-blue-800">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(vehicle.id)} className="text-red-600 hover:text-red-800">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                      No vehicles in fleet yet
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
          <div className="fixed inset-0 bg-black/40" onClick={closeModal} />
          <div className="bg-white rounded-lg shadow-xl z-10 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10 rounded-t-lg">
              <h3 className="text-xl font-semibold text-slate-900">
                {editingId ? 'Edit' : 'Add'} Vehicle
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Only Vehicle Number is required. All other fields are optional.
              </p>
            </div>

            <div className="overflow-y-auto flex-1">
              {error && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="p-6 space-y-4">
              {/* Vehicle Identification Section */}
              <div className="border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('identification')}
                  className="w-full px-4 py-3 flex justify-between items-center text-left font-medium text-slate-900 hover:bg-slate-50"
                >
                  🚗 Vehicle Identification
                  <span>{expandedSections.identification ? '−' : '+'}</span>
                </button>
                {expandedSections.identification && (
                  <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className={labelClass}>
                        Vehicle Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={`${inputClass} ${error && !form.vehicleNumber ? 'border-red-500' : ''}`}
                        placeholder="e.g., DXB A-12345"
                        value={form.vehicleNumber}
                        onChange={(e) => updateForm('vehicleNumber', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Vehicle Type</label>
                      <input
                        className={inputClass}
                        placeholder="e.g., Sedan, SUV, Lorry"
                        value={form.vehicleType}
                        onChange={(e) => updateForm('vehicleType', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Make</label>
                      <input
                        className={inputClass}
                        placeholder="e.g., Toyota"
                        value={form.make}
                        onChange={(e) => updateForm('make', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Model</label>
                      <input
                        className={inputClass}
                        placeholder="e.g., Hilux"
                        value={form.model}
                        onChange={(e) => updateForm('model', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Year</label>
                      <input
                        className={inputClass}
                        type="number"
                        placeholder="e.g., 2023"
                        value={form.year}
                        onChange={(e) => updateForm('year', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Color</label>
                      <input
                        className={inputClass}
                        placeholder="e.g., White"
                        value={form.color}
                        onChange={(e) => updateForm('color', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Tracking Section */}
              <div className="border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('financial')}
                  className="w-full px-4 py-3 flex justify-between items-center text-left font-medium text-slate-900 hover:bg-slate-50"
                >
                  💰 Financial Tracking
                  <span>{expandedSections.financial ? '−' : '+'}</span>
                </button>
                {expandedSections.financial && (
                  <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Purchase Price (AED)</label>
                      <input
                        className={inputClass}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.purchasePrice}
                        onChange={(e) => updateForm('purchasePrice', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Purchase Date</label>
                      <input
                        className={inputClass}
                        type="date"
                        value={form.purchaseDate}
                        onChange={(e) => updateForm('purchaseDate', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Current Value (AED)</label>
                      <input
                        className={inputClass}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.currentValue}
                        onChange={(e) => updateForm('currentValue', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Base Rental Price (AED)</label>
                      <input
                        className={inputClass}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.basePrice}
                        onChange={(e) => updateForm('basePrice', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Monthly Insurance Cost</label>
                      <input
                        className={inputClass}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.insuranceCostMonthly}
                        onChange={(e) => updateForm('insuranceCostMonthly', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Monthly Financing Cost</label>
                      <input
                        className={inputClass}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.financingCostMonthly}
                        onChange={(e) => updateForm('financingCostMonthly', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Operational Info Section */}
              <div className="border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('operational')}
                  className="w-full px-4 py-3 flex justify-between items-center text-left font-medium text-slate-900 hover:bg-slate-50"
                >
                  🔧 Operational Info
                  <span>{expandedSections.operational ? '−' : '+'}</span>
                </button>
                {expandedSections.operational && (
                  <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Odometer Reading (km)</label>
                      <input
                        className={inputClass}
                        type="number"
                        placeholder="0"
                        value={form.odometerReading}
                        onChange={(e) => updateForm('odometerReading', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Fuel Type</label>
                      <select
                        className={inputClass}
                        value={form.fuelType}
                        onChange={(e) => updateForm('fuelType', e.target.value)}
                      >
                        <option value="">Select fuel type</option>
                        {fuelTypeOptions.map(type => (
                          <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Last Service Date</label>
                      <input
                        className={inputClass}
                        type="date"
                        value={form.lastServiceDate}
                        onChange={(e) => updateForm('lastServiceDate', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Next Service Due</label>
                      <input
                        className={inputClass}
                        type="date"
                        value={form.nextServiceDue}
                        onChange={(e) => updateForm('nextServiceDue', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Status</label>
                      <select
                        className={inputClass}
                        value={form.status}
                        onChange={(e) => updateForm('status', e.target.value)}
                      >
                        {statusOptions.map(status => (
                          <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Compliance Section */}
              <div className="border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('compliance')}
                  className="w-full px-4 py-3 flex justify-between items-center text-left font-medium text-slate-900 hover:bg-slate-50"
                >
                  📄 Compliance & Notes
                  <span>{expandedSections.compliance ? '−' : '+'}</span>
                </button>
                {expandedSections.compliance && (
                  <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Registration Expiry</label>
                      <input
                        className={inputClass}
                        type="date"
                        value={form.registrationExpiry}
                        onChange={(e) => updateForm('registrationExpiry', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Insurance Expiry</label>
                      <input
                        className={inputClass}
                        type="date"
                        value={form.insuranceExpiry}
                        onChange={(e) => updateForm('insuranceExpiry', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Description</label>
                      <textarea
                        className={inputClass}
                        rows={2}
                        placeholder="Vehicle description..."
                        value={form.description}
                        onChange={(e) => updateForm('description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Notes</label>
                      <textarea
                        className={inputClass}
                        rows={2}
                        placeholder="Additional notes..."
                        value={form.notes}
                        onChange={(e) => updateForm('notes', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white z-10 rounded-b-lg">
              <button
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={handleSave}
              >
                {editingId ? 'Update' : 'Create'} Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
