import { NextResponse } from 'next/server'
import { vehicleTransactionsAdapter } from '../../../../api/adapters/sqlite'

export async function GET() {
    try {
        const dashboardMetrics = vehicleTransactionsAdapter.getDashboardMetrics()
        return NextResponse.json(dashboardMetrics)
    } catch (error: any) {
        console.error('Error getting dashboard metrics:', error)
        // Return empty dashboard structure as fallback instead of failing
        return NextResponse.json({
            overall: {
                totalRevenue: 0,
                totalExpenses: 0,
                netProfit: 0,
                profitMargin: 0,
                avgRevenuePerVehicle: 0,
                avgProfitPerVehicle: 0,
                totalTransactions: 0,
                avgTransactionValue: 0,
            },
            timeBased: {
                currentMonth: { revenue: 0, expenses: 0, profit: 0 },
                lastMonth: { revenue: 0, expenses: 0, profit: 0 },
                momGrowth: { revenue: 0, expenses: 0, profit: 0 },
                ytd: { revenue: 0, expenses: 0, profit: 0 },
                monthlyTrend: [],
            },
            vehicleBased: {
                totalActive: 0,
                profitable: 0,
                lossMaking: 0,
                noData: 0,
                topByRevenue: [],
                topByProfit: [],
                bottomByProfit: [],
            },
            customerBased: {
                totalUnique: 0,
                topByRevenue: [],
                avgRevenuePerCustomer: 0,
            },
            categoryBased: {
                revenueByCategory: {},
                expensesByCategory: {},
                topExpenseCategory: 'N/A',
            },
            operational: {
                revenuePerVehiclePerMonth: 0,
                expenseRatio: 0,
                mostActiveVehicle: { vehicleId: '', vehicleNumber: 'N/A', transactionCount: 0 },
                avgTransactionsPerVehicle: 0,
            },
        })
    }
}
