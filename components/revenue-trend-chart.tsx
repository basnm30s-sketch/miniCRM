'use client'

import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'

interface ChartData {
  month: string
  revenue: number
  expenses: number
  profit: number
}

interface RevenueTrendChartProps {
  data: ChartData[]
  netProfit: number
  profitMargin: number
}

export function RevenueTrendChart({ data, netProfit, profitMargin }: RevenueTrendChartProps) {
  // Calculate profit for each data point if not already present
  const dataWithProfit = data.map((item) => ({
    ...item,
    profit: item.profit !== undefined ? item.profit : item.revenue - item.expenses,
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const value = entry.value
            const isProfit = entry.name === 'Profit'
            const isLoss = isProfit && value < 0
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name === 'Revenue' 
                  ? 'Revenue' 
                  : entry.name === 'Expenses'
                  ? 'Expenses'
                  : entry.name === 'Profit'
                  ? (isLoss ? 'Loss' : 'Profit')
                  : entry.name.toLowerCase()}: AED ${Math.abs(value).toLocaleString()}
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 relative">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">Revenue Trend</h3>
        <p className="text-sm text-slate-500">Last 6 months performance</p>
      </div>

      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-sm text-slate-700 font-medium">Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-sm text-slate-700 font-medium">Expenses</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-sm text-slate-700 font-medium">Profit/Loss</span>
        </div>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={dataWithProfit} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="month"
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => value.substring(0, 3)}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => {
              const absValue = Math.abs(value)
              return value < 0 ? `-AED ${absValue / 1000}k` : `AED ${absValue / 1000}k`
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" strokeWidth={1} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            name="Revenue"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="#ef4444"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorExpenses)"
            name="Expenses"
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
            name="Profit"
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>

      {/* KPIs */}
      <div className="mt-6 flex gap-8 pt-6 border-t border-slate-200">
        <div>
          <p className="text-sm text-slate-600 mb-1">Net Profit (June)</p>
          <p className="text-2xl font-bold text-green-600">AED {netProfit.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-slate-600 mb-1">Profit Margin</p>
          <p className="text-2xl font-bold text-blue-600">{profitMargin}%</p>
        </div>
      </div>
    </div>
  )
}

