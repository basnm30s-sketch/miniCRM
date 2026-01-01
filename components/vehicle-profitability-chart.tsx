'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { VehicleProfitability } from '@/lib/types'

interface VehicleProfitabilityChartProps {
  data: VehicleProfitability[]
}

export function VehicleProfitabilityChart({ data }: VehicleProfitabilityChartProps) {
  // Generate last 12 months from current month (rolling 12 months)
  const now = new Date()
  const allMonths: string[] = []
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth() + 1
    allMonths.push(`${year}-${String(month).padStart(2, '0')}`)
  }

  // Normalize month format to YYYY-MM
  const normalizeMonth = (month: string | number): string => {
    if (typeof month === 'number') {
      // This shouldn't happen, but handle it
      return `${month}`
    }
    // Ensure format is YYYY-MM (e.g., "2025-1" -> "2025-01")
    const parts = month.split('-')
    if (parts.length === 2) {
      const year = parts[0]
      const monthNum = parts[1].padStart(2, '0')
      return `${year}-${monthNum}`
    }
    return month
  }

  // Create a map of existing data by month
  const dataMap = new Map<string, { revenue: number; expenses: number; profit: number }>()
  if (data && Array.isArray(data) && data.length > 0) {
    data.forEach(item => {
      if (item && item.month) {
        // Normalize month format to ensure exact matching
        const monthKey = normalizeMonth(item.month)
        // Handle both property name formats (totalRevenue/totalExpenses vs revenue/expenses)
        const revenue = item.totalRevenue !== undefined ? item.totalRevenue : (item.revenue || 0)
        const expenses = item.totalExpenses !== undefined ? item.totalExpenses : (item.expenses || 0)
        const profit = item.profit !== undefined ? item.profit : (revenue - expenses)
        
        dataMap.set(monthKey, {
          revenue,
          expenses,
          profit,
        })
      }
    })
  }

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('VehicleProfitabilityChart - Received data:', data)
    if (data && data.length > 0) {
      console.log('VehicleProfitabilityChart - Sample item:', data[0])
      console.log('VehicleProfitabilityChart - DataMap:', Array.from(dataMap.entries()))
    }
    console.log('VehicleProfitabilityChart - AllMonths:', allMonths)
  }

  // Format data for chart - include all 12 months, with 0 for months without data
  const chartData = allMonths.map(month => {
    const existing = dataMap.get(month)
    const result = {
      month,
      revenue: existing?.revenue || 0,
      expenses: existing?.expenses || 0,
      profit: existing?.profit || 0,
    }
    return result
  })

  // Debug logging for chart data
  if (process.env.NODE_ENV === 'development') {
    console.log('VehicleProfitabilityChart - ChartData:', chartData)
    console.log('VehicleProfitabilityChart - ChartData sample (first 3):', chartData.slice(0, 3))
    console.log('VehicleProfitabilityChart - ChartData sample (last 3):', chartData.slice(-3))
  }

  // Ensure chartData is valid
  if (!chartData || chartData.length === 0) {
    console.warn('VehicleProfitabilityChart: No chart data available')
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <p className="text-slate-500 text-center">No data available for chart</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const formattedLabel = formatMonth(label)
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{formattedLabel}</p>
          {payload.map((entry: any, index: number) => {
            const value = entry.value || 0
            const isProfit = entry.name === 'profit' || entry.dataKey === 'profit'
            const isLoss = isProfit && value < 0
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name === 'revenue' || entry.dataKey === 'revenue'
                  ? 'Revenue'
                  : entry.name === 'expenses' || entry.dataKey === 'expenses'
                  ? 'Expenses'
                  : entry.name === 'profit' || entry.dataKey === 'profit'
                  ? (isLoss ? 'Loss' : 'Profit')
                  : entry.name}: AED {Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  const formatMonth = (value: string) => {
    const [year, month] = value.split('-')
    const monthNum = parseInt(month, 10)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthName = monthNames[monthNum - 1] || month
    // Format as MMM-YY (e.g., "Jan-25", "Feb-25")
    const yearShort = year.slice(-2) // Get last 2 digits of year
    return `${monthName}-${yearShort}`
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <Tabs defaultValue="revenue-expenses" className="w-full">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Month-on-Month Profitability</h3>
            <p className="text-sm text-slate-500">Revenue, expenses, and profit over time</p>
          </div>
          <TabsList>
            <TabsTrigger value="revenue-expenses">Revenue & Expenses</TabsTrigger>
            <TabsTrigger value="profit-loss">Profit/Loss</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="revenue-expenses" className="space-y-4">
          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-slate-700 font-medium">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-slate-700 font-medium">Expenses</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                stroke="#64748b"
                style={{ fontSize: '12px' }}
                tickFormatter={formatMonth}
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `AED ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" yAxisId="left" />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" yAxisId="left" />
              <Line
                type="linear"
                dataKey="profit"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', r: 3 }}
                activeDot={{ r: 5 }}
                name="Profit/Loss"
                yAxisId="left"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="profit-loss" className="space-y-4">
          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-slate-700 font-medium">Profit/Loss</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                stroke="#64748b"
                style={{ fontSize: '12px' }}
                tickFormatter={formatMonth}
              />
              <YAxis
                stroke="#64748b"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `AED ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
              <Line
                type="linear"
                dataKey="profit"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ fill: '#22c55e', r: 4 }}
                activeDot={{ r: 6 }}
                name="Profit/Loss"
              />
            </LineChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    </div>
  )
}

