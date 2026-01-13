'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { VehicleFinanceCard } from '@/components/vehicle-finance-card'
import { VehicleFinanceSearch } from '@/components/vehicle-finance-search'
import { VehicleFinanceDetailView } from '@/components/vehicle-finance-detail-view'
import { getAllVehicles, getVehicleProfitability } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { Vehicle } from '@/lib/types'
import type { VehicleProfitabilitySummary } from '@/lib/types'

interface VehicleWithProfitability extends Vehicle {
  profitability: VehicleProfitabilitySummary | null
}

function VehicleFinancesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedVehicleId = searchParams?.get('vehicleId')

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

      const allVehicles = await getAllVehicles()

      if (!isMounted.current) return

      if (allVehicles) {
        // Load profitability for each vehicle
        // Optimization: We could lazy load this, but for the list card we need it.
        // If performance issues arise, we can paginate or simplify the list card.
        const vehiclesWithData = await Promise.all(
          allVehicles.map(async (vehicle) => {
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

  const handleVehicleSelect = (vehicleId: string) => {
    // Update URL without full reload
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('vehicleId', vehicleId)
    router.replace(`/vehicle-finances?${params.toString()}`)
  }

  const handleBackToList = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('vehicleId')
    router.replace(`/vehicle-finances?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading vehicles...</div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.header))] flex flex-col md:flex-row overflow-hidden bg-slate-50/50">

      {/* Left Sidebar - Vehicle List */}
      <div className={`
        w-full md:w-1/3 lg:w-[400px] border-r border-slate-200 bg-white flex flex-col h-full
        ${selectedVehicleId ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="p-4 border-b border-slate-200 bg-white z-10 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Fleet Management</h1>
            <p className="text-xs text-slate-500">Select a vehicle to view details</p>
          </div>

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
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {filteredVehicles.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {searchQuery ? 'No vehicles match your filters.' : 'No vehicles found.'}
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <div key={vehicle.id}>
                <VehicleFinanceCard
                  vehicle={vehicle}
                  profitability={vehicle.profitability}
                  onClick={() => handleVehicleSelect(vehicle.id)}
                  isSelected={selectedVehicleId === vehicle.id}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Content - Detail View */}
      <div className={`
        flex-1 bg-slate-50 h-full overflow-hidden flex flex-col
        ${!selectedVehicleId ? 'hidden md:flex' : 'flex'}
      `}>
        {selectedVehicleId ? (
          <div className="h-full flex flex-col">
            {/* Mobile Back Button */}
            <div className="md:hidden p-4 border-b border-slate-200 bg-white flex items-center">
              <Button variant="ghost" size="sm" onClick={handleBackToList} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </Button>
            </div>

            <VehicleFinanceDetailView vehicleId={selectedVehicleId} />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-300" />
            </div>
            <p className="font-medium">Select a vehicle from the list</p>
            <p className="text-sm mt-1">View financial details, charts, and transactions</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VehicleFinancesPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="text-slate-500">Loading vehicles...</div>
      </div>
    }>
      <VehicleFinancesContent />
    </Suspense>
  )
}
