"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const purchase_orders_1 = __importDefault(require("../routes/purchase-orders"));
// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    purchaseOrdersAdapter: {
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
app.use('/api/purchase-orders', purchase_orders_1.default);
describe('Purchase Orders API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // GET /api/purchase-orders
    describe('GET /', () => {
        it('should return all purchase orders', async () => {
            const mockPOs = [{ id: '1', number: 'PO-001' }];
            sqlite_1.purchaseOrdersAdapter.getAll.mockReturnValue(mockPOs);
            const res = await (0, supertest_1.default)(app).get('/api/purchase-orders');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockPOs);
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.purchaseOrdersAdapter.getAll.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/purchase-orders');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // GET /api/purchase-orders/:id
    describe('GET /:id', () => {
        it('should return a PO by id', async () => {
            const mockPO = { id: '1', number: 'PO-001' };
            sqlite_1.purchaseOrdersAdapter.getById.mockReturnValue(mockPO);
            const res = await (0, supertest_1.default)(app).get('/api/purchase-orders/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockPO);
        });
        it('should return 404 if PO not found', async () => {
            ;
            sqlite_1.purchaseOrdersAdapter.getById.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).get('/api/purchase-orders/999');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Purchase order not found' });
        });
    });
    // POST /api/purchase-orders
    describe('POST /', () => {
        const newPO = { number: 'PO-002', vendorId: 'v1' };
        it('should create a new PO', async () => {
            const createdPO = { ...newPO, id: '2' };
            sqlite_1.purchaseOrdersAdapter.create.mockReturnValue(createdPO);
            const res = await (0, supertest_1.default)(app).post('/api/purchase-orders').send(newPO);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(createdPO);
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.purchaseOrdersAdapter.create.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).post('/api/purchase-orders').send(newPO);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // PUT /api/purchase-orders/:id
    describe('PUT /:id', () => {
        const updateData = { status: 'Sent' };
        it('should update a PO', async () => {
            const updatedPO = { id: '1', ...updateData };
            sqlite_1.purchaseOrdersAdapter.update.mockReturnValue(updatedPO);
            const res = await (0, supertest_1.default)(app).put('/api/purchase-orders/1').send(updateData);
            expect(res.status).toBe(200);
            expect(res.body).toEqual(updatedPO);
        });
        it('should return 404 if PO not found', async () => {
            ;
            sqlite_1.purchaseOrdersAdapter.update.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).put('/api/purchase-orders/999').send(updateData);
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Purchase order not found' });
        });
    });
    // DELETE /api/purchase-orders/:id
    describe('DELETE /:id', () => {
        it('should delete a PO', async () => {
            ;
            sqlite_1.purchaseOrdersAdapter.delete.mockReturnValue(undefined);
            const res = await (0, supertest_1.default)(app).delete('/api/purchase-orders/1');
            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
        });
        it('should verify database references if FOREIGN KEY error occurs', async () => {
            // Simulate FOREIGN KEY error
            ;
            sqlite_1.purchaseOrdersAdapter.delete.mockImplementation(() => {
                throw new Error('FOREIGN KEY constraint failed');
            });
            // Mock database Query to find references
            const mockAll = jest.fn().mockReturnValue([{ number: 'INV-101' }]);
            const mockPrepare = jest.fn().mockReturnValue({ all: mockAll });
            mockDb.prepare = mockPrepare;
            const res = await (0, supertest_1.default)(app).delete('/api/purchase-orders/1');
            expect(res.status).toBe(409);
            // The mocked formatReferenceError returns this string
            expect(res.body).toEqual({ error: 'Cannot delete Purchase Order as it is referenced' });
            // Verify DB was queried
            expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT number FROM invoices'));
            expect(mockAll).toHaveBeenCalledWith('1');
        });
        it('should handle general errors', async () => {
            ;
            sqlite_1.purchaseOrdersAdapter.delete.mockImplementation(() => {
                throw new Error('General error');
            });
            const res = await (0, supertest_1.default)(app).delete('/api/purchase-orders/1');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'General error' });
        });
    });
});
