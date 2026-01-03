'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { VehicleFinanceCharts } from '@/components/vehicle-finance-charts'
import VehicleTransactionForm from '@/components/vehicle-transaction-form'
import { getVehicleById, getVehicleProfitability } from '@/lib/storage'
import type { Vehicle } from '@/lib/types'
import type { VehicleProfitabilitySummary } from '@/lib/types'

export default function VehicleFinanceDetailPage() {
  const params = useParams()
  const vehicleId = params?.vehicleId as string
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [profitability, setProfitability] = useState<VehicleProfitabilitySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (vehicleId) {
      loadData()
    }
  }, [vehicleId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [vehicleData, profitabilityData] = await Promise.allSettled([
        getVehicleById(vehicleId),
        getVehicleProfitability(vehicleId),
      ])

      if (vehicleData.status === 'fulfilled') {
        setVehicle(vehicleData.value)
      }

      if (profitabilityData.status === 'fulfilled') {
        setProfitability(profitabilityData.value)
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

      {profitability && (
        <VehicleFinanceCharts
          vehicle={vehicle}
          profitability={profitability}
        />
      )}

      <VehicleTransactionForm
        vehicleId={vehicleId}
        onTransactionAdded={loadData}
      />
    </div>
  )
}

