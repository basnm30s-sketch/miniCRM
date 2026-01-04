'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { VehicleFinanceCharts } from '@/components/vehicle-finance-charts'
import VehicleTransactionForm from '@/components/vehicle-transaction-form'
import { getVehicleById, getVehicleProfitability, getAllVehicleTransactions } from '@/lib/storage'
import type { Vehicle } from '@/lib/types'
import type { VehicleProfitabilitySummary } from '@/lib/types'

export default function VehicleFinanceDetailPage() {
  const params = useParams()
  const vehicleId = params?.vehicleId as string
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [profitability, setProfitability] = useState<VehicleProfitabilitySummary | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (vehicleId) {
      loadData()
    }
  }, [vehicleId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [vehicleData, profitabilityData, transactionsData] = await Promise.allSettled([
        getVehicleById(vehicleId),
        getVehicleProfitability(vehicleId),
        getAllVehicleTransactions(vehicleId),
      ])

      if (vehicleData.status === 'fulfilled') {
        setVehicle(vehicleData.value)
      }

      if (profitabilityData.status === 'fulfilled') {
        setProfitability(profitabilityData.value)
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading vehicle details...</div>
      </div>
    )
  }

  // Transform profitability data for charts
  const chartData = useMemo(() => {
    if (!profitability || !vehicle) return null

    // Transform months array to monthlyTrend format
    const monthlyTrend = (profitability.months || []).map(m => ({
      month: m.month,
      revenue: m.totalRevenue,
      expenses: m.totalExpenses,
      profit: m.profit,
    }))

    // Create single-item array for topVehiclesByProfit
    const topVehiclesByProfit = [{
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber || `${vehicle.make} ${vehicle.model}`,
      profit: profitability.allTimeProfit,
    }]

    // Calculate expensesByCategory from transactions
    const expensesByCategory: Record<string, number> = {}
    transactions
      .filter(tx => tx.transactionType === 'expense' && tx.category)
      .forEach(tx => {
        const category = tx.category || 'Uncategorized'
        expensesByCategory[category] = (expensesByCategory[category] || 0) + tx.amount
      })

    return {
      monthlyTrend,
      topVehiclesByProfit,
      expensesByCategory,
    }
  }, [profitability, vehicle, transactions])

  if (!vehicle) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-500">Vehicle not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {vehicle.vehicleNumber || `${vehicle.make} ${vehicle.model}`}
        </h1>
        <p className="text-slate-600 mt-1">Financial details and transactions</p>
      </div>

      {chartData && (
        <VehicleFinanceCharts
          monthlyTrend={chartData.monthlyTrend}
          topVehiclesByProfit={chartData.topVehiclesByProfit}
          expensesByCategory={chartData.expensesByCategory}
        />
      )}

      <VehicleTransactionForm
        vehicleId={vehicleId}
        onTransactionAdded={loadData}
      />
    </div>
  )
}

