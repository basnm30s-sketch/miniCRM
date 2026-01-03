"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const vehicles_1 = __importDefault(require("../routes/vehicles"));
// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    vehiclesAdapter: {
        getAll: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    vehicleTransactionsAdapter: {
        getProfitabilityByVehicle: jest.fn(),
    },
    formatReferenceError: jest.fn((entity, refs) => `Cannot delete ${entity} as it is referenced`),
}));
// Mock database for foreign key check queries
const mockDb = {
    prepare: jest.fn(),
};
jest.mock('../../lib/database', () => ({
    getDatabase: jest.fn(() => mockDb),
}));
const sqlite_1 = require("../adapters/sqlite");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/vehicles', vehicles_1.default);
describe('Vehicles API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // GET /api/vehicles
    describe('GET /', () => {
        it('should return all vehicles', async () => {
            const mockVehicles = [{ id: '1', type: 'Bus' }];
            sqlite_1.vehiclesAdapter.getAll.mockReturnValue(mockVehicles);
            const res = await (0, supertest_1.default)(app).get('/api/vehicles');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockVehicles);
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.vehiclesAdapter.getAll.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/vehicles');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // GET /api/vehicles/:id
    describe('GET /:id', () => {
        it('should return a vehicle by id', async () => {
            const mockVehicle = { id: '1', type: 'Bus' };
            sqlite_1.vehiclesAdapter.getById.mockReturnValue(mockVehicle);
            const res = await (0, supertest_1.default)(app).get('/api/vehicles/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockVehicle);
        });
        it('should return 404 if vehicle not found', async () => {
            ;
            sqlite_1.vehiclesAdapter.getById.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).get('/api/vehicles/999');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Vehicle not found' });
        });
    });
    // POST /api/vehicles
    describe('POST /', () => {
        const newVehicle = { type: 'Van', capacity: 10 };
        it('should create a new vehicle', async () => {
            const createdVehicle = { ...newVehicle, id: '2' };
            sqlite_1.vehiclesAdapter.create.mockReturnValue(createdVehicle);
            const res = await (0, supertest_1.default)(app).post('/api/vehicles').send(newVehicle);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(createdVehicle);
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.vehiclesAdapter.create.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).post('/api/vehicles').send(newVehicle);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // PUT /api/vehicles/:id
    describe('PUT /:id', () => {
        const updateData = { capacity: 12 };
        it('should update a vehicle', async () => {
            const updatedVehicle = { id: '1', type: 'Bus', ...updateData };
            sqlite_1.vehiclesAdapter.update.mockReturnValue(updatedVehicle);
            const res = await (0, supertest_1.default)(app).put('/api/vehicles/1').send(updateData);
            expect(res.status).toBe(200);
            expect(res.body).toEqual(updatedVehicle);
        });
        it('should return 404 if vehicle not found', async () => {
            ;
            sqlite_1.vehiclesAdapter.update.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).put('/api/vehicles/999').send(updateData);
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Vehicle not found' });
        });
    });
    // DELETE /api/vehicles/:id
    describe('DELETE /:id', () => {
        it('should delete a vehicle', async () => {
            ;
            sqlite_1.vehiclesAdapter.delete.mockReturnValue(undefined);
            const res = await (0, supertest_1.default)(app).delete('/api/vehicles/1');
            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
        });
        it('should check DB references if FOREIGN KEY error occurs', async () => {
            // Simulate FOREIGN KEY error
            ;
            sqlite_1.vehiclesAdapter.delete.mockImplementation(() => {
                throw new Error('FOREIGN KEY constraint failed');
            });
            // Mock database Query to find references (quotes using this vehicle)
            const mockAll = jest.fn().mockReturnValue([{ number: 'Q-100' }]);
            const mockPrepare = jest.fn().mockReturnValue({ all: mockAll });
            mockDb.prepare = mockPrepare;
            const res = await (0, supertest_1.default)(app).delete('/api/vehicles/1');
            expect(res.status).toBe(409);
            expect(res.body).toEqual({ error: 'Cannot delete Vehicle as it is referenced' });
            // Verify DB was queried
            expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT DISTINCT q.number'));
            expect(mockAll).toHaveBeenCalledWith('1');
        });
        it('should return 409 generic error if FK fails but no refs found (rare case)', async () => {
            ;
            sqlite_1.vehiclesAdapter.delete.mockImplementation(() => {
                throw new Error('FOREIGN KEY constraint failed');
            });
            // Mock database returning empty references (maybe referenced by something else we missed?)
            const mockAll = jest.fn().mockReturnValue([]);
            const mockPrepare = jest.fn().mockReturnValue({ all: mockAll });
            mockDb.prepare = mockPrepare;
            const res = await (0, supertest_1.default)(app).delete('/api/vehicles/1');
            expect(res.status).toBe(409);
            expect(res.body).toEqual({ error: 'Cannot delete Vehicle as it is referenced in other records' });
        });
        it('should handle general errors', async () => {
            ;
            sqlite_1.vehiclesAdapter.delete.mockImplementation(() => {
                throw new Error('General error');
            });
            const res = await (0, supertest_1.default)(app).delete('/api/vehicles/1');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'General error' });
        });
    });
    // GET /api/vehicles/:id/profitability
    describe('GET /:id/profitability', () => {
        it('should return profitability data for vehicle', async () => {
            const mockVehicle = { id: '1', vehicleNumber: 'ABC-123' };
            const mockProfitability = {
                vehicleId: '1',
                currentMonth: {
                    vehicleId: '1',
                    month: '2026-01',
                    totalRevenue: 10000,
                    totalExpenses: 5000,
                    profit: 5000,
                    transactionCount: 5,
                },
                lastMonth: {
                    vehicleId: '1',
                    month: '2025-12',
                    totalRevenue: 9500,
                    totalExpenses: 4800,
                    profit: 4700,
                    transactionCount: 4,
                },
                allTimeRevenue: 120000,
                allTimeExpenses: 60000,
                allTimeProfit: 60000,
                months: [
                    { vehicleId: '1', month: '2025-02', totalRevenue: 8000, totalExpenses: 4000, profit: 4000, transactionCount: 3 },
                    { vehicleId: '1', month: '2025-03', totalRevenue: 8500, totalExpenses: 4200, profit: 4300, transactionCount: 3 },
                    // ... 10 more months
                ],
            };
            sqlite_1.vehiclesAdapter.getById.mockReturnValue(mockVehicle);
            sqlite_1.vehicleTransactionsAdapter.getProfitabilityByVehicle.mockReturnValue(mockProfitability);
            const res = await (0, supertest_1.default)(app).get('/api/vehicles/1/profitability');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockProfitability);
            expect(sqlite_1.vehiclesAdapter.getById).toHaveBeenCalledWith('1');
            expect(sqlite_1.vehicleTransactionsAdapter.getProfitabilityByVehicle).toHaveBeenCalledWith('1');
        });
        it('should return 404 if vehicle not found', async () => {
            ;
            sqlite_1.vehiclesAdapter.getById.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).get('/api/vehicles/999/profitability');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Vehicle not found' });
            expect(sqlite_1.vehicleTransactionsAdapter.getProfitabilityByVehicle).not.toHaveBeenCalled();
        });
        it('should verify profitability structure', async () => {
            const mockVehicle = { id: '1', vehicleNumber: 'ABC-123' };
            const mockProfitability = {
                vehicleId: '1',
                currentMonth: {
                    vehicleId: '1',
                    month: '2026-01',
                    totalRevenue: 10000,
                    totalExpenses: 5000,
                    profit: 5000,
                    transactionCount: 5,
                },
                lastMonth: {
                    vehicleId: '1',
                    month: '2025-12',
                    totalRevenue: 9500,
                    totalExpenses: 4800,
                    profit: 4700,
                    transactionCount: 4,
                },
                allTimeRevenue: 120000,
                allTimeExpenses: 60000,
                allTimeProfit: 60000,
                months: Array(12).fill(null).map((_, i) => ({
                    vehicleId: '1',
                    month: `2025-${String(i + 1).padStart(2, '0')}`,
                    totalRevenue: 10000,
                    totalExpenses: 5000,
                    profit: 5000,
                    transactionCount: 5,
                })),
            };
            sqlite_1.vehiclesAdapter.getById.mockReturnValue(mockVehicle);
            sqlite_1.vehicleTransactionsAdapter.getProfitabilityByVehicle.mockReturnValue(mockProfitability);
            const res = await (0, supertest_1.default)(app).get('/api/vehicles/1/profitability');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('currentMonth');
            expect(res.body).toHaveProperty('lastMonth');
            expect(res.body).toHaveProperty('allTimeRevenue');
            expect(res.body).toHaveProperty('allTimeExpenses');
            expect(res.body).toHaveProperty('allTimeProfit');
            expect(res.body).toHaveProperty('months');
            expect(Array.isArray(res.body.months)).toBe(true);
            expect(res.body.months.length).toBe(12);
            expect(res.body.allTimeProfit).toBe(res.body.allTimeRevenue - res.body.allTimeExpenses);
        });
        it('should verify month normalization (YYYY-MM format)', async () => {
            const mockVehicle = { id: '1', vehicleNumber: 'ABC-123' };
            const mockProfitability = {
                vehicleId: '1',
                currentMonth: { vehicleId: '1', month: '2026-01', totalRevenue: 0, totalExpenses: 0, profit: 0, transactionCount: 0 },
                lastMonth: { vehicleId: '1', month: '2025-12', totalRevenue: 0, totalExpenses: 0, profit: 0, transactionCount: 0 },
                allTimeRevenue: 0,
                allTimeExpenses: 0,
                allTimeProfit: 0,
                months: Array(12).fill(null).map((_, i) => ({
                    vehicleId: '1',
                    month: `2025-${String(i + 1).padStart(2, '0')}`,
                    totalRevenue: 0,
                    totalExpenses: 0,
                    profit: 0,
                    transactionCount: 0,
                })),
            };
            sqlite_1.vehiclesAdapter.getById.mockReturnValue(mockVehicle);
            sqlite_1.vehicleTransactionsAdapter.getProfitabilityByVehicle.mockReturnValue(mockProfitability);
            const res = await (0, supertest_1.default)(app).get('/api/vehicles/1/profitability');
            expect(res.status).toBe(200);
            // Verify all months are in YYYY-MM format
            res.body.months.forEach((month) => {
                expect(month.month).toMatch(/^\d{4}-\d{2}$/);
            });
            expect(res.body.currentMonth.month).toMatch(/^\d{4}-\d{2}$/);
            expect(res.body.lastMonth.month).toMatch(/^\d{4}-\d{2}$/);
        });
        it('should handle errors', async () => {
            const mockVehicle = { id: '1', vehicleNumber: 'ABC-123' };
            sqlite_1.vehiclesAdapter.getById.mockReturnValue(mockVehicle);
            sqlite_1.vehicleTransactionsAdapter.getProfitabilityByVehicle.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/vehicles/1/profitability');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
});
