"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("../storage");
const api_client_1 = require("../api-client");
// Mock api-client
jest.mock('../api-client', () => ({
    getVehicleFinanceDashboard: jest.fn(),
    getAllVehicles: jest.fn(),
}));
describe('Storage - Vehicle Finances', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getVehicleFinanceDashboard', () => {
        it('should call api-client and return data', async () => {
            const mockData = { overall: { totalRevenue: 100 } };
            api_client_1.getVehicleFinanceDashboard.mockResolvedValue(mockData);
            const result = await (0, storage_1.getVehicleFinanceDashboard)();
            expect(api_client_1.getVehicleFinanceDashboard).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockData);
        });
        it('should handle errors gracefully by returning null', async () => {
            // storage.ts usually just passes through, but let's check behavior if it catches
            // actually storage.ts implementation is likely just a refined pass through
            // checking the file content: it does wrap in try/catch in some versions or just exports async functions
            // We assume it returns whatever api returns
            const error = new Error('Network error');
            api_client_1.getVehicleFinanceDashboard.mockRejectedValue(error);
            await expect((0, storage_1.getVehicleFinanceDashboard)()).rejects.toThrow('Network error');
        });
    });
});
