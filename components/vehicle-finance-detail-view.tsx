'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import VehicleTransactionForm from '@/components/vehicle-transaction-form'
import { getVehicleById, getAllVehicleTransactions, deleteVehicleTransaction } from '@/lib/storage'
import type { Vehicle } from '@/lib/types'
import type { VehicleTransaction } from '@/lib/types'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface VehicleFinanceDetailViewProps {
    vehicleId: string
    onDataChange?: () => void
}

export function VehicleFinanceDetailView({ vehicleId, onDataChange }: VehicleFinanceDetailViewProps) {
    const [vehicle, setVehicle] = useState<Vehicle | null>(null)
    const [transactions, setTransactions] = useState<VehicleTransaction[]>([])
    const [loading, setLoading] = useState(true)
    const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<VehicleTransaction | null>(null)

    useEffect(() => {
        if (vehicleId) {
            loadData()
        }
    }, [vehicleId])

    const loadData = async () => {
        try {
            setLoading(true)
            const [vehicleData, transactionsData] = await Promise.allSettled([
                getVehicleById(vehicleId),
                getAllVehicleTransactions(vehicleId),
            ])

            if (vehicleData.status === 'fulfilled') {
                setVehicle(vehicleData.value)
            }

            if (transactionsData.status === 'fulfilled') {
                setTransactions(transactionsData.value || [])
            }
        } catch (error) {
            console.error('Failed to load vehicle data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleEditTransaction = (transaction: VehicleTransaction) => {
        setEditingTransaction(transaction)
        setIsTransactionFormOpen(true)
    }

    const handleDeleteTransaction = async (id: string) => {
        if (!confirm('Are you sure you want to delete this transaction?')) {
            return
        }
        try {
            await deleteVehicleTransaction(id)
            await loadData()
            onDataChange?.()
        } catch (err) {
            alert('Failed to delete transaction')
        }
    }

    const handleTransactionSave = async () => {
        setIsTransactionFormOpen(false)
        setEditingTransaction(null)
        await loadData()
        onDataChange?.()
    }

    if (loading) {
        return (
            <div className="p-8 h-full flex items-center justify-center">
                <div className="text-slate-500">Loading vehicle details...</div>
            </div>
        )
    }

    if (!vehicle) {
        return (
            <div className="p-8 h-full flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <p className="text-slate-500">Vehicle not found</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 h-full overflow-y-auto">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {vehicle.vehicleNumber || `${vehicle.make} ${vehicle.model}`}
                    </h1>
                    <p className="text-slate-600 mt-1">Financial details and transactions</p>
                </div>
                <Dialog open={isTransactionFormOpen} onOpenChange={(open) => {
                    setIsTransactionFormOpen(open)
                    if (!open) {
                        setEditingTransaction(null)
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => {
                            setEditingTransaction(null)
                            setIsTransactionFormOpen(true)
                        }}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Transaction
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <VehicleTransactionForm
                                vehicleId={vehicleId}
                                transaction={editingTransaction || undefined}
                                onSave={handleTransactionSave}
                                onCancel={() => {
                                    setIsTransactionFormOpen(false)
                                    setEditingTransaction(null)
                                }}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Transactions List */}
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
                                    <TableHead>Linked Document</TableHead>
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
                                            <TableCell>
                                                {transaction.transactionType === 'revenue' && transaction.invoiceId ? (
                                                    <Link 
                                                        href="/invoices" 
                                                        className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                                                    >
                                                        Invoice
                                                    </Link>
                                                ) : transaction.transactionType === 'expense' ? (
                                                    <div className="flex flex-col gap-1">
                                                        {transaction.purchaseOrderId && (
                                                            <Link 
                                                                href="/purchase-orders" 
                                                                className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                                                            >
                                                                PO
                                                            </Link>
                                                        )}
                                                        {transaction.quoteId && (
                                                            <Link 
                                                                href="/quotations" 
                                                                className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                                                            >
                                                                Quote
                                                            </Link>
                                                        )}
                                                        {!transaction.purchaseOrderId && !transaction.quoteId && '—'}
                                                    </div>
                                                ) : (
                                                    '—'
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditTransaction(transaction)}
                                                        className="text-primary hover:text-primary/90"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTransaction(transaction.id)}
                                                        className="text-destructive hover:text-destructive/90"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
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
        </div>
    )
}
