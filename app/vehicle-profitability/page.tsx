'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, TrendingUp, TrendingDown, DollarSign, ArrowLeft } from 'lucide-react'
import { getAllVehicles, getVehicleProfitability, getAllVehicleTransactions, deleteVehicleTransaction, saveVehicleTransaction, generateId } from '@/lib/storage'
import { VehicleProfitabilityChart } from '@/components/vehicle-profitability-chart'
import VehicleTransactionForm from '@/components/vehicle-transaction-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import type { VehicleTransaction, VehicleProfitabilitySummary } from '@/lib/types'

export default function VehicleProfitabilityPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [profitability, setProfitability] = useState<VehicleProfitabilitySummary | null>(null)
  const [transactions, setTransactions] = useState<VehicleTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<VehicleTransaction | null>(null)
  const [filterMonth, setFilterMonth] = useState<string>('')

  useEffect(() => {
    loadVehicles()
    // Check for vehicleId in URL query params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const vehicleIdParam = params.get('vehicleId')
      if (vehicleIdParam) {
        setSelectedVehicleId(vehicleIdParam)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedVehicleId) {
      loadProfitability()
      loadTransactions()
    }
  }, [selectedVehicleId, filterMonth])

  const loadVehicles = async () => {
    try {
      const data = await getAllVehicles()
      setVehicles(data)
      if (data.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to load vehicles:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadProfitability = async () => {
    if (!selectedVehicleId) return
    try {
      const data = await getVehicleProfitability(selectedVehicleId)
      setProfitability(data)
    } catch (err) {
      console.error('Failed to load profitability:', err)
    }
  }

  const loadTransactions = async () => {
    if (!selectedVehicleId) return
    try {
      const data = await getAllVehicleTransactions(selectedVehicleId, filterMonth || undefined)
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
    } catch (err) {
      alert('Failed to delete transaction')
    }
  }

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)

  // Get unique months from transactions for filter
  const availableMonths = Array.from(new Set(transactions.map(t => t.month))).sort().reverse()

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/vehicles">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Vehicles
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Vehicle Finances</h1>
          <p className="text-slate-500">Track expenses and revenue for each vehicle</p>
        </div>
        <Button onClick={() => {
          setEditingTransaction(null)
          setShowTransactionForm(true)
        }} disabled={!selectedVehicleId}>
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Vehicle</label>
          <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleNumber} {vehicle.make && vehicle.model ? `- ${vehicle.make} ${vehicle.model}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedVehicleId && (
          <div className="w-48">
            <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Month</label>
            <Select value={filterMonth || '__all__'} onValueChange={(value) => setFilterMonth(value === '__all__' ? '' : value)}>
              <SelectTrigger>
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
      </div>

      {selectedVehicleId && profitability && (
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
              <VehicleProfitabilityChart data={profitability.months} />
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                            <TableCell colSpan={6} className="text-center text-slate-500 py-8">
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

      {!selectedVehicleId && (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            Please select a vehicle to view profitability data
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
            vehicleId={selectedVehicleId}
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

