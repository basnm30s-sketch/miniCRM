// Mock adapters
jest.mock('../adapters/sqlite', () => ({
    vehicleTransactionsAdapter: {
        getAll: jest.fn(),
        getById: jest.fn(),
        getByVehicleId: jest.fn(),
        getByVehicleIdAndMonth: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        getProfitabilityByVehicle: jest.fn(),
        getDashboardMetrics: jest.fn(),
    },
    vehiclesAdapter: {
        getAll: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    invoicesAdapter: {
        getById: jest.fn(),
    },
    customersAdapter: {
        getById: jest.fn(),
    },
}))

import { vehicleTransactionsAdapter } from '../adapters/sqlite'

describe('Vehicle Finances Dashboard Metrics', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('getDashboardMetrics()', () => {
        it('should return dashboard metrics structure', () => {
            const mockMetrics = {
                overall: {
                    totalRevenue: 18000,
                    totalExpenses: 8000,
                    netProfit: 10000,
                    profitMargin: 55.56,
                },
                timeBased: {
                    currentMonth: { revenue: 10000, expenses: 5000, profit: 5000 },
                    lastMonth: { revenue: 8000, expenses: 4000, profit: 4000 },
                    monthlyTrend: [],
                },
                vehicleBased: {
                    totalVehicles: 2,
                    totalRevenue: 18000,
                    totalExpenses: 8000,
                    totalProfit: 10000,
                    topByRevenue: [],
                    topByProfit: [],
                    bottomByProfit: [],
                },
                customerBased: {
                    totalUnique: 2,
                    topByRevenue: [],
                    avgRevenuePerCustomer: 9000,
                },
                categoryBased: {
                    revenueByCategory: {},
                    expensesByCategory: {},
                    topExpenseCategory: 'Fuel',
                },
                operational: {
                    revenuePerVehiclePerMonth: 9000,
                    expenseRatio: 44.44,
                    mostActiveVehicle: { vehicleId: 'v1', vehicleNumber: 'ABC-123', transactionCount: 5 },
                    avgTransactionsPerVehicle: 2.5,
                },
            }

            ; (vehicleTransactionsAdapter.getDashboardMetrics as jest.Mock).mockReturnValue(mockMetrics)

            const metrics = vehicleTransactionsAdapter.getDashboardMetrics()

            expect(metrics).toHaveProperty('overall')
            expect(metrics).toHaveProperty('timeBased')
            expect(metrics).toHaveProperty('vehicleBased')
            expect(metrics).toHaveProperty('customerBased')
            expect(metrics).toHaveProperty('categoryBased')
            expect(metrics).toHaveProperty('operational')
        })

        it('should calculate overall metrics correctly', () => {
            const mockMetrics = {
                overall: {
                    totalRevenue: 10000,
                    totalExpenses: 5000,
                    netProfit: 5000,
                    profitMargin: 50,
                },
                timeBased: {},
                vehicleBased: {},
                customerBased: {},
                categoryBased: {},
                operational: {},
            }

            ; (vehicleTransactionsAdapter.getDashboardMetrics as jest.Mock).mockReturnValue(mockMetrics)

            const metrics = vehicleTransactionsAdapter.getDashboardMetrics()

            expect(metrics.overall.totalRevenue).toBe(10000)
            expect(metrics.overall.totalExpenses).toBe(5000)
            expect(metrics.overall.netProfit).toBe(5000)
            expect(metrics.overall.profitMargin).toBe(50)
        })

        it('should calculate vehicle-based metrics', () => {
            const mockMetrics = {
                overall: {},
                timeBased: {},
                vehicleBased: {
                    totalVehicles: 2,
                    totalRevenue: 18000,
                    totalExpenses: 8000,
                    totalProfit: 10000,
                    topByRevenue: [
                        { vehicleId: 'v1', vehicleNumber: 'ABC-123', revenue: 10000 },
                    ],
                    topByProfit: [
                        { vehicleId: 'v1', vehicleNumber: 'ABC-123', profit: 5000 },
                    ],
                    bottomByProfit: [
                        { vehicleId: 'v2', vehicleNumber: 'XYZ-456', profit: 2000 },
                    ],
                },
                customerBased: {},
                categoryBased: {},
                operational: {},
            }

            ; (vehicleTransactionsAdapter.getDashboardMetrics as jest.Mock).mockReturnValue(mockMetrics)

            const metrics = vehicleTransactionsAdapter.getDashboardMetrics()

            expect(metrics.vehicleBased.totalVehicles).toBe(2)
            expect(metrics.vehicleBased.totalRevenue).toBe(18000)
            expect(metrics.vehicleBased.totalExpenses).toBe(8000)
            expect(metrics.vehicleBased.totalProfit).toBe(10000)
            expect(Array.isArray(metrics.vehicleBased.topByRevenue)).toBe(true)
            expect(Array.isArray(metrics.vehicleBased.topByProfit)).toBe(true)
            expect(Array.isArray(metrics.vehicleBased.bottomByProfit)).toBe(true)
        })

        it('should calculate customer-based metrics', () => {
            const mockMetrics = {
                overall: {},
                timeBased: {},
                vehicleBased: {},
                customerBased: {
                    totalUnique: 2,
                    topByRevenue: [
                        { customerId: 'c1', customerName: 'Customer 1', revenue: 10000 },
                    ],
                    avgRevenuePerCustomer: 9000,
                },
                categoryBased: {},
                operational: {},
            }

            ; (vehicleTransactionsAdapter.getDashboardMetrics as jest.Mock).mockReturnValue(mockMetrics)

            const metrics = vehicleTransactionsAdapter.getDashboardMetrics()

            expect(metrics.customerBased.totalUnique).toBe(2)
            expect(Array.isArray(metrics.customerBased.topByRevenue)).toBe(true)
            expect(typeof metrics.customerBased.avgRevenuePerCustomer).toBe('number')
        })

        it('should calculate category-based metrics', () => {
            const mockMetrics = {
                overall: {},
                timeBased: {},
                vehicleBased: {},
                customerBased: {},
                categoryBased: {
                    revenueByCategory: {
                        'Rental Income': 10000,
                    },
                    expensesByCategory: {
                        'Fuel': 5000,
                        'Maintenance': 3000,
                    },
                    topExpenseCategory: 'Fuel',
                },
                operational: {},
            }

            ; (vehicleTransactionsAdapter.getDashboardMetrics as jest.Mock).mockReturnValue(mockMetrics)

            const metrics = vehicleTransactionsAdapter.getDashboardMetrics()

            expect(metrics.categoryBased.expensesByCategory).toHaveProperty('Fuel')
            expect(metrics.categoryBased.expensesByCategory).toHaveProperty('Maintenance')
            expect(metrics.categoryBased.revenueByCategory).toHaveProperty('Rental Income')
            expect(metrics.categoryBased.topExpenseCategory).toBe('Fuel')
        })

        it('should calculate operational metrics', () => {
            const mockMetrics = {
                overall: {},
                timeBased: {},
                vehicleBased: {},
                customerBased: {},
                categoryBased: {},
                operational: {
                    revenuePerVehiclePerMonth: 5000,
                    expenseRatio: 50,
                    mostActiveVehicle: {
                        vehicleId: 'v1',
                        vehicleNumber: 'ABC-123',
                        transactionCount: 10,
                    },
                    avgTransactionsPerVehicle: 5,
                },
            }

            ; (vehicleTransactionsAdapter.getDashboardMetrics as jest.Mock).mockReturnValue(mockMetrics)

            const metrics = vehicleTransactionsAdapter.getDashboardMetrics()

            expect(typeof metrics.operational.revenuePerVehiclePerMonth).toBe('number')
            expect(typeof metrics.operational.expenseRatio).toBe('number')
            expect(metrics.operational.mostActiveVehicle).toHaveProperty('vehicleId')
            expect(metrics.operational.mostActiveVehicle).toHaveProperty('vehicleNumber')
            expect(metrics.operational.mostActiveVehicle).toHaveProperty('transactionCount')
            expect(typeof metrics.operational.avgTransactionsPerVehicle).toBe('number')
        })

        it('should handle empty data gracefully', () => {
            const mockMetrics = {
                overall: {
                    totalRevenue: 0,
                    totalExpenses: 0,
                    netProfit: 0,
                    profitMargin: 0,
                },
                timeBased: {},
                vehicleBased: {
                    totalVehicles: 0,
                    totalRevenue: 0,
                    totalExpenses: 0,
                    totalProfit: 0,
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
            }

            ; (vehicleTransactionsAdapter.getDashboardMetrics as jest.Mock).mockReturnValue(mockMetrics)

            const metrics = vehicleTransactionsAdapter.getDashboardMetrics()

            expect(metrics.overall.totalRevenue).toBe(0)
            expect(metrics.overall.totalExpenses).toBe(0)
            expect(metrics.overall.netProfit).toBe(0)
            expect(metrics.vehicleBased.totalVehicles).toBe(0)
            expect(metrics.customerBased.totalUnique).toBe(0)
            expect(metrics.operational.mostActiveVehicle.vehicleNumber).toBe('N/A')
        })

        it('should calculate time-based metrics', () => {
            const now = new Date()
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

            const mockMetrics = {
                overall: {},
                timeBased: {
                    currentMonth: {
                        revenue: 10000,
                        expenses: 5000,
                        profit: 5000,
                    },
                    lastMonth: {
                        revenue: 8000,
                        expenses: 4000,
                        profit: 4000,
                    },
                    monthlyTrend: Array(12).fill(null).map((_, i) => ({
                        month: `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`,
                        revenue: 10000,
                        expenses: 5000,
                        profit: 5000,
                    })),
                },
                vehicleBased: {},
                customerBased: {},
                categoryBased: {},
                operational: {},
            }

            ; (vehicleTransactionsAdapter.getDashboardMetrics as jest.Mock).mockReturnValue(mockMetrics)

            const metrics = vehicleTransactionsAdapter.getDashboardMetrics()

            expect(metrics.timeBased.currentMonth.revenue).toBe(10000)
            expect(metrics.timeBased.currentMonth.expenses).toBe(5000)
            expect(metrics.timeBased.currentMonth.profit).toBe(5000)
            expect(metrics.timeBased.lastMonth.revenue).toBe(8000)
            expect(metrics.timeBased.lastMonth.expenses).toBe(4000)
            expect(metrics.timeBased.lastMonth.profit).toBe(4000)
            expect(Array.isArray(metrics.timeBased.monthlyTrend)).toBe(true)
            expect(metrics.timeBased.monthlyTrend.length).toBe(12)
        })

        it('should handle errors gracefully', () => {
            ; (vehicleTransactionsAdapter.getDashboardMetrics as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            expect(() => {
                vehicleTransactionsAdapter.getDashboardMetrics()
            }).toThrow('Database error')
        })
    })
})
