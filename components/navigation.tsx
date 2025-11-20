"use client"

import { FileText, BarChart3, Car, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "invoice", label: "Invoice Generator", icon: FileText },
    { id: "billing", label: "Monthly Billing", icon: BarChart3 },
    { id: "rental", label: "Rental Tracking", icon: Car },
  ]

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">CarFlow</h1>
          </div>
          <p className="text-sm text-muted-foreground">Car Rental Management System</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                variant={isActive ? "default" : "outline"}
                className={`gap-2 ${
                  isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border-border hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
