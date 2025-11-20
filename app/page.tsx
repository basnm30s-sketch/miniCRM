"use client"

import { useState } from "react"
import Dashboard from "@/components/dashboard"
import InvoiceGenerator from "@/components/invoice-generator"
import BillingTracker from "@/components/billing-tracker"
import RentalTracker from "@/components/rental-tracker"
import Navigation from "@/components/navigation"

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="min-h-screen bg-background">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="container mx-auto px-4 py-8">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "invoice" && <InvoiceGenerator />}
        {activeTab === "billing" && <BillingTracker />}
        {activeTab === "rental" && <RentalTracker />}
      </main>
    </div>
  )
}
