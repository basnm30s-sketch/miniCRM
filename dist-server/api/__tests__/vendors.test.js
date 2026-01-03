"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const vendors_1 = __importDefault(require("../routes/vendors"));
// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    vendorsAdapter: {
        getAll: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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
app.use('/api/vendors', vendors_1.default);
describe('Vendors API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // GET /api/vendors
    describe('GET /', () => {
        it('should return all vendors', async () => {
            const mockVendors = [{ id: '1', name: 'Vendor A' }];
            sqlite_1.vendorsAdapter.getAll.mockReturnValue(mockVendors);
            const res = await (0, supertest_1.default)(app).get('/api/vendors');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockVendors);
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.vendorsAdapter.getAll.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/vendors');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // GET /api/vendors/:id
    describe('GET /:id', () => {
        it('should return a vendor by id', async () => {
            const mockVendor = { id: '1', name: 'Vendor A' };
            sqlite_1.vendorsAdapter.getById.mockReturnValue(mockVendor);
            const res = await (0, supertest_1.default)(app).get('/api/vendors/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockVendor);
        });
        it('should return 404 if vendor not found', async () => {
            ;
            sqlite_1.vendorsAdapter.getById.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).get('/api/vendors/999');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Vendor not found' });
        });
    });
    // POST /api/vendors
    describe('POST /', () => {
        const newVendor = { name: 'Vendor B' };
        it('should create a new vendor', async () => {
            const createdVendor = { ...newVendor, id: '2' };
            sqlite_1.vendorsAdapter.create.mockReturnValue(createdVendor);
            const res = await (0, supertest_1.default)(app).post('/api/vendors').send(newVendor);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(createdVendor);
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.vendorsAdapter.create.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).post('/api/vendors').send(newVendor);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // PUT /api/vendors/:id
    describe('PUT /:id', () => {
        const updateData = { name: 'Vendor Updated' };
        it('should update a vendor', async () => {
            const updatedVendor = { id: '1', name: 'Vendor Updated' };
            sqlite_1.vendorsAdapter.update.mockReturnValue(updatedVendor);
            const res = await (0, supertest_1.default)(app).put('/api/vendors/1').send(updateData);
            expect(res.status).toBe(200);
            expect(res.body).toEqual(updatedVendor);
        });
        it('should return 404 if vendor not found', async () => {
            ;
            sqlite_1.vendorsAdapter.update.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).put('/api/vendors/999').send(updateData);
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Vendor not found' });
        });
    });
    // DELETE /api/vendors/:id
    describe('DELETE /:id', () => {
        it('should delete a vendor', async () => {
            ;
            sqlite_1.vendorsAdapter.delete.mockReturnValue(undefined);
            const res = await (0, supertest_1.default)(app).delete('/api/vendors/1');
            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
        });
        it('should check DB references if FOREIGN KEY error occurs', async () => {
            // Simulate FOREIGN KEY error
            ;
            sqlite_1.vendorsAdapter.delete.mockImplementation(() => {
                throw new Error('FOREIGN KEY constraint failed');
            });
            // Mock database Query to find references (POs and Invoices)
            mockDb.prepare.mockImplementation((query) => {
                if (query.includes('purchase_orders')) {
                    return { all: () => [{ number: 'PO-100' }] };
                }
                if (query.includes('invoices')) {
                    return { all: () => [{ number: 'INV-100' }] };
                }
                return { all: () => [] };
            });
            const res = await (0, supertest_1.default)(app).delete('/api/vendors/1');
            expect(res.status).toBe(409);
            expect(res.body).toEqual({ error: 'Cannot delete Vendor as it is referenced' });
            // Verify DB was queried
            expect(mockDb.prepare).toHaveBeenCalledTimes(2);
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('purchase_orders'));
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('invoices'));
        });
        it('should handle general errors', async () => {
            ;
            sqlite_1.vendorsAdapter.delete.mockImplementation(() => {
                throw new Error('General error');
            });
            const res = await (0, supertest_1.default)(app).delete('/api/vendors/1');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'General error' });
        });
    });
});
