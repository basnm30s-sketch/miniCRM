import request from 'supertest';
import express from 'express';
import quotesRouter from '../routes/quotes';
import { quotesAdapter } from '../adapters/sqlite';

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

const app = express();
app.use(express.json());
app.use('/quotes', quotesRouter);

describe('Quotes API Routes', () => {
    const mockQuote = { id: 'q1', number: 'Q-001', customer: { id: 'c1' }, items: [], total: 100 };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /quotes', () => {
        test('should return all quotes', async () => {
            (quotesAdapter.getAll as jest.Mock).mockReturnValue([mockQuote]);

            const response = await request(app).get('/quotes');
            expect(response.status).toBe(200);
            expect(response.body).toEqual([mockQuote]);
            expect(quotesAdapter.getAll).toHaveBeenCalled();
        });

        test('should handle errors', async () => {
            (quotesAdapter.getAll as jest.Mock).mockImplementation(() => { throw new Error('DB Error'); });

            const response = await request(app).get('/quotes');
            expect(response.status).toBe(500);
            expect(response.body.error).toBe('DB Error');
        });
    });

    describe('GET /quotes/:id', () => {
        test('should return a quote by id', async () => {
            (quotesAdapter.getById as jest.Mock).mockReturnValue(mockQuote);

            const response = await request(app).get('/quotes/q1');
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockQuote);
            expect(quotesAdapter.getById).toHaveBeenCalledWith('q1');
        });

        test('should return 404 if not found', async () => {
            (quotesAdapter.getById as jest.Mock).mockReturnValue(undefined);

            const response = await request(app).get('/quotes/nonexistent');
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Quote not found');
        });
    });

    describe('POST /quotes', () => {
        test('should create a new quote', async () => {
            (quotesAdapter.create as jest.Mock).mockReturnValue(mockQuote);

            const response = await request(app).post('/quotes').send(mockQuote);
            expect(response.status).toBe(201);
            expect(response.body).toEqual(mockQuote);
            expect(quotesAdapter.create).toHaveBeenCalledWith(mockQuote);
        });
    });

    describe('DELETE /quotes/:id', () => {
        test('should delete a quote', async () => {
            const response = await request(app).delete('/quotes/q1');
            expect(response.status).toBe(204);
            expect(quotesAdapter.delete).toHaveBeenCalledWith('q1');
        });
    });
});
