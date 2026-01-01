'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, TrendingUp, TrendingDown, DollarSign, ArrowLeft, Calendar, Trash2 } from 'lucide-react'
import { getVehicleById, getVehicleProfitability, getAllVehicleTransactions, deleteVehicleTransaction, saveVehicleTransaction, generateId } from '@/lib/storage'
import { VehicleProfitabilityChart } from '@/components/vehicle-profitability-chart'
import VehicleTransactionForm from '@/components/vehicle-transaction-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import type { VehicleTransaction, VehicleProfitabilitySummary, Vehicle } from '@/lib/types'

export default function VehicleFinanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const vehicleId = params?.vehicleId as string

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [profitability, setProfitability] = useState<VehicleProfitabilitySummary | null>(null)
  const [transactions, setTransactions] = useState<VehicleTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<VehicleTransaction | null>(null)
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (vehicleId) {
      loadVehicle()
      loadProfitability()
      loadTransactions()
    }
  }, [vehicleId])

  useEffect(() => {
    if (vehicleId) {
      loadProfitability()
      loadTransactions()
    }
  }, [vehicleId, filterMonth])

  const loadVehicle = async () => {
    if (!vehicleId) return
    try {
      const data = await getVehicleById(vehicleId)
      setVehicle(data)
    } catch (err) {
      console.error('Failed to load vehicle:', err)
      router.push('/vehicle-finances')
    } finally {
      setLoading(false)
    }
  }

  const loadProfitability = async () => {
    if (!vehicleId) return
    try {
      const data = await getVehicleProfitability(vehicleId)
      setProfitability(data)
    } catch (err) {
      console.error('Failed to load profitability:', err)
    }
  }

  const loadTransactions = async () => {
    if (!vehicleId) return
    try {
      const data = await getAllVehicleTransactions(vehicleId, filterMonth || undefined)
      setTransactions(data)
    } catch (err) {
      console.error('Failed to load transactions:', err)
    }
  }

  const handleTransactionSave = async () => {
    setShowTransactionForm(false)
    setEditingTransaction(null)
    await loadProfitability()
    await loadTransactions()
  }

  const handleEditTransaction = (transaction: VehicleTransaction) => {
    setEditingTransaction(transaction)
    setShowTransactionForm(true)
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return
    }
    try {
      await deleteVehicleTransaction(id)
      await loadProfitability()
      await loadTransactions()
      setSelectedTransactions(new Set())
    } catch (err) {
      alert('Failed to delete transaction')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedTransactions.size === 0) {
      return
    }

    const count = selectedTransactions.size
    const message = count === 1
      ? 'Are you sure you want to delete this transaction?'
      : `Are you sure you want to delete ${count} selected transactions?`

    if (!confirm(message)) {
      return
    }

    try {
      // Delete all selected transactions
      const deletePromises = Array.from(selectedTransactions).map(id => 
        deleteVehicleTransaction(id)
      )
      await Promise.all(deletePromises)
      
      // Reload data
      await loadProfitability()
      await loadTransactions()
      setSelectedTransactions(new Set())
    } catch (err) {
      alert('Failed to delete transactions')
      console.error('Error deleting transactions:', err)
    }
  }

  const handleSelectTransaction = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactions)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedTransactions(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(transactions.map(t => t.id))
      setSelectedTransactions(allIds)
    } else {
      setSelectedTransactions(new Set())
    }
  }

  const isAllSelected = transactions.length > 0 && selectedTransactions.size === transactions.length
  const isIndeterminate = selectedTransactions.size > 0 && selectedTransactions.size < transactions.length

  // Get unique months from transactions for filter
  const availableMonths = Array.from(new Set(transactions.map(t => t.month))).sort().reverse()

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            Vehicle not found
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/vehicle-finances">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Vehicle Finances
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Vehicle Finances</h1>
          <p className="text-slate-500">
            {vehicle.vehicleNumber} {vehicle.make && vehicle.model ? `- ${vehicle.make} ${vehicle.model}` : ''}
          </p>
        </div>
        <Button onClick={() => {
          setEditingTransaction(null)
          setShowTransactionForm(true)
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Vehicle Details Card */}
      <Card className="mb-6">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {vehicle.make && vehicle.model && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Make & Model</p>
                <p className="text-base font-semibold text-slate-900">
                  {vehicle.make} {vehicle.model}
                </p>
              </div>
            )}
            {vehicle.year && (
              <div>
                <p className="text-sm text-slate-500 mb-1">Year</p>
                <p className="text-base font-semibold text-slate-900">{vehicle.year}</p>
              </div>
            )}
            {vehicle.color && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Color</p>
                <p className="text-base font-semibold text-slate-900">{vehicle.color}</p>
              </div>
            )}
            {vehicle.status && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Status</p>
                <p className="text-base font-semibold text-slate-900 capitalize">{vehicle.status}</p>
              </div>
            )}
            {vehicle.vehicleType && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Vehicle Type</p>
                <p className="text-base font-semibold text-slate-900">{vehicle.vehicleType}</p>
              </div>
            )}
            {vehicle.fuelType && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Fuel Type</p>
                <p className="text-base font-semibold text-slate-900 capitalize">{vehicle.fuelType}</p>
              </div>
            )}
            {vehicle.purchaseDate && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Purchase Date</p>
                <p className="text-base font-semibold text-slate-900">
                  {new Date(vehicle.purchaseDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            )}
            {vehicle.purchasePrice && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Purchase Price</p>
                <p className="text-base font-semibold text-slate-900">
                  AED {vehicle.purchasePrice.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </p>
              </div>
            )}
            {vehicle.odometerReading !== undefined && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Odometer</p>
                <p className="text-base font-semibold text-slate-900">
                  {vehicle.odometerReading.toLocaleString('en-US')} km
                </p>
              </div>
            )}
            {vehicle.registrationExpiry && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Registration Expiry</p>
                <p className="text-base font-semibold text-slate-900">
                  {new Date(vehicle.registrationExpiry).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            )}
            {vehicle.insuranceExpiry && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Insurance Expiry</p>
                <p className="text-base font-semibold text-slate-900">
                  {new Date(vehicle.insuranceExpiry).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            )}
            {vehicle.currentValue && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Current Value</p>
                <p className="text-base font-semibold text-slate-900">
                  AED {vehicle.currentValue.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {vehicleId && (
        <div className="mb-6 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <Select value={filterMonth || '__all__'} onValueChange={(value) => setFilterMonth(value === '__all__' ? '' : value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All months</SelectItem>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {profitability && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Current Month</CardTitle>
              </CardHeader>
              <CardContent>
                {profitability.currentMonth ? (
                  <div>
                    <div className="text-2xl font-bold">
                      {profitability.currentMonth.profit >= 0 ? (
                        <span className="text-green-600">
                          <TrendingUp className="w-5 h-5 inline mr-1" />
                          {profitability.currentMonth.profit.toFixed(2)} AED
                        </span>
                      ) : (
                        <span className="text-red-600">
                          <TrendingDown className="w-5 h-5 inline mr-1" />
                          {Math.abs(profitability.currentMonth.profit).toFixed(2)} AED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {profitability.currentMonth.month}
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-500">No data</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">All-Time Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  <DollarSign className="w-5 h-5 inline mr-1" />
                  {profitability.allTimeRevenue.toFixed(2)} AED
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">All-Time Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  <DollarSign className="w-5 h-5 inline mr-1" />
                  {profitability.allTimeExpenses.toFixed(2)} AED
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">All-Time Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {profitability.allTimeProfit >= 0 ? (
                    <span className="text-green-600">
                      <TrendingUp className="w-5 h-5 inline mr-1" />
                      {profitability.allTimeProfit.toFixed(2)} AED
                    </span>
                  ) : (
                    <span className="text-red-600">
                      <TrendingDown className="w-5 h-5 inline mr-1" />
                      {Math.abs(profitability.allTimeProfit).toFixed(2)} AED
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <VehicleProfitabilityChart data={profitability?.months || []} />
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Transactions</CardTitle>
                    {transactions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleSelectAll(!isAllSelected)}
                          variant="outline"
                          size="sm"
                        >
                          {isAllSelected ? 'Deselect All' : 'Select All'}
                        </Button>
                        {selectedTransactions.size > 0 && (
                          <Button
                            onClick={handleDeleteSelected}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Selected ({selectedTransactions.size})
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={isAllSelected}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.length > 0 ? (
                          transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedTransactions.has(transaction.id)}
                                  onCheckedChange={(checked) => handleSelectTransaction(transaction.id, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell>{transaction.date}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  transaction.transactionType === 'revenue'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {transaction.transactionType}
                                </span>
                              </TableCell>
                              <TableCell>{transaction.category || '—'}</TableCell>
                              <TableCell className="font-medium">
                                {transaction.amount.toFixed(2)} AED
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {transaction.description || '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    onClick={() => handleEditTransaction(transaction)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteTransaction(transaction.id)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                              No transactions found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!profitability && (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            No financial data available for this vehicle
          </CardContent>
        </Card>
      )}

      <Dialog open={showTransactionForm} onOpenChange={setShowTransactionForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </DialogTitle>
          </DialogHeader>
          <VehicleTransactionForm
            vehicleId={vehicleId}
            transaction={editingTransaction || undefined}
            onSave={handleTransactionSave}
            onCancel={() => {
              setShowTransactionForm(false)
              setEditingTransaction(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

