"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const payslips_1 = __importDefault(require("../routes/payslips"));
// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    payslipsAdapter: {
        getAll: jest.fn(),
        getByMonth: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}));
const sqlite_1 = require("../adapters/sqlite");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/payslips', payslips_1.default);
describe('Payslips API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // GET /api/payslips/test
    describe('GET /test', () => {
        it('should return working message', async () => {
            const res = await (0, supertest_1.default)(app).get('/api/payslips/test');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ message: 'Payslips router is working' });
        });
    });
    // GET /api/payslips
    describe('GET /', () => {
        it('should return all payslips', async () => {
            const mockPayslips = [{ id: '1', month: '2025-01' }];
            sqlite_1.payslipsAdapter.getAll.mockReturnValue(mockPayslips);
            const res = await (0, supertest_1.default)(app).get('/api/payslips');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockPayslips);
        });
        it('should return empty array on errors instead of 500 (per implementation)', async () => {
            ;
            sqlite_1.payslipsAdapter.getAll.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/payslips');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });
    });
    // GET /api/payslips/month/:month
    describe('GET /month/:month', () => {
        it('should return payslips by month', async () => {
            const mockPayslips = [{ id: '1', month: '2025-01' }];
            sqlite_1.payslipsAdapter.getByMonth.mockReturnValue(mockPayslips);
            const res = await (0, supertest_1.default)(app).get('/api/payslips/month/2025-01');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockPayslips);
            expect(sqlite_1.payslipsAdapter.getByMonth).toHaveBeenCalledWith('2025-01');
        });
        it('should return 400 for invalid month format', async () => {
            const res = await (0, supertest_1.default)(app).get('/api/payslips/month/invalid-date');
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Invalid month format. Expected YYYY-MM' });
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.payslipsAdapter.getByMonth.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/payslips/month/2025-01');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // GET /api/payslips/:id
    describe('GET /:id', () => {
        it('should return filtered payslip filtered by id', async () => {
            const mockPayslip = { id: '1', month: '2025-01' };
            sqlite_1.payslipsAdapter.getById.mockReturnValue(mockPayslip);
            const res = await (0, supertest_1.default)(app).get('/api/payslips/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockPayslip);
        });
        it('should return 404 if unfiltered payslip not found', async () => {
            ;
            sqlite_1.payslipsAdapter.getById.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).get('/api/payslips/999');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Payslip not found' });
        });
    });
    // POST /api/payslips
    describe('POST /', () => {
        const newPayslip = { employeeId: 'emp-1', month: '2025-01', amount: 3000 };
        it('should create a new payslip', async () => {
            const createdPayslip = { ...newPayslip, id: '2' };
            sqlite_1.payslipsAdapter.create.mockReturnValue(createdPayslip);
            const res = await (0, supertest_1.default)(app).post('/api/payslips').send(newPayslip);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(createdPayslip);
            expect(sqlite_1.payslipsAdapter.create).toHaveBeenCalledWith(newPayslip);
        });
        it('should return 400 if missing required fields', async () => {
            const invalidPayslip = { amount: 3000 }; // Missing employeeId and month
            const res = await (0, supertest_1.default)(app).post('/api/payslips').send(invalidPayslip);
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'employeeId and month are required' });
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.payslipsAdapter.create.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).post('/api/payslips').send(newPayslip);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // PUT /api/payslips/:id
    describe('PUT /:id', () => {
        const updateData = { amount: 4000 };
        it('should update a payslip', async () => {
            const updatedPayslip = { id: '1', ...updateData };
            sqlite_1.payslipsAdapter.update.mockReturnValue(updatedPayslip);
            const res = await (0, supertest_1.default)(app).put('/api/payslips/1').send(updateData);
            expect(res.status).toBe(200);
            expect(res.body).toEqual(updatedPayslip);
            expect(sqlite_1.payslipsAdapter.update).toHaveBeenCalledWith('1', updateData);
        });
        it('should return 404 if payslip not found', async () => {
            ;
            sqlite_1.payslipsAdapter.update.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).put('/api/payslips/999').send(updateData);
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Payslip not found' });
        });
    });
    // DELETE /api/payslips/:id
    describe('DELETE /:id', () => {
        it('should delete a payslip', async () => {
            ;
            sqlite_1.payslipsAdapter.delete.mockReturnValue(undefined);
            const res = await (0, supertest_1.default)(app).delete('/api/payslips/1');
            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
            expect(sqlite_1.payslipsAdapter.delete).toHaveBeenCalledWith('1');
        });
    });
});
