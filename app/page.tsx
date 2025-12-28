'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { OverviewCard } from '@/components/overview-card'
import { RevenueTrendChart } from '@/components/revenue-trend-chart'
import { QuickActions } from '@/components/quick-actions'
import {
  FileText,
  Wallet,
  TrendingUp,
  Receipt,
  Car,
  Users,
  Users2,
  CreditCard,
  BarChart3,
} from 'lucide-react'
import {
  getAllQuotes,
  getAllInvoices,
  getAllEmployees,
  getAllPayslips,
  getAdminSettings,
} from '@/lib/storage'
import type { Quote, Payslip, AdminSettings } from '@/lib/types'
import type { Invoice } from '@/lib/storage'

interface HomeMetrics {
  quotationsAndInvoicesThisMonth: number
  outstandingAmount: number
  activeEmployees: number
  payslipsThisMonth: number
}

export default function Home() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
  const [metrics, setMetrics] = useState<HomeMetrics>({
    quotationsAndInvoicesThisMonth: 0,
    outstandingAmount: 0,
    activeEmployees: 0,
    payslipsThisMonth: 0,
  })

  const loadSettings = async () => {
    try {
      const settings = await getAdminSettings()
      if (settings) {
        // Ensure backward compatibility - default to true if not set
        // Handle both boolean and number (0/1) values from database
        const settingsWithDefaults: AdminSettings = {
          ...settings,
          showRevenueTrend: settings.showRevenueTrend !== undefined 
            ? (typeof settings.showRevenueTrend === 'boolean' 
                ? settings.showRevenueTrend 
                : Boolean(settings.showRevenueTrend))
            : true,
          showQuickActions: settings.showQuickActions !== undefined
            ? (typeof settings.showQuickActions === 'boolean'
                ? settings.showQuickActions
                : Boolean(settings.showQuickActions))
            : true,
        }
        setAdminSettings(settingsWithDefaults)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const [quotes, invoices, employees, payslips, settings] = await Promise.all([
          getAllQuotes(),
          getAllInvoices(),
          getAllEmployees(),
          getAllPayslips(),
          getAdminSettings(),
        ])

        await loadSettings()

        // Calculate quotations and invoices this month
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        
        const quotesThisMonth = quotes.filter((quote: Quote) => {
          const quoteDate = new Date(quote.date)
          return quoteDate.getMonth() === currentMonth && quoteDate.getFullYear() === currentYear
        }).length

        const invoicesThisMonth = invoices.filter((invoice: Invoice) => {
          const invoiceDate = new Date(invoice.date)
          return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear
        }).length

        const quotationsAndInvoicesThisMonth = quotesThisMonth + invoicesThisMonth

        // Calculate outstanding amount from pending invoices
        const sentInvoices = invoices.filter((invoice: Invoice) => invoice.status === 'invoice_sent')
        const outstandingAmount = sentInvoices.reduce((sum, invoice: Invoice) => {
          const total = invoice.total || 0
          const amountReceived = invoice.amountReceived || 0
          const pending = total - amountReceived
          return sum + (pending > 0 ? pending : 0)
        }, 0)

        // Calculate active employees
        const activeEmployees = employees.length

        // Calculate payslips this month
        const currentMonthStr = String(currentMonth + 1).padStart(2, '0')
        const payslipsThisMonth = payslips
          .filter((payslip: Payslip) => {
            return payslip.month === currentMonthStr && payslip.year === currentYear
          })
          .reduce((sum: number, payslip: Payslip) => sum + (payslip.netPay || 0), 0)

        setMetrics({
          quotationsAndInvoicesThisMonth,
          outstandingAmount,
          activeEmployees,
          payslipsThisMonth,
        })
      } catch (error) {
        console.error('Error loading metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [])

  // Reload settings when page becomes visible (user navigates back)
  useEffect(() => {
    const handleFocus = () => {
      loadSettings()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Generate last 6 months data (placeholder)
  const generateChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const data = [
      { month: 'Jan', revenue: 30000, expenses: 17000, profit: 13000 },
      { month: 'Feb', revenue: 35000, expenses: 18000, profit: 17000 },
      { month: 'Mar', revenue: 38000, expenses: 19000, profit: 19000 },
      { month: 'Apr', revenue: 42000, expenses: 21000, profit: 21000 },
      { month: 'May', revenue: 44000, expenses: 19500, profit: 24500 },
      { month: 'Jun', revenue: 45230, expenses: 18920, profit: 26310 },
    ]
    return data
  }

  const chartData = generateChartData()
  const juneData = chartData[chartData.length - 1]
  const netProfit = juneData.revenue - juneData.expenses
  const profitMargin = ((netProfit / juneData.revenue) * 100).toFixed(1)

  const quickActions = [
    { label: 'New Quotation', href: '/quotes/create', icon: FileText, color: 'blue' as const },
    { label: 'New Invoice', href: '/invoices/create', icon: Receipt, color: 'green' as const },
    { label: 'Add Vehicle', href: '/vehicles', icon: Car, color: 'green' as const },
    { label: 'Add Customer', href: '/customers', icon: Users, color: 'indigo' as const },
    { label: 'Add Employee', href: '/employees', icon: Users2, color: 'purple' as const },
    { label: 'Process Payment', href: '/invoices', icon: CreditCard, color: 'purple' as const },
    { label: 'View Reports', href: '/reports', icon: BarChart3, color: 'orange' as const },
  ]

  return (
    <div className="min-h-screen relative">
      {/* Background Image - only covers the main content area, not sidebar */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/bg_1.jpg)',
          zIndex: 0,
        }}
      />
      {/* Overlay for better readability */}
      <div 
        className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm"
        style={{ zIndex: 1 }}
      />

      {/* Content Container */}
      <div className="relative z-10">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200 px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-900">Vehicle Rental Management</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back! Here's your business overview</p>
        </div>

        {/* Main Content */}
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
        {/* Quick Actions */}
        {adminSettings && (adminSettings.showQuickActions === true || adminSettings.showQuickActions === undefined) && (
          <QuickActions actions={quickActions} />
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quotations & Invoices Card */}
          <OverviewCard
            icon={FileText}
            title="Quotations & Invoices"
            description="Create, manage, and track all quotes and invoices"
            metrics={[
              {
                label: 'Total This Month',
                value: loading ? '...' : metrics.quotationsAndInvoicesThisMonth,
              },
              {
                label: 'Outstanding',
                value: loading ? '...' : `AED ${metrics.outstandingAmount.toLocaleString()}`,
              },
            ]}
            href="/quotations"
            borderColor="blue"
            iconBgColor="bg-blue-500"
            iconColor="text-white"
          />

          {/* Employee Salaries Card */}
          <OverviewCard
            icon={Wallet}
            title="Employee Salaries"
            description="Manage payroll and employee compensation"
            metrics={[
              {
                label: 'Active Employees',
                value: loading ? '...' : metrics.activeEmployees,
              },
              {
                label: 'This Month',
                value: loading ? '...' : `AED ${metrics.payslipsThisMonth.toLocaleString()}`,
              },
            ]}
            href="/payslips"
            borderColor="green"
            iconBgColor="bg-green-500"
            iconColor="text-white"
          />

          {/* Vehicle Revenue & Expenses Card */}
          <OverviewCard
            icon={TrendingUp}
            title="Vehicle Revenue & Expenses"
            description="Track income and costs for your fleet"
            metrics={[
              {
                label: 'Total Revenue',
                value: 'AED 45,230', // Placeholder
              },
              {
                label: 'Total Expenses',
                value: 'AED 18,920', // Placeholder
              },
            ]}
            borderColor="red"
            iconBgColor="bg-red-500"
            iconColor="text-white"
            showWatermark={true}
          />
        </div>

        {/* Revenue Trend Chart */}
        {adminSettings && (adminSettings.showRevenueTrend === true || adminSettings.showRevenueTrend === undefined) && (
          <RevenueTrendChart
            data={chartData}
            netProfit={netProfit}
            profitMargin={parseFloat(profitMargin)}
          />
        )}
        </div>
      </div>
    </div>
  )
}
