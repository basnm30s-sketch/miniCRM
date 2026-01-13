'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { OverviewCard } from '@/components/overview-card'
import { RevenueTrendChart } from '@/components/revenue-trend-chart'
import { QuickActions } from '@/components/quick-actions'
import { DirhamIcon } from '@/components/icons/dirham-icon'
import {
  FileText,
  Wallet,
  TrendingUp,
  Car,
  Users,
  Users2,
  CreditCard,
  BarChart3,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  Percent,
  CalendarDays,
  Banknote,
} from 'lucide-react'
import {
  getAllQuotes,
  getAllInvoices,
  getAllEmployees,
  getAllPayslips,
  getAllCustomers,
  getAdminSettings,
  getAllVehicleTransactions,
  getAllVehicles,
} from '@/lib/storage'
import type { Quote, Payslip, AdminSettings, Customer } from '@/lib/types'
import type { Invoice } from '@/lib/storage'

interface HomeMetrics {
  quotationsAndInvoicesThisMonth: number
  outstandingAmount: number
  activeEmployees: number
  payslipsThisMonth: number
  totalQuotes: number
  totalInvoices: number
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  totalCustomers: number
  paidInvoices: number
  pendingInvoices: number
  totalQuoteValue: number
  quotesThisMonth: number
  invoicesThisMonth: number
  amountReceived: number
  outstandingInvoiceAmount: number
}

interface Activity {
  type: 'quote' | 'invoice' | 'payslip' | 'employee' | 'customer'
  description: string
  timestamp: string
  createdAt: string
}

interface CustomerStats {
  customerId: string
  customerName: string
  quoteCount: number
  invoiceCount: number
  quoteValue: number
  invoiceValue: number
  outstanding: number
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
    totalQuotes: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalCustomers: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    totalQuoteValue: 0,
    quotesThisMonth: 0,
    invoicesThisMonth: 0,
    amountReceived: 0,
    outstandingInvoiceAmount: 0,
  })
  const [customerStats, setCustomerStats] = useState<CustomerStats[]>([])
  const [activities, setActivities] = useState<Activity[]>([])

  const loadSettings = async () => {
    try {
      const settings = await getAdminSettings()
      if (settings) {
        // Default to false if not set
        // Handle both boolean and number (0/1) values from database
        const settingsWithDefaults: AdminSettings = {
          ...settings,
          showRevenueTrend: settings.showRevenueTrend !== undefined
            ? (typeof settings.showRevenueTrend === 'boolean'
              ? settings.showRevenueTrend
              : Boolean(settings.showRevenueTrend))
            : false,
          showQuickActions: settings.showQuickActions !== undefined
            ? (typeof settings.showQuickActions === 'boolean'
              ? settings.showQuickActions
              : Boolean(settings.showQuickActions))
            : false,
          showReports: settings.showReports !== undefined
            ? (typeof settings.showReports === 'boolean'
              ? settings.showReports
              : Boolean(settings.showReports))
            : false,
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
        const [quotes, invoices, employees, payslips, customers, settings, vehicleTransactions, vehicles] = await Promise.all([
          getAllQuotes(),
          getAllInvoices(),
          getAllEmployees(),
          getAllPayslips(),
          getAllCustomers(),
          getAdminSettings(),
          getAllVehicleTransactions(),
          getAllVehicles(),
        ])

        await loadSettings()

        // Calculate quotations and invoices this month
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        // Helper function to parse date and check if it's in current month
        const isInCurrentMonth = (dateString: string): boolean => {
          try {
            const date = new Date(dateString)
            // Check if date is valid
            if (isNaN(date.getTime())) return false
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear
          } catch {
            return false
          }
        }

        const quotesThisMonth = quotes.filter((quote: Quote) =>
          isInCurrentMonth(quote.date)
        ).length

        const invoicesThisMonth = invoices.filter((invoice: Invoice) =>
          isInCurrentMonth(invoice.date)
        ).length

        const quotationsAndInvoicesThisMonth = quotesThisMonth + invoicesThisMonth

        // Calculate total quote value this month (replacing outstanding)
        const quotesThisMonthList = quotes.filter((quote: Quote) =>
          isInCurrentMonth(quote.date)
        )
        const totalQuoteValueThisMonth = quotesThisMonthList.reduce((sum: number, quote: Quote) => {
          return sum + (quote.total || 0)
        }, 0)

        // Calculate active employees
        const activeEmployees = employees.length

        // Calculate payslips this month
        // Payslip month is stored in YYYY-MM format (e.g., "2024-01")
        const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
        const payslipsThisMonth = payslips
          .filter((payslip: Payslip) => {
            return payslip.month === currentMonthStr
          })
          .reduce((sum: number, payslip: Payslip) => sum + (payslip.netPay || 0), 0)

        // Calculate total quotes and invoices (all time)
        const totalQuotes = quotes.length
        const totalInvoicesAllTime = invoices.length

        // Calculate total revenue from all invoices
        const invoiceRevenue = invoices.reduce((sum: number, invoice: Invoice) => {
          return sum + (invoice.total || 0)
        }, 0)

        // Calculate vehicle revenue and expenses from transactions
        const vehicleRevenue = (vehicleTransactions || [])
          .filter(t => t.transactionType === 'revenue')
          .reduce((sum, t) => sum + (t.amount || 0), 0)
        
        const vehicleExpenses = (vehicleTransactions || [])
          .filter(t => t.transactionType === 'expense')
          .reduce((sum, t) => sum + (t.amount || 0), 0)

        // Total revenue = invoice revenue + vehicle revenue
        const totalRevenue = invoiceRevenue + vehicleRevenue
        
        // Total expenses = vehicle expenses (invoices are revenue, not expenses)
        const totalExpenses = vehicleExpenses
        
        const netProfit = totalRevenue - totalExpenses

        // Calculate total quote value
        const totalQuoteValue = quotes.reduce((sum: number, quote: Quote) => {
          return sum + (quote.total || 0)
        }, 0)

        // Calculate invoice status counts
        const paidInvoices = invoices.filter((invoice: Invoice) =>
          invoice.status === 'payment_received'
        ).length
        const pendingInvoices = invoices.filter((invoice: Invoice) =>
          invoice.status === 'invoice_sent' && (invoice.amountReceived || 0) < (invoice.total || 0)
        ).length

        // Calculate amount received from all invoices
        const amountReceived = invoices.reduce((sum: number, invoice: Invoice) => {
          return sum + (invoice.amountReceived || 0)
        }, 0)

        // Calculate outstanding invoice amount (unpaid balance from sent invoices)
        const outstandingInvoiceAmount = invoices.reduce((sum: number, invoice: Invoice) => {
          if (invoice.status === 'invoice_sent') {
            const pending = (invoice.total || 0) - (invoice.amountReceived || 0)
            return sum + (pending > 0 ? pending : 0)
          }
          return sum
        }, 0)

        // Calculate customer-wise statistics
        const customerStatsMap = new Map<string, CustomerStats>()

        // Process quotes
        quotes.forEach((quote: Quote) => {
          const customerId = quote.customer?.id || ''
          const customerName = quote.customer?.company || quote.customer?.name || 'Unknown'

          if (!customerStatsMap.has(customerId)) {
            customerStatsMap.set(customerId, {
              customerId,
              customerName,
              quoteCount: 0,
              invoiceCount: 0,
              quoteValue: 0,
              invoiceValue: 0,
              outstanding: 0,
            })
          }

          const stats = customerStatsMap.get(customerId)!
          stats.quoteCount++
          stats.quoteValue += quote.total || 0
        })

        // Process invoices
        invoices.forEach((invoice: Invoice) => {
          const customerId = invoice.customerId || ''
          const customer = customers.find((c: Customer) => c.id === customerId)
          const customerName = customer?.company || customer?.name || 'Unknown'

          if (!customerStatsMap.has(customerId)) {
            customerStatsMap.set(customerId, {
              customerId,
              customerName,
              quoteCount: 0,
              invoiceCount: 0,
              quoteValue: 0,
              invoiceValue: 0,
              outstanding: 0,
            })
          }

          const stats = customerStatsMap.get(customerId)!
          stats.invoiceCount++
          stats.invoiceValue += invoice.total || 0

          // Calculate outstanding
          if (invoice.status === 'invoice_sent') {
            const pending = (invoice.total || 0) - (invoice.amountReceived || 0)
            stats.outstanding += pending > 0 ? pending : 0
          }
        })

        const customerStatsList = Array.from(customerStatsMap.values())
          .sort((a, b) => (b.invoiceValue + b.quoteValue) - (a.invoiceValue + a.quoteValue))
          .slice(0, 5) // Top 5 customers

        setCustomerStats(customerStatsList)

        setMetrics({
          quotationsAndInvoicesThisMonth,
          outstandingAmount: totalQuoteValueThisMonth, // Now stores total quote value this month
          activeEmployees,
          payslipsThisMonth: payslipsThisMonth,
          totalQuotes,
          totalInvoices: totalInvoicesAllTime, // All invoices count
          totalRevenue,
          totalExpenses,
          netProfit,
          totalCustomers: customers.length,
          paidInvoices,
          pendingInvoices,
          totalQuoteValue,
          quotesThisMonth,
          invoicesThisMonth,
          amountReceived,
          outstandingInvoiceAmount,
        })

        // Build activities list
        const activitiesList: Activity[] = []

        // Add quote activities
        quotes.forEach((quote: Quote) => {
          const customerName = quote.customer?.company || quote.customer?.name || 'Unknown'
          activitiesList.push({
            type: 'quote',
            description: `${quote.number} created for ${customerName}, value = AED ${(quote.total || 0).toLocaleString()}`,
            timestamp: quote.createdAt || quote.date || '',
            createdAt: quote.createdAt || quote.date || '',
          })
        })

        // Add invoice activities
        invoices.forEach((invoice: Invoice) => {
          const customer = customers.find((c: Customer) => c.id === invoice.customerId)
          const customerName = customer?.company || customer?.name || 'Unknown'
          activitiesList.push({
            type: 'invoice',
            description: `${invoice.number} created for ${customerName}, value = AED ${(invoice.total || 0).toLocaleString()}`,
            timestamp: invoice.createdAt || invoice.date || '',
            createdAt: invoice.createdAt || invoice.date || '',
          })
        })

        // Add payslip activities
        payslips.forEach((payslip: Payslip) => {
          const employee = employees.find((e) => e.id === payslip.employeeId)
          const employeeName = employee?.name || 'Unknown'
          const monthDisplay = payslip.month ? formatMonthForActivity(payslip.month) : 'Unknown Month'
          activitiesList.push({
            type: 'payslip',
            description: `Payslip generated for ${employeeName} (${monthDisplay}), net pay = AED ${(payslip.netPay || 0).toLocaleString()}`,
            timestamp: payslip.createdAt || '',
            createdAt: payslip.createdAt || '',
          })
        })

        // Add employee activities
        employees.forEach((employee) => {
          activitiesList.push({
            type: 'employee',
            description: `Employee ${employee.name} added`,
            timestamp: employee.createdAt || '',
            createdAt: employee.createdAt || '',
          })
        })

        // Add customer activities
        customers.forEach((customer: Customer) => {
          const customerName = customer.company || customer.name || 'Unknown'
          activitiesList.push({
            type: 'customer',
            description: `Customer ${customerName} added`,
            timestamp: customer.createdAt || '',
            createdAt: customer.createdAt || '',
          })
        })

        // Sort by timestamp (most recent first) and take latest 5
        const sortedActivities = activitiesList
          .filter(a => a.createdAt) // Only include activities with timestamps
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)

        setActivities(sortedActivities)
      } catch (error) {
        console.error('Error loading metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [])

  const formatMonthForActivity = (month: string): string => {
    if (!month) return 'Unknown'
    try {
      const [year, monthNum] = month.split('-')
      const date = new Date(parseInt(year), parseInt(monthNum) - 1)
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } catch {
      return month
    }
  }

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
    { label: 'New Invoice', href: '/invoices/create', icon: CreditCard, color: 'green' as const },
    { label: 'Add Vehicle', href: '/vehicles', icon: Car, color: 'green' as const },
    { label: 'Add Customer', href: '/customers', icon: Users, color: 'indigo' as const },
    { label: 'Add Employee', href: '/employees', icon: Users2, color: 'purple' as const },
    { label: 'Process Payment', href: '/invoices', icon: CreditCard, color: 'purple' as const },
    { label: 'View Reports', href: '/reports', icon: BarChart3, color: 'orange' as const },
  ]

  return (
    <div className="min-h-screen relative bg-slate-200">
      {/* Background Image - only covers the main content area, not sidebar
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/bg_1.jpg)',
          zIndex: 0,
        }}
      />
      {/* Overlay for better readability - reduced opacity and blur 
      <div
        className="absolute inset-0 bg-slate-50/40"
        style={{ zIndex: 1 }}
      /> */}

      {/* Content Container */}
      <div className="relative z-10">
        
        {/* Watermark logo in header background
          <div className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.10]">
            <Image
              src="/almsar-logo.png"
              alt=""
              width={220}
              height={220}
              className="w-[180px] md:w-[220px] h-auto object-contain"
              priority
            />
          </div>

           <div className="relative">
            <h1 className="text-2xl font-bold text-slate-900">iManage</h1>
            <p className="mt-1 text-base md:text-lg font-medium text-slate-700">
              Manage More. Worry Less.
            </p>
          </div> 
        </div> */}

        {/* Main Content */}
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
          {/* Quick Actions */}
          {adminSettings && (adminSettings.showQuickActions === true || adminSettings.showQuickActions === undefined) && (
            <QuickActions actions={quickActions} />
          )}

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quotations & Invoices Card */}
            <OverviewCard
              icon={FileText}
              title="Quotations & Invoices"
              description="Create, manage, and track all quotes and invoices"
              metrics={[]}
              quoteMetrics={[
                {
                  label: 'Total Quotes',
                  value: loading ? '...' : metrics.totalQuotes,
                },
                {
                  label: 'This Month',
                  value: loading ? '...' : metrics.quotesThisMonth,
                },
                {
                  label: 'Total Value',
                  value: loading ? '...' : `AED ${metrics.totalQuoteValue.toLocaleString()}`,
                },
                {
                  label: 'Value This Month',
                  value: loading ? '...' : `AED ${metrics.outstandingAmount.toLocaleString()}`,
                },
              ]}
              invoiceMetrics={[
                {
                  label: 'Total Invoices',
                  value: loading ? '...' : metrics.totalInvoices,
                },
                {
                  label: 'This Month',
                  value: loading ? '...' : metrics.invoicesThisMonth,
                },
                {
                  label: 'Payment Received',
                  value: loading ? '...' : metrics.paidInvoices,
                },
                {
                  label: 'Pending',
                  value: loading ? '...' : metrics.pendingInvoices,
                },
              ]}
              quoteHref="/quotations"
              invoiceHref="/invoices"
              borderColor="blue"
              iconBgColor="bg-blue-50"
              iconColor="text-blue-600"
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
                {
                  label: 'Avg per Employee',
                  value: loading ? '...' : metrics.activeEmployees > 0
                    ? `AED ${Math.round(metrics.payslipsThisMonth / metrics.activeEmployees).toLocaleString()}`
                    : 'AED 0',
                },
              ]}
              href="/payslips"
              borderColor="green"
              iconBgColor="bg-emerald-50"
              iconColor="text-emerald-600"
            />

            {/* Vehicle Revenue & Expenses Card */}
            <OverviewCard
              icon={TrendingUp}
              title="Vehicle Revenue & Expenses"
              description="Track income and costs for your fleet"
              metrics={[
                {
                  label: 'Total Revenue',
                  value: loading ? '...' : `AED ${metrics.totalRevenue.toLocaleString()}`,
                },
                {
                  label: 'Total Expenses',
                  value: loading ? '...' : `AED ${metrics.totalExpenses.toLocaleString()}`,
                },
                {
                  label: 'Net Profit',
                  value: loading ? '...' : `AED ${metrics.netProfit.toLocaleString()}`,
                },
                {
                  label: 'Profit Margin',
                  value: loading ? '...' : metrics.totalRevenue > 0
                    ? `${((metrics.netProfit / metrics.totalRevenue) * 100).toFixed(1)}%`
                    : '0%',
                },
              ]}
              href="/vehicle-finances"
              borderColor="purple"
              iconBgColor="bg-purple-50"
              iconColor="text-purple-600"
            />
          </div>

          {/* Dashboard KPI Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Activity This Month */}
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">Activity This Month</h3>
              <div className="space-y-2">
                {/* Quotes This Month */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-600 leading-4">Quotes This Month</p>
                      <p className="text-lg font-bold text-indigo-600 leading-6">
                        {loading ? '...' : metrics.quotesThisMonth}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Invoices This Month */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-cyan-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-600 leading-4">Invoices This Month</p>
                      <p className="text-lg font-bold text-cyan-600 leading-6">
                        {loading ? '...' : metrics.invoicesThisMonth}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Amount Received */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                      <DirhamIcon className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-600 leading-4">Amount Received</p>
                      <p className="text-lg font-bold text-green-600 leading-6">
                        {loading ? '...' : `AED ${metrics.amountReceived.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payroll This Month */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                      <Banknote className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-600 leading-4">Payroll This Month</p>
                      <p className="text-lg font-bold text-violet-600 leading-6">
                        {loading ? '...' : `AED ${metrics.payslipsThisMonth.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Financial Health */}
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">Financial Health</h3>
              <div className="space-y-2">
                {/* Total Revenue */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-600 leading-4">Total Revenue</p>
                      <p className="text-lg font-bold text-emerald-600 leading-6">
                        {loading ? '...' : `AED ${metrics.totalRevenue.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Net Profit */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-600 leading-4">Net Profit</p>
                      <p className="text-lg font-bold text-green-600 leading-6">
                        {loading ? '...' : `AED ${metrics.netProfit.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Profit Margin */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-lime-100 rounded-lg flex items-center justify-center shrink-0">
                      <Percent className="w-4 h-4 text-lime-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-600 leading-4">Profit Margin</p>
                      <p className="text-lg font-bold text-lime-600 leading-6">
                        {loading ? '...' : metrics.totalRevenue > 0
                          ? `${((metrics.netProfit / metrics.totalRevenue) * 100).toFixed(1)}%`
                          : '0%'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Outstanding Amount */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-600 leading-4">Outstanding Amount</p>
                      <p className="text-lg font-bold text-amber-600 leading-6">
                        {loading ? '...' : `AED ${metrics.outstandingInvoiceAmount.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Business Overview */}
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">Business Overview</h3>
              <div className="space-y-2">
                {/* Total Customers */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-600 leading-4">Total Customers</p>
                      <p className="text-lg font-bold text-blue-600 leading-6">
                        {loading ? '...' : metrics.totalCustomers}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Quote Value */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-600 leading-4">Total Quote Value</p>
                      <p className="text-lg font-bold text-purple-600 leading-6">
                        {loading ? '...' : `AED ${metrics.totalQuoteValue.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pending Invoices */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-600 leading-4">Pending Invoices</p>
                      <p className="text-lg font-bold text-orange-600 leading-6">
                        {loading ? '...' : metrics.pendingInvoices}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Active Employees */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
                      <Users2 className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-600 leading-4">Active Employees</p>
                      <p className="text-lg font-bold text-teal-600 leading-6">
                        {loading ? '...' : metrics.activeEmployees}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Trend Chart */}
          {adminSettings && (adminSettings.showRevenueTrend === true || adminSettings.showRevenueTrend === undefined) && (
            <RevenueTrendChart
              data={chartData}
              netProfit={netProfit}
              profitMargin={parseFloat(profitMargin)}
            />
          )}

          {/* Customer Statistics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Customers by Value */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Top Customers by Value
                </h3>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <p className="text-slate-500 text-sm">Loading...</p>
                ) : customerStats.length > 0 ? (
                  customerStats.map((customer, index) => (
                    <div key={customer.customerId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{customer.customerName}</p>
                          <p className="text-xs text-slate-500">
                            {customer.invoiceCount} invoices • {customer.quoteCount} quotes
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          AED {(customer.invoiceValue + customer.quoteValue).toLocaleString()}
                        </p>
                        {customer.outstanding > 0 && (
                          <p className="text-xs text-orange-600">
                            Outstanding: AED {customer.outstanding.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">No customer data available</p>
                )}
              </div>
            </div>

            {/* Activity Summary */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Activity Summary
                </h3>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading activities...</p>
                ) : activities.length > 0 ? (
                  activities.map((activity, index) => {
                    const getActivityIcon = () => {
                      switch (activity.type) {
                        case 'quote':
                          return <FileText className="w-4 h-4 text-blue-600" />
                        case 'invoice':
                          return <CreditCard className="w-4 h-4 text-green-600" />
                        case 'payslip':
                          return <Wallet className="w-4 h-4 text-purple-600" />
                        case 'employee':
                          return <Users2 className="w-4 h-4 text-indigo-600" />
                        case 'customer':
                          return <Users className="w-4 h-4 text-orange-600" />
                        default:
                          return <CheckCircle className="w-4 h-4 text-slate-600" />
                      }
                    }

                    const getActivityBg = () => {
                      switch (activity.type) {
                        case 'quote':
                          return 'bg-blue-50 border-blue-200'
                        case 'invoice':
                          return 'bg-green-50 border-green-200'
                        case 'payslip':
                          return 'bg-purple-50 border-purple-200'
                        case 'employee':
                          return 'bg-indigo-50 border-indigo-200'
                        case 'customer':
                          return 'bg-orange-50 border-orange-200'
                        default:
                          return 'bg-slate-50 border-slate-200'
                      }
                    }

                    return (
                      <div key={index} className={`p-3 rounded-lg border ${getActivityBg()}`}>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getActivityIcon()}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900 font-medium">{activity.description}</p>
                            {activity.createdAt && (
                              <p className="text-xs text-slate-500 mt-1">
                                {new Date(activity.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No recent activities</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
