"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const customers_1 = __importDefault(require("../routes/customers"));
// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    customersAdapter: {
        getAll: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    formatReferenceError: jest.fn((entity, refs) => `Cannot delete ${entity} as it is referenced in other records`),
}));
// Mock database for complex delete logic if needed, but we can stick to error message mocking for now
jest.mock('../../lib/database', () => ({
    getDatabase: jest.fn(),
}));
const sqlite_1 = require("../adapters/sqlite");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/customers', customers_1.default);
describe('Customers API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // GET /api/customers
    describe('GET /', () => {
        it('should return all customers', async () => {
            const mockCustomers = [{ id: '1', name: 'John Doe' }];
            sqlite_1.customersAdapter.getAll.mockReturnValue(mockCustomers);
            const res = await (0, supertest_1.default)(app).get('/api/customers');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockCustomers);
            expect(sqlite_1.customersAdapter.getAll).toHaveBeenCalledTimes(1);
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.customersAdapter.getAll.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/customers');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // GET /api/customers/:id
    describe('GET /:id', () => {
        it('should return a customer by id', async () => {
            const mockCustomer = { id: '1', name: 'John Doe' };
            sqlite_1.customersAdapter.getById.mockReturnValue(mockCustomer);
            const res = await (0, supertest_1.default)(app).get('/api/customers/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockCustomer);
            expect(sqlite_1.customersAdapter.getById).toHaveBeenCalledWith('1');
        });
        it('should return 404 if customer not found', async () => {
            ;
            sqlite_1.customersAdapter.getById.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).get('/api/customers/999');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Customer not found' });
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.customersAdapter.getById.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/customers/1');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // POST /api/customers
    describe('POST /', () => {
        const newCustomer = { name: 'Jane Doe', email: 'jane@example.com' };
        it('should create a new customer', async () => {
            const createdCustomer = { ...newCustomer, id: '2' };
            sqlite_1.customersAdapter.create.mockReturnValue(createdCustomer);
            const res = await (0, supertest_1.default)(app).post('/api/customers').send(newCustomer);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(createdCustomer);
            expect(sqlite_1.customersAdapter.create).toHaveBeenCalledWith(newCustomer);
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.customersAdapter.create.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).post('/api/customers').send(newCustomer);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // PUT /api/customers/:id
    describe('PUT /:id', () => {
        const updateData = { name: 'John Updated' };
        it('should update a customer', async () => {
            const updatedCustomer = { id: '1', name: 'John Updated' };
            sqlite_1.customersAdapter.update.mockReturnValue(updatedCustomer);
            const res = await (0, supertest_1.default)(app).put('/api/customers/1').send(updateData);
            expect(res.status).toBe(200);
            expect(res.body).toEqual(updatedCustomer);
            expect(sqlite_1.customersAdapter.update).toHaveBeenCalledWith('1', updateData);
        });
        it('should return 404 if customer not found', async () => {
            ;
            sqlite_1.customersAdapter.update.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).put('/api/customers/999').send(updateData);
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Customer not found' });
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.customersAdapter.update.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).put('/api/customers/1').send(updateData);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // DELETE /api/customers/:id
    describe('DELETE /:id', () => {
        it('should delete a customer', async () => {
            ;
            sqlite_1.customersAdapter.delete.mockReturnValue(undefined);
            const res = await (0, supertest_1.default)(app).delete('/api/customers/1');
            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
            expect(sqlite_1.customersAdapter.delete).toHaveBeenCalledWith('1');
        });
        it('should return 409 if customer is referenced (formatted error)', async () => {
            ;
            sqlite_1.customersAdapter.delete.mockImplementation(() => {
                throw new Error('Cannot delete Customer as it is referenced in other records');
            });
            const res = await (0, supertest_1.default)(app).delete('/api/customers/1');
            expect(res.status).toBe(409);
            expect(res.body).toEqual({ error: 'Cannot delete Customer as it is referenced in other records' });
        });
        it('should handle other errors', async () => {
            ;
            sqlite_1.customersAdapter.delete.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).delete('/api/customers/1');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
});
