'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getAllVehicles, getAllEmployees, getAllExpenseCategories, saveVehicleTransaction, generateId, getAllInvoices, getAllPurchaseOrders, getAllQuotes } from '@/lib/storage'
import type { VehicleTransaction, VehicleTransactionType, Employee, ExpenseCategory, Invoice, PurchaseOrder, Quote } from '@/lib/types'

interface VehicleTransactionFormProps {
  vehicleId?: string
  transaction?: VehicleTransaction
  onSave: () => void
  onCancel: () => void
}

export default function VehicleTransactionForm({ vehicleId, transaction, onSave, onCancel }: VehicleTransactionFormProps) {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    vehicleId: vehicleId || transaction?.vehicleId || '',
    transactionType: (transaction?.transactionType || 'expense') as VehicleTransactionType,
    category: transaction?.category || '',
    amount: transaction?.amount?.toString() || '',
    date: transaction?.date || new Date().toISOString().split('T')[0],
    description: transaction?.description || '',
    employeeId: transaction?.employeeId || '',
    invoiceId: transaction?.invoiceId || '',
    purchaseOrderId: transaction?.purchaseOrderId || '',
    quoteId: transaction?.quoteId || '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [vehiclesData, employeesData, categoriesData, invoicesData, purchaseOrdersData, quotesData] = await Promise.all([
        getAllVehicles(),
        getAllEmployees(),
        getAllExpenseCategories(),
        getAllInvoices(),
        getAllPurchaseOrders(),
        getAllQuotes(),
      ])
      setVehicles(vehiclesData)
      setEmployees(employeesData)
      setCategories(categoriesData)
      setInvoices(invoicesData)
      setPurchaseOrders(purchaseOrdersData)
      setQuotes(quotesData)
    } catch (err: any) {
      setError(err?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      // Validate
      if (!formData.vehicleId) {
        throw new Error('Vehicle is required')
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Amount must be greater than 0')
      }
      if (!formData.date) {
        throw new Error('Date is required')
      }
      if (formData.transactionType === 'expense' && !formData.category) {
        throw new Error('Category is required for expenses')
      }

      // Validate date range (12 months back, no future)
      const txDate = new Date(formData.date)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
      twelveMonthsAgo.setHours(0, 0, 0, 0)

      if (txDate > today) {
        throw new Error('Transaction date cannot be in the future')
      }
      if (txDate < twelveMonthsAgo) {
        throw new Error('Transaction date cannot be more than 12 months in the past')
      }

      const transactionData: VehicleTransaction = {
        id: transaction?.id || generateId(),
        vehicleId: formData.vehicleId,
        transactionType: formData.transactionType,
        category: formData.transactionType === 'expense' ? formData.category : undefined,
        amount: parseFloat(formData.amount),
        date: formData.date,
        month: formData.date.substring(0, 7), // YYYY-MM
        description: formData.description || undefined,
        employeeId: formData.employeeId || undefined,
        invoiceId: formData.transactionType === 'revenue' ? (formData.invoiceId || undefined) : undefined,
        purchaseOrderId: formData.transactionType === 'expense' ? (formData.purchaseOrderId || undefined) : undefined,
        quoteId: formData.transactionType === 'expense' ? (formData.quoteId || undefined) : undefined,
      }

      await saveVehicleTransaction(transactionData)
      onSave()
    } catch (err: any) {
      setError(err?.message || 'Failed to save transaction')
    } finally {
      setSaving(false)
    }
  }

  const handleEmployeeChange = (employeeId: string) => {
    setFormData(prev => ({ ...prev, employeeId }))
    
    // Auto-suggest salary if employee is selected and transaction type is expense
    if (employeeId && formData.transactionType === 'expense') {
      const employee = employees.find(e => e.id === employeeId)
      if (employee) {
        // Suggest monthly salary or hourly rate * 160 (approximate monthly hours)
        let suggestedAmount = 0
        if (employee.paymentType === 'monthly' && employee.salary) {
          suggestedAmount = employee.salary
        } else if (employee.paymentType === 'hourly' && employee.hourlyRate) {
          suggestedAmount = employee.hourlyRate * 160 // Approximate monthly hours
        }
        if (suggestedAmount > 0) {
          setFormData(prev => ({ ...prev, amount: suggestedAmount.toString() }))
        }
      }
    }
  }

  if (loading) {
    return <div className="p-4 text-slate-500">Loading...</div>
  }

  const expenseCategories = categories.filter(c => formData.transactionType === 'expense')
  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId)
  const selectedEmployee = employees.find(e => e.id === formData.employeeId)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vehicleId">Vehicle <span className="text-red-500">*</span></Label>
          <Select
            value={formData.vehicleId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleId: value }))}
            disabled={!!vehicleId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vehicle" />
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

        <div className="space-y-2">
          <Label htmlFor="transactionType">Type <span className="text-red-500">*</span></Label>
          <Select
            value={formData.transactionType}
            onValueChange={(value) => setFormData(prev => ({ ...prev, transactionType: value as VehicleTransactionType, category: '', invoiceId: '', purchaseOrderId: '', quoteId: '' }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.transactionType === 'expense' && (
        <div className="space-y-2">
          <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {expenseCategories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.transactionType === 'revenue' && (
        <div className="space-y-2">
          <Label htmlFor="invoiceId">Linked Invoice (Optional)</Label>
          <Select
            value={formData.invoiceId || '__none__'}
            onValueChange={(value) => setFormData(prev => ({ ...prev, invoiceId: value === '__none__' ? '' : value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select invoice (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {invoices.map((invoice) => (
                <SelectItem key={invoice.id} value={invoice.id}>
                  {invoice.number} - {invoice.date} - {invoice.total?.toFixed(2) || '0.00'} AED
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.transactionType === 'expense' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="purchaseOrderId">Linked Purchase Order (Optional)</Label>
            <Select
              value={formData.purchaseOrderId || '__none__'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, purchaseOrderId: value === '__none__' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select purchase order (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {purchaseOrders.map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.number} - {po.date} - {po.amount?.toFixed(2) || '0.00'} AED
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quoteId">Linked Quote (Optional)</Label>
            <Select
              value={formData.quoteId || '__none__'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, quoteId: value === '__none__' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quote (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {quotes.map((quote) => (
                  <SelectItem key={quote.id} value={quote.id}>
                    {quote.number} - {quote.date} - {quote.total?.toFixed(2) || '0.00'} AED
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (AED) <span className="text-red-500">*</span></Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date <span className="text-red-500">*</span></Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            max={new Date().toISOString().split('T')[0]}
            required
          />
        </div>
      </div>

      {formData.transactionType === 'expense' && (
        <div className="space-y-2">
          <Label htmlFor="employeeId">Driver (Optional)</Label>
          <Select
            value={formData.employeeId || '__none__'}
            onValueChange={(value) => handleEmployeeChange(value === '__none__' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select driver (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name} {employee.role ? `(${employee.role})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEmployee && (
            <p className="text-xs text-slate-500">
              {selectedEmployee.paymentType === 'monthly' && selectedEmployee.salary
                ? `Monthly salary: ${selectedEmployee.salary.toFixed(2)} AED`
                : selectedEmployee.paymentType === 'hourly' && selectedEmployee.hourlyRate
                ? `Hourly rate: ${selectedEmployee.hourlyRate.toFixed(2)} AED`
                : 'No payment info available'}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          placeholder="Additional notes or description..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : transaction ? 'Update' : 'Create'} Transaction
        </Button>
      </div>
    </form>
  )
}

