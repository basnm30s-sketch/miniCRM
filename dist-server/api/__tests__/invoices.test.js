"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const invoices_1 = __importDefault(require("../routes/invoices"));
// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    invoicesAdapter: {
        getAll: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}));
// Import the mocked adapter to define return values
const sqlite_1 = require("../adapters/sqlite");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/invoices', invoices_1.default);
describe('Invoices API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // GET /api/invoices
    describe('GET /', () => {
        it('should return all invoices', async () => {
            const mockInvoices = [{ id: '1', number: 'INV-001' }, { id: '2', number: 'INV-002' }];
            sqlite_1.invoicesAdapter.getAll.mockReturnValue(mockInvoices);
            const res = await (0, supertest_1.default)(app).get('/api/invoices');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockInvoices);
            expect(sqlite_1.invoicesAdapter.getAll).toHaveBeenCalledTimes(1);
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.invoicesAdapter.getAll.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/invoices');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // GET /api/invoices/:id
    describe('GET /:id', () => {
        it('should return an invoice by id', async () => {
            const mockInvoice = { id: '1', number: 'INV-001' };
            sqlite_1.invoicesAdapter.getById.mockReturnValue(mockInvoice);
            const res = await (0, supertest_1.default)(app).get('/api/invoices/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockInvoice);
            expect(sqlite_1.invoicesAdapter.getById).toHaveBeenCalledWith('1');
        });
        it('should return 404 if invoice not found', async () => {
            ;
            sqlite_1.invoicesAdapter.getById.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).get('/api/invoices/999');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Invoice not found' });
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.invoicesAdapter.getById.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/invoices/1');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // POST /api/invoices
    describe('POST /', () => {
        const newInvoice = { number: 'INV-003', customerId: 'cust-1', total: 1000 };
        it('should create a new invoice', async () => {
            const createdInvoice = { ...newInvoice, id: '3' };
            sqlite_1.invoicesAdapter.create.mockReturnValue(createdInvoice);
            const res = await (0, supertest_1.default)(app).post('/api/invoices').send(newInvoice);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(createdInvoice);
            expect(sqlite_1.invoicesAdapter.create).toHaveBeenCalledWith(newInvoice);
        });
        it('should return 400 for validation errors (does not exist)', async () => {
            ;
            sqlite_1.invoicesAdapter.create.mockImplementation(() => {
                throw new Error('Customer does not exist');
            });
            const res = await (0, supertest_1.default)(app).post('/api/invoices').send(newInvoice);
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Customer does not exist' });
        });
        it('should return 400 for validation errors (required field)', async () => {
            ;
            sqlite_1.invoicesAdapter.create.mockImplementation(() => {
                throw new Error('Field total is required');
            });
            const res = await (0, supertest_1.default)(app).post('/api/invoices').send(newInvoice);
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Field total is required' });
        });
        it('should return 500 for other errors', async () => {
            ;
            sqlite_1.invoicesAdapter.create.mockImplementation(() => {
                throw new Error('Unexpected error');
            });
            const res = await (0, supertest_1.default)(app).post('/api/invoices').send(newInvoice);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Unexpected error' });
        });
    });
    // PUT /api/invoices/:id
    describe('PUT /:id', () => {
        const updateData = { total: 2000 };
        it('should update an invoice', async () => {
            const updatedInvoice = { id: '1', number: 'INV-001', ...updateData };
            sqlite_1.invoicesAdapter.update.mockReturnValue(updatedInvoice);
            const res = await (0, supertest_1.default)(app).put('/api/invoices/1').send(updateData);
            expect(res.status).toBe(200);
            expect(res.body).toEqual(updatedInvoice);
            expect(sqlite_1.invoicesAdapter.update).toHaveBeenCalledWith('1', updateData);
        });
        it('should return 404 if invoice not found', async () => {
            ;
            sqlite_1.invoicesAdapter.update.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).put('/api/invoices/999').send(updateData);
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Invoice not found' });
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.invoicesAdapter.update.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).put('/api/invoices/1').send(updateData);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // DELETE /api/invoices/:id
    describe('DELETE /:id', () => {
        it('should delete an invoice', async () => {
            ;
            sqlite_1.invoicesAdapter.delete.mockReturnValue(undefined);
            const res = await (0, supertest_1.default)(app).delete('/api/invoices/1');
            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
            expect(sqlite_1.invoicesAdapter.delete).toHaveBeenCalledWith('1');
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.invoicesAdapter.delete.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).delete('/api/invoices/1');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
});
