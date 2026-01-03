"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const vehicle_transactions_1 = __importDefault(require("../routes/vehicle-transactions"));
// Mock the adapters
jest.mock('../adapters/sqlite', () => ({
    vehicleTransactionsAdapter: {
        getAll: jest.fn(),
        getById: jest.fn(),
        getByVehicleId: jest.fn(),
        getByVehicleIdAndMonth: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    vehiclesAdapter: {
        getById: jest.fn(),
    },
    employeesAdapter: {
        getById: jest.fn(),
    },
}));
const sqlite_1 = require("../adapters/sqlite");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/vehicle-transactions', vehicle_transactions_1.default);
describe('Vehicle Transactions API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // GET /api/vehicle-transactions
    describe('GET /', () => {
        it('should return all transactions', async () => {
            const mockTransactions = [
                { id: '1', vehicleId: 'v1', transactionType: 'revenue', amount: 1000, date: '2025-01-15', month: '2025-01' },
                { id: '2', vehicleId: 'v1', transactionType: 'expense', amount: 500, date: '2025-01-20', month: '2025-01' },
            ];
            sqlite_1.vehicleTransactionsAdapter.getAll.mockReturnValue(mockTransactions);
            const res = await (0, supertest_1.default)(app).get('/api/vehicle-transactions');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockTransactions);
            expect(sqlite_1.vehicleTransactionsAdapter.getAll).toHaveBeenCalledTimes(1);
        });
        it('should filter by vehicleId query parameter', async () => {
            const mockTransactions = [
                { id: '1', vehicleId: 'v1', transactionType: 'revenue', amount: 1000, date: '2025-01-15', month: '2025-01' },
            ];
            sqlite_1.vehicleTransactionsAdapter.getByVehicleId.mockReturnValue(mockTransactions);
            const res = await (0, supertest_1.default)(app).get('/api/vehicle-transactions?vehicleId=v1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockTransactions);
            expect(sqlite_1.vehicleTransactionsAdapter.getByVehicleId).toHaveBeenCalledWith('v1');
        });
        it('should filter by vehicleId and month query parameters', async () => {
            const mockTransactions = [
                { id: '1', vehicleId: 'v1', transactionType: 'revenue', amount: 1000, date: '2025-01-15', month: '2025-01' },
            ];
            sqlite_1.vehicleTransactionsAdapter.getByVehicleIdAndMonth.mockReturnValue(mockTransactions);
            const res = await (0, supertest_1.default)(app).get('/api/vehicle-transactions?vehicleId=v1&month=2025-01');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockTransactions);
            expect(sqlite_1.vehicleTransactionsAdapter.getByVehicleIdAndMonth).toHaveBeenCalledWith('v1', '2025-01');
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.getAll.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/vehicle-transactions');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // GET /api/vehicle-transactions/:id
    describe('GET /:id', () => {
        it('should return transaction by id', async () => {
            const mockTransaction = {
                id: '1',
                vehicleId: 'v1',
                transactionType: 'revenue',
                amount: 1000,
                date: '2025-01-15',
                month: '2025-01',
            };
            sqlite_1.vehicleTransactionsAdapter.getById.mockReturnValue(mockTransaction);
            const res = await (0, supertest_1.default)(app).get('/api/vehicle-transactions/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockTransaction);
            expect(sqlite_1.vehicleTransactionsAdapter.getById).toHaveBeenCalledWith('1');
        });
        it('should return 404 if transaction not found', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.getById.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).get('/api/vehicle-transactions/999');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Transaction not found' });
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.getById.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/vehicle-transactions/1');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // POST /api/vehicle-transactions
    describe('POST /', () => {
        const newTransaction = {
            vehicleId: 'v1',
            transactionType: 'revenue',
            category: 'Rental Income',
            amount: 1000,
            date: '2025-01-15',
            month: '2025-01',
        };
        it('should create a new transaction', async () => {
            const createdTransaction = { ...newTransaction, id: '1' };
            sqlite_1.vehicleTransactionsAdapter.create.mockReturnValue(createdTransaction);
            const res = await (0, supertest_1.default)(app).post('/api/vehicle-transactions').send(newTransaction);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(createdTransaction);
            expect(sqlite_1.vehicleTransactionsAdapter.create).toHaveBeenCalledWith(newTransaction);
        });
        it('should return 400 if vehicle does not exist', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.create.mockImplementation(() => {
                throw new Error('Vehicle with ID "v1" does not exist');
            });
            const res = await (0, supertest_1.default)(app).post('/api/vehicle-transactions').send(newTransaction);
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Vehicle with ID "v1" does not exist' });
        });
        it('should return 400 if amount is not positive', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.create.mockImplementation(() => {
                throw new Error('Transaction amount must be greater than 0');
            });
            const res = await (0, supertest_1.default)(app).post('/api/vehicle-transactions').send(newTransaction);
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Transaction amount must be greater than 0' });
        });
        it('should return 400 if date is in the future', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.create.mockImplementation(() => {
                throw new Error('Transaction date cannot be in the future');
            });
            const res = await (0, supertest_1.default)(app).post('/api/vehicle-transactions').send(newTransaction);
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Transaction date cannot be in the future' });
        });
        it('should return 400 if date is more than 12 months in the past', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.create.mockImplementation(() => {
                throw new Error('Transaction date cannot be more than 12 months in the past');
            });
            const res = await (0, supertest_1.default)(app).post('/api/vehicle-transactions').send(newTransaction);
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Transaction date cannot be more than 12 months in the past' });
        });
        it('should return 400 if employee does not exist', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.create.mockImplementation(() => {
                throw new Error('Employee with ID "e1" does not exist');
            });
            const res = await (0, supertest_1.default)(app).post('/api/vehicle-transactions').send({ ...newTransaction, employeeId: 'e1' });
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Employee with ID "e1" does not exist' });
        });
        it('should handle general errors', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.create.mockImplementation(() => {
                throw new Error('Unexpected error');
            });
            const res = await (0, supertest_1.default)(app).post('/api/vehicle-transactions').send(newTransaction);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Unexpected error' });
        });
    });
    // PUT /api/vehicle-transactions/:id
    describe('PUT /:id', () => {
        const updateData = { amount: 1500 };
        it('should update a transaction', async () => {
            const updatedTransaction = {
                id: '1',
                vehicleId: 'v1',
                transactionType: 'revenue',
                amount: 1500,
                date: '2025-01-15',
                month: '2025-01',
            };
            sqlite_1.vehicleTransactionsAdapter.update.mockReturnValue(updatedTransaction);
            const res = await (0, supertest_1.default)(app).put('/api/vehicle-transactions/1').send(updateData);
            expect(res.status).toBe(200);
            expect(res.body).toEqual(updatedTransaction);
            expect(sqlite_1.vehicleTransactionsAdapter.update).toHaveBeenCalledWith('1', updateData);
        });
        it('should return 404 if transaction not found', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.update.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).put('/api/vehicle-transactions/999').send(updateData);
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Transaction not found' });
        });
        it('should return 400 for validation errors', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.update.mockImplementation(() => {
                throw new Error('Transaction amount must be greater than 0');
            });
            const res = await (0, supertest_1.default)(app).put('/api/vehicle-transactions/1').send(updateData);
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Transaction amount must be greater than 0' });
        });
        it('should handle general errors', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.update.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).put('/api/vehicle-transactions/1').send(updateData);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // DELETE /api/vehicle-transactions/:id
    describe('DELETE /:id', () => {
        it('should delete a transaction', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.delete.mockReturnValue(undefined);
            const res = await (0, supertest_1.default)(app).delete('/api/vehicle-transactions/1');
            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
            expect(sqlite_1.vehicleTransactionsAdapter.delete).toHaveBeenCalledWith('1');
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.vehicleTransactionsAdapter.delete.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).delete('/api/vehicle-transactions/1');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
});
