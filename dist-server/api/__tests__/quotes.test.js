"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const quotes_1 = __importDefault(require("../routes/quotes"));
const sqlite_1 = require("../adapters/sqlite");
// Mock dependencies
jest.mock('../adapters/sqlite', () => ({
    quotesAdapter: {
        getAll: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
    }
}));
jest.mock('../../lib/database', () => ({
    getDatabase: jest.fn()
}));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/quotes', quotes_1.default);
describe('Quotes API Routes', () => {
    const mockQuote = { id: 'q1', number: 'Q-001', customer: { id: 'c1' }, items: [], total: 100 };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('GET /quotes', () => {
        test('should return all quotes', async () => {
            sqlite_1.quotesAdapter.getAll.mockReturnValue([mockQuote]);
            const response = await (0, supertest_1.default)(app).get('/quotes');
            expect(response.status).toBe(200);
            expect(response.body).toEqual([mockQuote]);
            expect(sqlite_1.quotesAdapter.getAll).toHaveBeenCalled();
        });
        test('should handle errors', async () => {
            sqlite_1.quotesAdapter.getAll.mockImplementation(() => { throw new Error('DB Error'); });
            const response = await (0, supertest_1.default)(app).get('/quotes');
            expect(response.status).toBe(500);
            expect(response.body.error).toBe('DB Error');
        });
    });
    describe('GET /quotes/:id', () => {
        test('should return a quote by id', async () => {
            sqlite_1.quotesAdapter.getById.mockReturnValue(mockQuote);
            const response = await (0, supertest_1.default)(app).get('/quotes/q1');
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockQuote);
            expect(sqlite_1.quotesAdapter.getById).toHaveBeenCalledWith('q1');
        });
        test('should return 404 if not found', async () => {
            sqlite_1.quotesAdapter.getById.mockReturnValue(undefined);
            const response = await (0, supertest_1.default)(app).get('/quotes/nonexistent');
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Quote not found');
        });
    });
    describe('POST /quotes', () => {
        test('should create a new quote', async () => {
            sqlite_1.quotesAdapter.create.mockReturnValue(mockQuote);
            const response = await (0, supertest_1.default)(app).post('/quotes').send(mockQuote);
            expect(response.status).toBe(201);
            expect(response.body).toEqual(mockQuote);
            expect(sqlite_1.quotesAdapter.create).toHaveBeenCalledWith(mockQuote);
        });
    });
    describe('DELETE /quotes/:id', () => {
        test('should delete a quote', async () => {
            const response = await (0, supertest_1.default)(app).delete('/quotes/q1');
            expect(response.status).toBe(204);
            expect(sqlite_1.quotesAdapter.delete).toHaveBeenCalledWith('q1');
        });
    });
});
