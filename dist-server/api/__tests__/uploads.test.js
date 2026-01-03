"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const uploads_1 = __importDefault(require("../routes/uploads"));
// Mock the service
jest.mock('../services/file-storage', () => ({
    saveFile: jest.fn(),
    saveBrandingFile: jest.fn(),
    readFile: jest.fn(),
    deleteFile: jest.fn(),
    fileExists: jest.fn(),
    checkBrandingFiles: jest.fn(),
}));
const file_storage_1 = require("../services/file-storage");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/uploads', uploads_1.default);
describe('Uploads API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // POST /api/uploads (General)
    describe('POST /', () => {
        it('should upload a general file', async () => {
            ;
            file_storage_1.saveFile.mockReturnValue('./data/uploads/logos/test.png');
            const res = await (0, supertest_1.default)(app)
                .post('/api/uploads')
                .field('type', 'logos')
                .attach('file', Buffer.from('fake-image-content'), 'test.png');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ path: './data/uploads/logos/test.png' });
            expect(file_storage_1.saveFile).toHaveBeenCalled();
        });
        it('should upload a branding file', async () => {
            ;
            file_storage_1.saveBrandingFile.mockReturnValue('./data/branding/logo.png');
            const res = await (0, supertest_1.default)(app)
                .post('/api/uploads')
                .field('type', 'branding')
                .field('brandingType', 'logo')
                .attach('file', Buffer.from('fake-logo-content'), 'logo.png');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, type: 'logo' });
            expect(file_storage_1.saveBrandingFile).toHaveBeenCalled();
        });
        it('should return 400 if no file attached', async () => {
            const res = await (0, supertest_1.default)(app).post('/api/uploads').field('type', 'logos');
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'No file uploaded' });
        });
        it('should return 400 for invalid file type', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/uploads')
                .field('type', 'invalid-type')
                .attach('file', Buffer.from('content'), 'test.txt');
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Invalid file type. Must be: logos, documents, signatures, or branding' });
        });
    });
    // GET /api/uploads/branding/check
    describe('GET /branding/check', () => {
        it('should return branding status', async () => {
            const mockStatus = { logo: true, seal: false, extensions: { logo: 'png', seal: null } };
            file_storage_1.checkBrandingFiles.mockReturnValue(mockStatus);
            const res = await (0, supertest_1.default)(app).get('/api/uploads/branding/check');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockStatus);
        });
    });
    // GET /api/uploads/branding/:filename
    describe('GET /branding/:filename', () => {
        it('should return branding file content', async () => {
            ;
            file_storage_1.fileExists.mockReturnValue(true);
            file_storage_1.readFile.mockReturnValue(Buffer.from('image'));
            const res = await (0, supertest_1.default)(app).get('/api/uploads/branding/logo.png');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('image/png');
            expect(file_storage_1.readFile).toHaveBeenCalledWith('./data/branding/logo.png');
        });
        it('should return 404 if branding file does not exist', async () => {
            ;
            file_storage_1.fileExists.mockReturnValue(false);
            const res = await (0, supertest_1.default)(app).get('/api/uploads/branding/unknown.png');
            expect(res.status).toBe(404);
        });
    });
    // GET /api/uploads/:type/:filename
    describe('GET /:type/:filename', () => {
        it('should return file content', async () => {
            ;
            file_storage_1.fileExists.mockReturnValue(true);
            file_storage_1.readFile.mockReturnValue(Buffer.from('pdf-content'));
            const res = await (0, supertest_1.default)(app).get('/api/uploads/documents/doc.pdf');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('application/pdf');
            expect(file_storage_1.readFile).toHaveBeenCalledWith('./data/uploads/documents/doc.pdf');
        });
        it('should return 400 for invalid type', async () => {
            const res = await (0, supertest_1.default)(app).get('/api/uploads/hacking/doc.pdf');
            expect(res.status).toBe(400);
        });
        it('should return 404 if file does not exist', async () => {
            ;
            file_storage_1.fileExists.mockReturnValue(false);
            const res = await (0, supertest_1.default)(app).get('/api/uploads/documents/missing.pdf');
            expect(res.status).toBe(404);
        });
    });
    // DELETE /api/uploads/:type/:filename
    describe('DELETE /:type/:filename', () => {
        it('should delete a file', async () => {
            ;
            file_storage_1.deleteFile.mockImplementation(() => { });
            const res = await (0, supertest_1.default)(app).delete('/api/uploads/documents/doc.pdf');
            expect(res.status).toBe(204);
            expect(file_storage_1.deleteFile).toHaveBeenCalledWith('./data/uploads/documents/doc.pdf');
        });
        it('should return 400 for invalid type', async () => {
            const res = await (0, supertest_1.default)(app).delete('/api/uploads/hacking/doc.pdf');
            expect(res.status).toBe(400);
        });
    });
});
