'use client'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface VehicleFinanceSearchProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  profitabilityFilter: string
  onProfitabilityFilterChange: (profitability: string) => void
  sortBy: string
  onSortChange: (sort: string) => void
  resultCount: number
}

export function VehicleFinanceSearch({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  profitabilityFilter,
  onProfitabilityFilterChange,
  sortBy,
  onSortChange,
  resultCount,
}: VehicleFinanceSearchProps) {
  return (
    <Card>
    <CardContent className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search by vehicle number, mak  e, or model..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => onSearchChange('')}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">Status:</label>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">Profitability:</label>
          <Select value={profitabilityFilter} onValueChange={onProfitabilityFilterChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="profitable">Profitable</SelectItem>
              <SelectItem value="loss">Loss-Making</SelectItem>
              <SelectItem value="no-data">No Data</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">Sort by:</label>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profit">Profit (High to Low)</SelectItem>
              <SelectItem value="revenue">Revenue (High to Low)</SelectItem>
              <SelectItem value="vehicleNumber">Vehicle Number</SelectItem>
              <SelectItem value="profitMargin">Profit Margin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto text-sm text-slate-600">
          {resultCount} {resultCount === 1 ? 'vehicle' : 'vehicles'}
        </div>
      </div>
    </CardContent>
    </Card>
  )
}

