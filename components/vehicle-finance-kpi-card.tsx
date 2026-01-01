'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface VehicleFinanceKPICardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange'
  size?: 'large' | 'medium' | 'small'
}

export function VehicleFinanceKPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
  size = 'medium',
}: VehicleFinanceKPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  }

  const valueSizeClasses = {
    large: 'text-3xl',
    medium: 'text-2xl',
    small: 'text-xl',
  }

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (Math.abs(val) >= 1000000) {
        return `AED ${(val / 1000000).toFixed(2)}M`
      } else if (Math.abs(val) >= 1000) {
        return `AED ${(val / 1000).toFixed(1)}k`
      }
      return `AED ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return val
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
            <p className={`font-bold ${valueSizeClasses[size]} text-slate-900 mb-1`}>
              {formatValue(value)}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-500">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.isPositive ? '+' : ''}{trend.value.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

