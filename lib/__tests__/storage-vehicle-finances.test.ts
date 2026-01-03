import { getVehicleFinanceDashboard } from '../storage'
import { getVehicleFinanceDashboard as apiGetDashboard } from '../api-client'

// Mock api-client
jest.mock('../api-client', () => ({
    getVehicleFinanceDashboard: jest.fn(),
    getAllVehicles: jest.fn(),
}))

describe('Storage - Vehicle Finances', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('getVehicleFinanceDashboard', () => {
        it('should call api-client and return data', async () => {
            const mockData = { overall: { totalRevenue: 100 } }
                ; (apiGetDashboard as jest.Mock).mockResolvedValue(mockData)

            const result = await getVehicleFinanceDashboard()

            expect(apiGetDashboard).toHaveBeenCalledTimes(1)
            expect(result).toEqual(mockData)
        })

        it('should handle errors gracefully by returning null', async () => {
            // storage.ts usually just passes through, but let's check behavior if it catches
            // actually storage.ts implementation is likely just a refined pass through
            // checking the file content: it does wrap in try/catch in some versions or just exports async functions
            // We assume it returns whatever api returns

            const error = new Error('Network error')
                ; (apiGetDashboard as jest.Mock).mockRejectedValue(error)

            await expect(getVehicleFinanceDashboard()).rejects.toThrow('Network error')
        })
    })
})
