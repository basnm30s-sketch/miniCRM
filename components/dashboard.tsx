"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, TrendingUp, HardDrive } from "lucide-react"
import DataManagement from "./data-management"
import { DirhamIcon } from "@/components/icons/dirham-icon"

interface DashboardStats {
  totalInvoices: number
  totalRevenue: number
  activeRentals: number
  monthlyRevenue: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    totalRevenue: 0,
    activeRentals: 0,
    monthlyRevenue: 0,
  })

  useEffect(() => {
    const invoices = JSON.parse(localStorage.getItem("invoices") || "[]")
    const rentals = JSON.parse(localStorage.getItem("rentals") || "[]")
    const bills = JSON.parse(localStorage.getItem("monthlyBills") || "[]")

    const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)
    const activeRentals = rentals.filter((r: any) => r.status === "active").length
    const monthlyRevenue = bills.reduce((sum: number, bill: any) => sum + (bill.totalAmount || 0), 0)

    setStats({
      totalInvoices: invoices.length,
      totalRevenue,
      activeRentals,
      monthlyRevenue,
    })
  }, [])

  const statCards = [
    {
      title: "Total Invoices",
      value: stats.totalInvoices,
      icon: FileText,
      color: "bg-blue-50 dark:bg-blue-950",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Total Revenue",
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DirhamIcon,
      color: "bg-green-50 dark:bg-green-950",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "Active Rentals",
      value: stats.activeRentals,
      icon: Users,
      color: "bg-purple-50 dark:bg-purple-950",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Monthly Revenue",
      value: `$${stats.monthlyRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: "bg-orange-50 dark:bg-orange-950",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your car rental business</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>How to use CarFlow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Invoice Generator</h3>
              <p className="text-sm text-muted-foreground">
                Create professional PDF invoices or LOCs by entering customer name and amount. Perfect for quick
                document generation.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Monthly Billing Tracker</h3>
              <p className="text-sm text-muted-foreground">
                Track and consolidate customer bills by month. The system automatically calculates monthly totals per
                customer and adds them to the billing records.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Rental Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Monitor daily rental operations, track active rentals, manage rental dates, and follow up on returns.
                Stay organized with your daily work process.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Local Storage
            </CardTitle>
            <CardDescription>Your data is stored securely on your device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">
                All data is stored locally in your browser using localStorage
              </p>
            </div>
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">Storage Details:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ Automatic data persistence</li>
                <li>✓ No server uploads required</li>
                <li>✓ Private and secure</li>
                <li>✓ Full export/import support</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <DataManagement />
      </div>
    </div>
  )
}
