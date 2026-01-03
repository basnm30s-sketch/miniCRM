'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { VehicleFinanceDashboard } from '@/components/vehicle-finance-dashboard'
import { VehicleFinanceCard } from '@/components/vehicle-finance-card'
import { VehicleFinanceSearch } from '@/components/vehicle-finance-search'
import { getAllVehicles, getVehicleProfitability, getVehicleFinanceDashboard } from '@/lib/storage'
import type { Vehicle } from '@/lib/types'
import type { VehicleProfitabilitySummary } from '@/lib/types'

interface VehicleWithProfitability extends Vehicle {
  profitability: VehicleProfitabilitySummary | null
}

export default function VehicleFinancesPage() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [vehicles, setVehicles] = useState<VehicleWithProfitability[]>([])
  const [filteredVehicles, setFilteredVehicles] = useState<VehicleWithProfitability[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('__all__')
  const [profitabilityFilter, setProfitabilityFilter] = useState('__all__')
  const [sortBy, setSortBy] = useState('profit')
  const [loading, setLoading] = useState(true)

  const isMounted = useRef(false)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      if (isMounted.current) setLoading(true)

      // Load dashboard and vehicles in parallel, but don't fail if dashboard fails
      const [dashboardResult, allVehicles] = await Promise.allSettled([
        getVehicleFinanceDashboard(),
        getAllVehicles(),
      ])

      if (!isMounted.current) return

      // Set dashboard data if successful
      if (dashboardResult.status === 'fulfilled') {
        setDashboardData(dashboardResult.value)
      } else {
        console.warn('Failed to load dashboard data:', dashboardResult.reason)
        setDashboardData(null)
      }

      // Load vehicles
      if (allVehicles.status === 'fulfilled') {
        // Load profitability for each vehicle
        const vehiclesWithData = await Promise.all(
          allVehicles.value.map(async (vehicle) => {
            try {
              const profitability = await getVehicleProfitability(vehicle.id)
              return { ...vehicle, profitability }
            } catch (error) {
              return { ...vehicle, profitability: null }
            }
          })
        )

        if (isMounted.current) setVehicles(vehiclesWithData)
      } else {
        console.error('Failed to load vehicles:', allVehicles.reason)
        if (isMounted.current) setVehicles([])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      if (isMounted.current) setVehicles([])
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    filterAndSortVehicles()
  }, [vehicles, searchQuery, statusFilter, profitabilityFilter, sortBy])

  const filterAndSortVehicles = () => {
    let filtered = [...vehicles]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(v =>
        v.vehicleNumber?.toLowerCase().includes(query) ||
        v.make?.toLowerCase().includes(query) ||
        v.model?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== '__all__') {
      filtered = filtered.filter(v => v.status === statusFilter)
    }

    // Profitability filter
    if (profitabilityFilter !== '__all__') {
      filtered = filtered.filter(v => {
        if (!v.profitability) return profitabilityFilter === 'no-data'
        const profit = v.profitability.allTimeProfit
        if (profitabilityFilter === 'profitable') return profit > 0
        if (profitabilityFilter === 'loss') return profit < 0
        return false
      })
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'profit':
          const profitA = a.profitability?.allTimeProfit || 0
          const profitB = b.profitability?.allTimeProfit || 0
          return profitB - profitA
        case 'revenue':
          const revenueA = a.profitability?.allTimeRevenue || 0
          const revenueB = b.profitability?.allTimeRevenue || 0
          return revenueB - revenueA
        case 'profitMargin':
          const marginA = a.profitability && a.profitability.allTimeRevenue > 0
            ? (a.profitability.allTimeProfit / a.profitability.allTimeRevenue) * 100
            : -Infinity
          const marginB = b.profitability && b.profitability.allTimeRevenue > 0
            ? (b.profitability.allTimeProfit / b.profitability.allTimeRevenue) * 100
            : -Infinity
          return marginB - marginA
        case 'vehicleNumber':
        default:
          return (a.vehicleNumber || '').localeCompare(b.vehicleNumber || '')
      }
    })

    setFilteredVehicles(filtered)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading vehicle finances...</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Vehicle Finances</h1>
        <p className="text-slate-600 mt-1">Track expenses and revenue for each vehicle</p>
      </div>

      {/* Dashboard Section */}
      {dashboardData ? (
        <div>
          <VehicleFinanceDashboard data={dashboardData} />
        </div>
      ) : (
        <Card className="mb-8">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Dashboard data unavailable. Vehicle list is still available below.</p>
          </CardContent>
        </Card>
      )}

      {/* Vehicle List Section */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Vehicles</h2>

        <VehicleFinanceSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          profitabilityFilter={profitabilityFilter}
          onProfitabilityFilterChange={setProfitabilityFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          resultCount={filteredVehicles.length}
        />

        {filteredVehicles.length === 0 ? (
          <Card className="mt-4">
            <CardContent className="p-8 text-center">
              <p className="text-slate-500">
                {searchQuery || statusFilter !== '__all__' || profitabilityFilter !== '__all__'
                  ? 'No vehicles match your filters.'
                  : 'No vehicles found.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {filteredVehicles.map((vehicle) => (
              <VehicleFinanceCard
                key={vehicle.id}
                vehicle={vehicle}
                profitability={vehicle.profitability}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

