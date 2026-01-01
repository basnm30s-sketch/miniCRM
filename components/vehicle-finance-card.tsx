'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, DollarSign, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Vehicle } from '@/lib/types'
import type { VehicleProfitabilitySummary } from '@/lib/types'

interface VehicleFinanceCardProps {
  vehicle: Vehicle
  profitability: VehicleProfitabilitySummary | null
}

export function VehicleFinanceCard({ vehicle, profitability }: VehicleFinanceCardProps) {
  const hasData = profitability && (profitability.allTimeRevenue > 0 || profitability.allTimeExpenses > 0)
  const isProfitable = profitability && profitability.allTimeProfit > 0
  const profitMargin = profitability && profitability.allTimeRevenue > 0
    ? (profitability.allTimeProfit / profitability.allTimeRevenue) * 100
    : 0

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `AED ${(value / 1000000).toFixed(2)}M`
    } else if (Math.abs(value) >= 1000) {
      return `AED ${(value / 1000).toFixed(1)}k`
    }
    return `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const borderColor = !hasData
    ? 'border-slate-200'
    : isProfitable
    ? 'border-green-300'
    : 'border-red-300'

  const bgColor = !hasData
    ? 'bg-slate-50'
    : isProfitable
    ? 'bg-green-50'
    : 'bg-red-50'

  return (
    <Card className={`hover:shadow-lg transition-all ${borderColor} ${bgColor}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div>
            <h3 className="font-bold text-lg text-slate-900">{vehicle.vehicleNumber}</h3>
            <p className="text-sm text-slate-600">
              {vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : vehicle.vehicleType || 'Vehicle'}
            </p>
          </div>

          {/* Metrics */}
          {hasData ? (
            <>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Revenue</p>
                  <p className="font-semibold text-blue-600">{formatCurrency(profitability!.allTimeRevenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Expenses</p>
                  <p className="font-semibold text-red-600">{formatCurrency(profitability!.allTimeExpenses)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Profit</p>
                  <div className="flex items-center gap-1">
                    {isProfitable ? (
                      <TrendingUp className="w-3 h-3 text-green-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    )}
                    <p className={`font-semibold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(profitability!.allTimeProfit)}
                    </p>
                  </div>
                </div>
              </div>
              {profitMargin !== 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-600">
                    Profit Margin: <span className={`font-semibold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                      {profitMargin.toFixed(1)}%
                    </span>
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-slate-500">No financial data</p>
            </div>
          )}

          {/* Action Button */}
          <Link href={`/vehicle-finances/${vehicle.id}`}>
            <Button variant="outline" className="w-full" size="sm">
              View Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

