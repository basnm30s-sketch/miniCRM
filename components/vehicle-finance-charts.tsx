'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface VehicleFinanceChartsProps {
  monthlyTrend: Array<{ month: string, revenue: number, expenses: number, profit: number }>
  topVehiclesByProfit: Array<{ vehicleId: string, vehicleNumber: string, profit: number }>
  expensesByCategory: Record<string, number>
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']

export function VehicleFinanceCharts({
  monthlyTrend,
  topVehiclesByProfit,
  expensesByCategory,
}: VehicleFinanceChartsProps) {
  // Format monthly trend data for chart
  const trendData = monthlyTrend.map(item => ({
    month: item.month,
    revenue: item.revenue,
    expenses: item.expenses,
    profit: item.profit,
  }))

  // Format month labels
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return monthNames[parseInt(monthNum) - 1] || month
  }

  // Format profit by vehicle data
  const profitData = topVehiclesByProfit.map(v => ({
    name: v.vehicleNumber.length > 12 ? v.vehicleNumber.substring(0, 12) + '...' : v.vehicleNumber,
    profit: v.profit,
  }))

  // Format expense category data for pie chart
  const categoryData = Object.entries(expensesByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: AED {Math.abs(entry.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue vs Expenses Trend */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Revenue vs Expenses Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
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
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Revenue"
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeWidth={2}
              name="Expenses"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Profit by Vehicle */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Top Vehicles by Profit</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={profitData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `AED ${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="profit" fill="#22c55e" name="Profit" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expense Category Breakdown */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 lg:col-span-2">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Expense Category Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

