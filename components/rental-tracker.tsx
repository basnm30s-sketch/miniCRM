"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, CheckCircle, AlertCircle, Trash2, Clock } from "lucide-react"
import { DirhamIcon } from "@/components/icons/dirham-icon"

interface Rental {
  id: string
  customerName: string
  vehicleInfo: string
  rentalDate: string
  dueDate: string
  amount: number
  status: "active" | "due-soon" | "overdue" | "completed"
  notes: string
}

export default function RentalTracker() {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [formData, setFormData] = useState({
    customerName: "",
    vehicleInfo: "",
    rentalDate: "",
    dueDate: "",
    amount: "",
    notes: "",
  })

  // Load rentals on component mount
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("rentals") || "[]")
    setRentals(stored)
  }, [])

  const getStatus = (dueDate: string): "active" | "due-soon" | "overdue" | "completed" => {
    const today = new Date()
    const due = new Date(dueDate)
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDue < 0) return "overdue"
    if (daysUntilDue <= 2) return "due-soon"
    return "active"
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.customerName || !formData.vehicleInfo || !formData.dueDate || !formData.amount) return

    const newRental: Rental = {
      id: Date.now().toString(),
      customerName: formData.customerName,
      vehicleInfo: formData.vehicleInfo,
      rentalDate: formData.rentalDate || new Date().toISOString().split("T")[0],
      dueDate: formData.dueDate,
      amount: Number.parseFloat(formData.amount),
      status: "active",
      notes: formData.notes,
    }

    const updated = [...rentals, newRental]
    setRentals(updated)
    localStorage.setItem("rentals", JSON.stringify(updated))
    setFormData({ customerName: "", vehicleInfo: "", rentalDate: "", dueDate: "", amount: "", notes: "" })
  }

  const handleCompleteRental = (id: string) => {
    const updated = rentals.map((r) =>
      r.id === id ? { ...r, status: "completed" as const } : r
    )
    setRentals(updated)
    localStorage.setItem("rentals", JSON.stringify(updated))
  }

  const handleDelete = (id: string) => {
    const updated = rentals.filter((r) => r.id !== id)
    setRentals(updated)
    localStorage.setItem("rentals", JSON.stringify(updated))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
      case "due-soon":
        return "bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300"
      case "overdue":
        return "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
      case "completed":
        return "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
      default:
        return ""
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "overdue":
      case "due-soon":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <CheckCircle className="w-4 h-4" />
    }
  }

  const activeRentals = rentals.filter((r) => r.status !== "completed")
  const completedRentals = rentals.filter((r) => r.status === "completed")
  const overdueRentals = activeRentals.filter((r) => {
    const daysUntilDue = Math.ceil((new Date(r.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilDue < 0
  })
  const dueSoonRentals = activeRentals.filter((r) => {
    const daysUntilDue = Math.ceil((new Date(r.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilDue >= 0 && daysUntilDue <= 2
  })
  const totalActiveRevenue = activeRentals.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Daily Rental Tracking</h2>
        <p className="text-muted-foreground">Manage active rentals and follow up on returns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Active Rentals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activeRentals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently renting</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{dueSoonRentals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Next 2 days</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueRentals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs follow-up</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DirhamIcon className="w-4 h-4" />
              Active Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">${totalActiveRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending returns</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Create New Rental</CardTitle>
          <CardDescription>Enter rental details for tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer" className="text-foreground">
                  Customer Name
                </Label>
                <Input
                  id="customer"
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Enter customer name"
                  className="border-border bg-background text-foreground"
                />
              </div>

              <div>
                <Label htmlFor="vehicle" className="text-foreground">
                  Vehicle Info
                </Label>
                <Input
                  id="vehicle"
                  type="text"
                  value={formData.vehicleInfo}
                  onChange={(e) => setFormData({ ...formData, vehicleInfo: e.target.value })}
                  placeholder="e.g., Toyota Camry 2023 (Plate: ABC123)"
                  className="border-border bg-background text-foreground"
                />
              </div>

              <div>
                <Label htmlFor="rentalDate" className="text-foreground">
                  Rental Date
                </Label>
                <Input
                  id="rentalDate"
                  type="date"
                  value={formData.rentalDate}
                  onChange={(e) => setFormData({ ...formData, rentalDate: e.target.value })}
                  className="border-border bg-background text-foreground"
                />
              </div>

              <div>
                <Label htmlFor="dueDate" className="text-foreground">
                  Due Date
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="border-border bg-background text-foreground"
                  required
                />
              </div>

              <div>
                <Label htmlFor="amount" className="text-foreground">
                  Rental Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="border-border bg-background text-foreground"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-foreground">
                  Notes (Optional)
                </Label>
                <Input
                  id="notes"
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add notes or special instructions"
                  className="border-border bg-background text-foreground"
                />
              </div>
            </div>

            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full">
              <Plus className="w-4 h-4" />
              Create Rental Record
            </Button>
          </form>
        </CardContent>
      </Card>

      {activeRentals.length > 0 && (
        <Card className="border-border border-2 border-accent">
          <CardHeader className="pb-3 bg-accent/5">
            <CardTitle>Active Rentals</CardTitle>
            <CardDescription>{activeRentals.length} rental(s) requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4">
              {activeRentals.map((rental) => {
                const status = getStatus(rental.dueDate)
                const daysRemaining = Math.ceil(
                  (new Date(rental.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                )

                return (
                  <div
                    key={rental.id}
                    className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground text-lg">{rental.customerName}</h3>
                          <span
                            className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${getStatusColor(
                              status,
                            )}`}
                          >
                            {getStatusIcon(status)}
                            {status === "active"
                              ? "Active"
                              : status === "due-soon"
                                ? `Due Soon (${daysRemaining} days)`
                                : "Overdue"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{rental.vehicleInfo}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-2">
                          <div>
                            <span className="text-muted-foreground">Rental:</span>
                            <p className="font-medium text-foreground">{rental.rentalDate}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Due:</span>
                            <p className="font-medium text-foreground">{rental.dueDate}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Amount:</span>
                            <p className="font-medium text-foreground">${rental.amount.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Days Left:</span>
                            <p
                              className={`font-medium ${
                                daysRemaining < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : daysRemaining <= 2
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-green-600 dark:text-green-400"
                              }`}
                            >
                              {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days ago` : daysRemaining}
                            </p>
                          </div>
                        </div>
                        {rental.notes && <p className="text-sm text-muted-foreground italic">Notes: {rental.notes}</p>}
                      </div>
                      <div className="flex gap-2 flex-col">
                        <Button
                          onClick={() => handleCompleteRental(rental.id)}
                          size="sm"
                          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </Button>
                        <Button
                          onClick={() => handleDelete(rental.id)}
                          size="sm"
                          variant="outline"
                          className="border-border text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {completedRentals.length > 0 && (
        <Card className="border-border opacity-75">
          <CardHeader className="pb-3">
            <CardTitle>Completed Rentals</CardTitle>
            <CardDescription>{completedRentals.length} rental(s) completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {completedRentals.map((rental) => (
                <div
                  key={rental.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground line-through">{rental.customerName}</p>
                    <p className="text-sm text-muted-foreground">{rental.vehicleInfo}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-muted-foreground">${rental.amount.toFixed(2)}</span>
                    <Button
                      onClick={() => handleDelete(rental.id)}
                      size="sm"
                      variant="outline"
                      className="border-border text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {rentals.length === 0 && (
        <Card className="border-border">
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">No rental records yet. Create one to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
