"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const expense_categories_1 = __importDefault(require("../routes/expense-categories"));
// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    expenseCategoriesAdapter: {
        getAll: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}));
const sqlite_1 = require("../adapters/sqlite");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/expense-categories', expense_categories_1.default);
describe('Expense Categories API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // GET /api/expense-categories
    describe('GET /', () => {
        it('should return all categories', async () => {
            const mockCategories = [
                { id: '1', name: 'Purchase', isCustom: false },
                { id: '2', name: 'Maintenance', isCustom: false },
                { id: '3', name: 'Custom Category', isCustom: true },
            ];
            sqlite_1.expenseCategoriesAdapter.getAll.mockReturnValue(mockCategories);
            const res = await (0, supertest_1.default)(app).get('/api/expense-categories');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockCategories);
            expect(sqlite_1.expenseCategoriesAdapter.getAll).toHaveBeenCalledTimes(1);
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.expenseCategoriesAdapter.getAll.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/expense-categories');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // GET /api/expense-categories/:id
    describe('GET /:id', () => {
        it('should return category by id', async () => {
            const mockCategory = { id: '1', name: 'Purchase', isCustom: false };
            sqlite_1.expenseCategoriesAdapter.getById.mockReturnValue(mockCategory);
            const res = await (0, supertest_1.default)(app).get('/api/expense-categories/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockCategory);
            expect(sqlite_1.expenseCategoriesAdapter.getById).toHaveBeenCalledWith('1');
        });
        it('should return 404 if category not found', async () => {
            ;
            sqlite_1.expenseCategoriesAdapter.getById.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).get('/api/expense-categories/999');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Category not found' });
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.expenseCategoriesAdapter.getById.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/expense-categories/1');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // POST /api/expense-categories
    describe('POST /', () => {
        const newCategory = { name: 'Custom Category', isCustom: true };
        it('should create a new category', async () => {
            const createdCategory = { ...newCategory, id: '3' };
            sqlite_1.expenseCategoriesAdapter.create.mockReturnValue(createdCategory);
            const res = await (0, supertest_1.default)(app).post('/api/expense-categories').send(newCategory);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(createdCategory);
            expect(sqlite_1.expenseCategoriesAdapter.create).toHaveBeenCalledWith(newCategory);
        });
        it('should return 400 if name is required', async () => {
            ;
            sqlite_1.expenseCategoriesAdapter.create.mockImplementation(() => {
                throw new Error('Category name is required');
            });
            const res = await (0, supertest_1.default)(app).post('/api/expense-categories').send({ isCustom: true });
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Category name is required' });
        });
        it('should return 400 for UNIQUE constraint violation', async () => {
            ;
            sqlite_1.expenseCategoriesAdapter.create.mockImplementation(() => {
                throw new Error('UNIQUE constraint failed: expense_categories.name');
            });
            const res = await (0, supertest_1.default)(app).post('/api/expense-categories').send(newCategory);
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'UNIQUE constraint failed: expense_categories.name' });
        });
        it('should handle general errors', async () => {
            ;
            sqlite_1.expenseCategoriesAdapter.create.mockImplementation(() => {
                throw new Error('Unexpected error');
            });
            const res = await (0, supertest_1.default)(app).post('/api/expense-categories').send(newCategory);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Unexpected error' });
        });
    });
    // PUT /api/expense-categories/:id
    describe('PUT /:id', () => {
        const updateData = { name: 'Updated Category' };
        it('should update a category', async () => {
            const updatedCategory = { id: '1', name: 'Updated Category', isCustom: true };
            sqlite_1.expenseCategoriesAdapter.update.mockReturnValue(updatedCategory);
            const res = await (0, supertest_1.default)(app).put('/api/expense-categories/1').send(updateData);
            expect(res.status).toBe(200);
            expect(res.body).toEqual(updatedCategory);
            expect(sqlite_1.expenseCategoriesAdapter.update).toHaveBeenCalledWith('1', updateData);
        });
        it('should return 404 if category not found', async () => {
            ;
            sqlite_1.expenseCategoriesAdapter.update.mockReturnValue(null);
            const res = await (0, supertest_1.default)(app).put('/api/expense-categories/999').send(updateData);
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Category not found' });
        });
        it('should return 400 for UNIQUE constraint violation', async () => {
            ;
            sqlite_1.expenseCategoriesAdapter.update.mockImplementation(() => {
                throw new Error('UNIQUE constraint failed: expense_categories.name');
            });
            const res = await (0, supertest_1.default)(app).put('/api/expense-categories/1').send(updateData);
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'UNIQUE constraint failed: expense_categories.name' });
        });
        it('should handle general errors', async () => {
            ;
            sqlite_1.expenseCategoriesAdapter.update.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).put('/api/expense-categories/1').send(updateData);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // DELETE /api/expense-categories/:id
    describe('DELETE /:id', () => {
        it('should delete a category', async () => {
            ;
            sqlite_1.expenseCategoriesAdapter.delete.mockReturnValue(undefined);
            const res = await (0, supertest_1.default)(app).delete('/api/expense-categories/1');
            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
            expect(sqlite_1.expenseCategoriesAdapter.delete).toHaveBeenCalledWith('1');
        });
        it('should return 409 if category is referenced', async () => {
            ;
            sqlite_1.expenseCategoriesAdapter.delete.mockImplementation(() => {
                throw new Error('Cannot delete category as it is referenced in vehicle transactions');
            });
            const res = await (0, supertest_1.default)(app).delete('/api/expense-categories/1');
            expect(res.status).toBe(409);
            expect(res.body).toEqual({ error: 'Cannot delete category as it is referenced in vehicle transactions' });
        });
        it('should handle general errors', async () => {
            ;
            sqlite_1.expenseCategoriesAdapter.delete.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).delete('/api/expense-categories/1');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
});
