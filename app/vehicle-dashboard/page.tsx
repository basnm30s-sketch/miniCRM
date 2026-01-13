'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { VehicleFinanceDashboard } from '@/components/vehicle-finance-dashboard'
import { getVehicleFinanceDashboard } from '@/lib/storage'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export default function VehicleDashboardPage() {
    const [dashboardData, setDashboardData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // Dashboard configuration state
    const [dashboardConfig, setDashboardConfig] = useState({
        overallKeyMetrics: true,
        overallSecondaryStats: true,
        dimensions: true,
        charts: true
    })
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    const isMounted = useRef(false)

    useEffect(() => {
        isMounted.current = true

        // Load config from localStorage
        const savedConfig = localStorage.getItem('vehicleFinanceDashboardConfig')
        if (savedConfig) {
            try {
                setDashboardConfig(JSON.parse(savedConfig))
            } catch (e) {
                console.error('Failed to parse saved config', e)
            }
        }

        loadData()

        return () => {
            isMounted.current = false
        }
    }, [])

    const loadData = async () => {
        try {
            if (isMounted.current) setLoading(true)

            const dashboardResult = await getVehicleFinanceDashboard()

            if (!isMounted.current) return

            if (dashboardResult) {
                setDashboardData(dashboardResult)
            } else {
                setDashboardData(null)
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error)
            if (isMounted.current) setDashboardData(null)
        } finally {
            if (isMounted.current) setLoading(false)
        }
    }

    // Save config changes
    const updateConfig = (key: keyof typeof dashboardConfig, value: boolean) => {
        const newConfig = { ...dashboardConfig, [key]: value }
        setDashboardConfig(newConfig)
        localStorage.setItem('vehicleFinanceDashboardConfig', JSON.stringify(newConfig))
    }

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-slate-500">Loading dashboard...</div>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Vehicle Dashboard</h1>
                    <p className="text-slate-600 mt-1">Overall financial performance overview</p>
                </div>

                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Dashboard Settings</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <p className="text-sm text-slate-500">
                                Customize which sections are visible on your dashboard.
                            </p>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Key Financials</Label>
                                        <p className="text-sm text-slate-500">Show Revenue, Expenses, and Net Profit cards</p>
                                    </div>
                                    <Switch
                                        checked={dashboardConfig.overallKeyMetrics}
                                        onCheckedChange={(checked) => updateConfig('overallKeyMetrics', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Performance Stats</Label>
                                        <p className="text-sm text-slate-500">Show margins, averages, and transaction counts</p>
                                    </div>
                                    <Switch
                                        checked={dashboardConfig.overallSecondaryStats}
                                        onCheckedChange={(checked) => updateConfig('overallSecondaryStats', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Dimension Metrics</Label>
                                        <p className="text-sm text-slate-500">Show cards for Vehicle, Customer, Category, and Time metrics</p>
                                    </div>
                                    <Switch
                                        checked={dashboardConfig.dimensions}
                                        onCheckedChange={(checked) => updateConfig('dimensions', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Visualizations</Label>
                                        <p className="text-sm text-slate-500">Show trend graphs and charts</p>
                                    </div>
                                    <Switch
                                        checked={dashboardConfig.charts}
                                        onCheckedChange={(checked) => updateConfig('charts', checked)}
                                    />
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Dashboard Section */}
            {dashboardData ? (
                <div>
                    <VehicleFinanceDashboard
                        data={dashboardData}
                        visibleSections={dashboardConfig}
                    />
                </div>
            ) : (
                <Card className="mb-8">
                    <CardContent className="p-4">
                        <p className="text-sm text-slate-500">Dashboard data unavailable.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
