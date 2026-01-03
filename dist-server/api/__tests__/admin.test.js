"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const admin_1 = __importDefault(require("../routes/admin"));
// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    adminAdapter: {
        get: jest.fn(),
        save: jest.fn(),
    },
}));
const sqlite_1 = require("../adapters/sqlite");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/admin', admin_1.default);
describe('Admin API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // GET /api/admin/settings
    describe('GET /settings', () => {
        it('should return admin settings', async () => {
            const mockSettings = { companyName: 'My Company' };
            sqlite_1.adminAdapter.get.mockReturnValue(mockSettings);
            const res = await (0, supertest_1.default)(app).get('/api/admin/settings');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockSettings);
            expect(sqlite_1.adminAdapter.get).toHaveBeenCalledTimes(1);
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.adminAdapter.get.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).get('/api/admin/settings');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // POST /api/admin/settings
    describe('POST /settings', () => {
        const newSettings = { companyName: 'New Company Name' };
        it('should save settings via POST', async () => {
            ;
            sqlite_1.adminAdapter.save.mockReturnValue(newSettings);
            const res = await (0, supertest_1.default)(app).post('/api/admin/settings').send(newSettings);
            expect(res.status).toBe(200);
            expect(res.body).toEqual(newSettings);
            expect(sqlite_1.adminAdapter.save).toHaveBeenCalledWith(newSettings);
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.adminAdapter.save.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).post('/api/admin/settings').send(newSettings);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
    // PUT /api/admin/settings
    describe('PUT /settings', () => {
        const newSettings = { companyName: 'Updated Company Name' };
        it('should save settings via PUT', async () => {
            ;
            sqlite_1.adminAdapter.save.mockReturnValue(newSettings);
            const res = await (0, supertest_1.default)(app).put('/api/admin/settings').send(newSettings);
            expect(res.status).toBe(200);
            expect(res.body).toEqual(newSettings);
            expect(sqlite_1.adminAdapter.save).toHaveBeenCalledWith(newSettings);
        });
        it('should handle errors', async () => {
            ;
            sqlite_1.adminAdapter.save.mockImplementation(() => {
                throw new Error('Database error');
            });
            const res = await (0, supertest_1.default)(app).put('/api/admin/settings').send(newSettings);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
});
