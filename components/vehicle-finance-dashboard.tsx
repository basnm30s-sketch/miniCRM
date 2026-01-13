'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VehicleFinanceKPICard } from './vehicle-finance-kpi-card'
import { VehicleFinanceCharts } from './vehicle-finance-charts'
import { TrendingUp, TrendingDown, DollarSign, Car, Users, Tag, Calendar, BarChart3 } from 'lucide-react'

interface DashboardData {
  overall: {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    profitMargin: number
    avgRevenuePerVehicle: number
    avgProfitPerVehicle: number
    totalTransactions: number
    avgTransactionValue: number
  }
  timeBased: {
    currentMonth: { revenue: number, expenses: number, profit: number }
    lastMonth: { revenue: number, expenses: number, profit: number }
    momGrowth: { revenue: number, expenses: number, profit: number }
    ytd: { revenue: number, expenses: number, profit: number }
    monthlyTrend: Array<{ month: string, revenue: number, expenses: number, profit: number }>
  }
  vehicleBased: {
    totalActive: number
    profitable: number
    lossMaking: number
    noData: number
    topByRevenue: Array<{ vehicleId: string, vehicleNumber: string, revenue: number }>
    topByProfit: Array<{ vehicleId: string, vehicleNumber: string, profit: number }>
    bottomByProfit: Array<{ vehicleId: string, vehicleNumber: string, profit: number }>
  }
  customerBased: {
    totalUnique: number
    topByRevenue: Array<{ customerId: string, customerName: string, revenue: number }>
    avgRevenuePerCustomer: number
  }
  categoryBased: {
    revenueByCategory: Record<string, number>
    expensesByCategory: Record<string, number>
    topExpenseCategory: string
  }
  operational: {
    revenuePerVehiclePerMonth: number
    expenseRatio: number
    mostActiveVehicle: { vehicleId: string, vehicleNumber: string, transactionCount: number }
    avgTransactionsPerVehicle: number
  }
}

export interface DashboardVisibleSections {
  overallKeyMetrics: boolean
  overallSecondaryStats: boolean
  dimensions: boolean
  charts: boolean
}

interface VehicleFinanceDashboardProps {
  data: DashboardData
  visibleSections?: DashboardVisibleSections
}

export function VehicleFinanceDashboard({
  data,
  visibleSections = {
    overallKeyMetrics: true,
    overallSecondaryStats: true,
    dimensions: true,
    charts: true
  }
}: VehicleFinanceDashboardProps) {
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `AED ${(value / 1000000).toFixed(2)}M`
    } else if (Math.abs(value) >= 1000) {
      return `AED ${(value / 1000).toFixed(1)}k`
    }
    return `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      {/* Overall Financial Snapshot */}
      {(visibleSections.overallKeyMetrics || visibleSections.overallSecondaryStats) && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Overall Financial Snapshot</h2>
          {visibleSections.overallKeyMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <VehicleFinanceKPICard
                title="Total Revenue"
                value={data.overall.totalRevenue}
                trend={{
                  value: data.timeBased.momGrowth.revenue,
                  isPositive: data.timeBased.momGrowth.revenue >= 0,
                }}
                subtitle="All vehicles"
                icon={<DollarSign className="w-5 h-5" />}
                color="blue"
                size="large"
              />
              <VehicleFinanceKPICard
                title="Total Expenses"
                value={data.overall.totalExpenses}
                trend={{
                  value: data.timeBased.momGrowth.expenses,
                  isPositive: data.timeBased.momGrowth.expenses <= 0, // Lower is better for expenses
                }}
                subtitle="All vehicles"
                icon={<TrendingDown className="w-5 h-5" />}
                color="red"
                size="large"
              />
              <VehicleFinanceKPICard
                title="Net Profit"
                value={data.overall.netProfit}
                trend={{
                  value: data.timeBased.momGrowth.profit,
                  isPositive: data.timeBased.momGrowth.profit >= 0,
                }}
                subtitle="All vehicles"
                icon={<TrendingUp className="w-5 h-5" />}
                color="green"
                size="large"
              />
            </div>
          )}
          {visibleSections.overallSecondaryStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <VehicleFinanceKPICard
                title="Profit Margin"
                value={`${data.overall.profitMargin.toFixed(1)}%`}
                icon={<BarChart3 className="w-4 h-4" />}
                color="green"
                size="small"
              />
              <VehicleFinanceKPICard
                title="Avg Revenue/Vehicle"
                value={data.overall.avgRevenuePerVehicle}
                icon={<Car className="w-4 h-4" />}
                color="blue"
                size="small"
              />
              <VehicleFinanceKPICard
                title="Avg Profit/Vehicle"
                value={data.overall.avgProfitPerVehicle}
                icon={<TrendingUp className="w-4 h-4" />}
                color="green"
                size="small"
              />
              <VehicleFinanceKPICard
                title="Total Transactions"
                value={data.overall.totalTransactions}
                icon={<DollarSign className="w-4 h-4" />}
                color="purple"
                size="small"
              />
              <VehicleFinanceKPICard
                title="Avg Transaction Value"
                value={data.overall.avgTransactionValue}
                icon={<DollarSign className="w-4 h-4" />}
                color="orange"
                size="small"
              />
            </div>
          )}
        </div>
      )}

      {/* Dimension-Based Metrics */}
      {visibleSections.dimensions && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vehicle-Based Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="w-4 h-4" />
                Vehicle Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Active Vehicles</p>
                <p className="text-2xl font-bold text-slate-900">{data.vehicleBased.totalActive}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-slate-600">Profitable</p>
                  <p className="font-semibold text-green-600">{data.vehicleBased.profitable}</p>
                </div>
                <div>
                  <p className="text-slate-600">Loss-Making</p>
                  <p className="font-semibold text-red-600">{data.vehicleBased.lossMaking}</p>
                </div>
              </div>
              {data.vehicleBased.topByProfit.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-600 mb-2">Top by Profit:</p>
                  <div className="space-y-1">
                    {data.vehicleBased.topByProfit.slice(0, 3).map((v, idx) => (
                      <div key={v.vehicleId} className="flex justify-between text-xs">
                        <span className="text-slate-700">{idx + 1}. {v.vehicleNumber}</span>
                        <span className="font-medium text-green-600">{formatCurrency(v.profit)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer-Based Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Customer Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Total Customers</p>
                <p className="text-2xl font-bold text-slate-900">{data.customerBased.totalUnique}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Avg Revenue/Customer</p>
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(data.customerBased.avgRevenuePerCustomer)}</p>
              </div>
              {data.customerBased.topByRevenue.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-600 mb-2">Top Customers:</p>
                  <div className="space-y-1">
                    {data.customerBased.topByRevenue.slice(0, 3).map((c, idx) => (
                      <div key={c.customerId} className="flex justify-between text-xs">
                        <span className="text-slate-700 truncate">{idx + 1}. {c.customerName}</span>
                        <span className="font-medium text-blue-600 ml-2">{formatCurrency(c.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category-Based Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Category Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Top Expense Category</p>
                <p className="text-lg font-semibold text-slate-900">{data.categoryBased.topExpenseCategory}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Categories</p>
                <p className="text-lg font-semibold text-slate-900">
                  {Object.keys(data.categoryBased.expensesByCategory).length} expense
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs font-medium text-slate-600 mb-2">Top Expenses:</p>
                <div className="space-y-1">
                  {Object.entries(data.categoryBased.expensesByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([category, amount], idx) => (
                      <div key={category} className="flex justify-between text-xs">
                        <span className="text-slate-700">{idx + 1}. {category}</span>
                        <span className="font-medium text-red-600">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time-Based Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Time Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Current Month Profit</p>
                <p className={`text-2xl font-bold ${data.timeBased.currentMonth.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(data.timeBased.currentMonth.profit)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-slate-600">Revenue</p>
                  <p className="font-semibold text-blue-600">{formatCurrency(data.timeBased.currentMonth.revenue)}</p>
                </div>
                <div>
                  <p className="text-slate-600">Expenses</p>
                  <p className="font-semibold text-red-600">{formatCurrency(data.timeBased.currentMonth.expenses)}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs font-medium text-slate-600 mb-2">YTD Totals:</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-700">Revenue</span>
                    <span className="font-medium text-blue-600">{formatCurrency(data.timeBased.ytd.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Profit</span>
                    <span className="font-medium text-green-600">{formatCurrency(data.timeBased.ytd.profit)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {visibleSections.charts && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Visualizations</h2>
          <VehicleFinanceCharts
            monthlyTrend={data.timeBased.monthlyTrend}
            topVehiclesByProfit={data.vehicleBased.topByProfit}
            expensesByCategory={data.categoryBased.expensesByCategory}
          />
        </div>
      )}
    </div>
  )
}

