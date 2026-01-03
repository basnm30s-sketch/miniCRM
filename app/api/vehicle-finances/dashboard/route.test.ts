import { GET } from './route'
import { vehicleTransactionsAdapter } from '../../../../api/adapters/sqlite'
import { NextResponse } from 'next/server'

// Mock the adapter
jest.mock('../../../../api/adapters/sqlite', () => ({
    vehicleTransactionsAdapter: {
        getDashboardMetrics: jest.fn()
    }
}))

// Mock NextResponse
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((data) => ({ status: 200, body: data }))
    }
}))

describe('GET /api/vehicle-finances/dashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return dashboard metrics successfully', async () => {
        const mockMetrics = {
            overall: { totalRevenue: 5000 },
            vehicleBased: { totalActive: 5 }
        }

            // Setup mock return
            ; (vehicleTransactionsAdapter.getDashboardMetrics as jest.Mock).mockReturnValue(mockMetrics)

        // Call the route handler
        const response = await GET() as any

        // Verify calls and result
        expect(vehicleTransactionsAdapter.getDashboardMetrics).toHaveBeenCalledTimes(1)
        expect(NextResponse.json).toHaveBeenCalledWith(mockMetrics)
        expect(response.body).toEqual(mockMetrics)
    })

    it('should handle errors and return fallback empty data', async () => {
        // Setup mock to throw error
        ; (vehicleTransactionsAdapter.getDashboardMetrics as jest.Mock).mockImplementation(() => {
            throw new Error('Database connection failed')
        })

        // Call the route handler
        const response = await GET() as any

        // Verify it didn't crash and returned fallback data
        expect(vehicleTransactionsAdapter.getDashboardMetrics).toHaveBeenCalledTimes(1)
        expect(response.body).toBeDefined()
        expect(response.body.overall).toBeDefined()
        expect(response.body.overall.totalRevenue).toBe(0)
        expect(response.body.timeBased.currentMonth.revenue).toBe(0)
    })
})
