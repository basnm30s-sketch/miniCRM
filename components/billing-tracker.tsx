"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, TrendingUp } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts"

interface BillingRecord {
  id: string
  customerName: string
  month: string
  totalAmount: number
  itemCount: number
  date: string
}

export default function BillingTracker() {
  const [bills, setBills] = useState<BillingRecord[]>([])
  const [formData, setFormData] = useState({ customerName: "", month: "", amount: "" })
  const [groupedBills, setGroupedBills] = useState<Record<string, BillingRecord[]>>({})

  // Load bills on component mount
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("monthlyBills") || "[]")
    setBills(stored)
    groupBillsByMonth(stored)
  }, [])

  const groupBillsByMonth = (billsList: BillingRecord[]) => {
    const grouped: Record<string, BillingRecord[]> = {}
    billsList.forEach((bill) => {
      const key = bill.month
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(bill)
    })
    setGroupedBills(grouped)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.customerName || !formData.month || !formData.amount) return

    const newBill: BillingRecord = {
      id: Date.now().toString(),
      customerName: formData.customerName,
      month: formData.month,
      totalAmount: Number.parseFloat(formData.amount),
      itemCount: 1,
      date: new Date().toLocaleDateString(),
    }

    const updated = [...bills, newBill]
    setBills(updated)
    localStorage.setItem("monthlyBills", JSON.stringify(updated))
    groupBillsByMonth(updated)
    setFormData({ customerName: "", month: "", amount: "" })
  }

  const getMonthlyStats = (month: string) => {
    const monthBills = bills.filter((b) => b.month === month)
    const total = monthBills.reduce((sum, b) => sum + b.totalAmount, 0)
    const customerCount = new Set(monthBills.map((b) => b.customerName)).size

    return { total, customerCount, billCount: monthBills.length }
  }

  const getMonthlyTrendsData = () => {
    const months = Object.keys(groupedBills).sort()
    return months.map((month) => {
      const stats = getMonthlyStats(month)
      const monthName = new Date(month + "-01").toLocaleDateString("en-US", { month: "short" })
      return {
        month: monthName,
        total: stats.total,
        customers: stats.customerCount,
      }
    })
  }

  const getTopCustomersData = () => {
    const customerTotals: Record<string, number> = {}
    bills.forEach((bill) => {
      if (!customerTotals[bill.customerName]) {
        customerTotals[bill.customerName] = 0
      }
      customerTotals[bill.customerName] += bill.totalAmount
    })

    return Object.entries(customerTotals)
      .map(([name, total]) => ({ name, value: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }

  const handleDelete = (id: string) => {
    const updated = bills.filter((b) => b.id !== id)
    setBills(updated)
    localStorage.setItem("monthlyBills", JSON.stringify(updated))
    groupBillsByMonth(updated)
  }

  const months = Object.keys(groupedBills).sort().reverse()
  const totalRevenue = bills.reduce((sum, b) => sum + b.totalAmount, 0)
  const avgMonthly = months.length > 0 ? totalRevenue / months.length : 0

  const COLORS = ["#0ea5e9", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"]

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Monthly Billing Tracker</h2>
        <p className="text-muted-foreground">Track and consolidate customer bills by month</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all months</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Monthly</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">${avgMonthly.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{months.length} months tracked</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{bills.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Records created</p>
          </CardContent>
        </Card>
      </div>

      {getMonthlyTrendsData().length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Monthly Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total: {
                  label: "Revenue",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-80"
            >
              <BarChart data={getMonthlyTrendsData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="total" fill="var(--primary)" name="Revenue" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Add New Bill</CardTitle>
          <CardDescription>Enter customer details and amount</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <Label htmlFor="customer" className="text-foreground mb-2 block">
                Customer Name
              </Label>
              <Input
                id="customer"
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Enter name"
                className="border-border bg-background text-foreground"
              />
            </div>

            <div>
              <Label htmlFor="month" className="text-foreground mb-2 block">
                Month
              </Label>
              <Input
                id="month"
                type="month"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                className="border-border bg-background text-foreground"
              />
            </div>

            <div>
              <Label htmlFor="amount" className="text-foreground mb-2 block">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="border-border bg-background text-foreground"
              />
            </div>

            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 h-10">
              <Plus className="w-4 h-4" />
              Add Bill
            </Button>

            <Button
              type="button"
              variant="outline"
              className="border-border h-10 bg-transparent"
              onClick={() => groupBillsByMonth(bills)}
            >
              Refresh
            </Button>
          </form>
        </CardContent>
      </Card>

      {months.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">No billing records yet</p>
          </CardContent>
        </Card>
      ) : (
        months.map((month) => {
          const monthBills = groupedBills[month]
          const stats = getMonthlyStats(month)
          const customerBills: Record<string, number> = {}

          monthBills.forEach((bill) => {
            if (!customerBills[bill.customerName]) {
              customerBills[bill.customerName] = 0
            }
            customerBills[bill.customerName] += bill.totalAmount
          })

          return (
            <Card key={month} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {new Date(month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </CardTitle>
                    <CardDescription>
                      {stats.customerCount} customers • {stats.billCount} bills • Total: ${stats.total.toFixed(2)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(customerBills).map(([customer, total]) => (
                    <div
                      key={customer}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                    >
                      <div>
                        <p className="font-medium text-foreground">{customer}</p>
                        <p className="text-sm text-muted-foreground">
                          {monthBills.filter((b) => b.customerName === customer).length} transaction(s)
                        </p>
                      </div>
                      <p className="text-lg font-bold text-primary">${total.toFixed(2)}</p>
                    </div>
                  ))}

                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">Monthly Total</span>
                      <span className="text-xl font-bold text-accent">${stats.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    {monthBills.map((bill) => (
                      <Button
                        key={bill.id}
                        onClick={() => handleDelete(bill.id)}
                        size="sm"
                        variant="outline"
                        className="border-border text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
