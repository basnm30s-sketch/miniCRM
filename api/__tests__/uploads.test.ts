import request from 'supertest'
import express from 'express'
import uploadsRouter from '../routes/uploads'

// Mock the service
jest.mock('../services/file-storage', () => ({
    saveFile: jest.fn(),
    saveBrandingFile: jest.fn(),
    readFile: jest.fn(),
    deleteFile: jest.fn(),
    fileExists: jest.fn(),
    checkBrandingFiles: jest.fn(),
}))

import { saveFile, saveBrandingFile, readFile, fileExists, checkBrandingFiles, deleteFile } from '../services/file-storage'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api/uploads', uploadsRouter)

describe('Uploads API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    // POST /api/uploads (General)
    describe('POST /', () => {
        it('should upload a general file', async () => {
            ; (saveFile as jest.Mock).mockReturnValue('./data/uploads/logos/test.png')

            const res = await request(app)
                .post('/api/uploads')
                .field('type', 'logos')
                .attach('file', Buffer.from('fake-image-content'), 'test.png')

            expect(res.status).toBe(200)
            expect(res.body).toEqual({ path: './data/uploads/logos/test.png' })
            expect(saveFile).toHaveBeenCalled()
        })

        it('should upload a branding file', async () => {
            ; (saveBrandingFile as jest.Mock).mockReturnValue('./data/branding/logo.png')

            const res = await request(app)
                .post('/api/uploads')
                .field('type', 'branding')
                .field('brandingType', 'logo')
                .attach('file', Buffer.from('fake-logo-content'), 'logo.png')

            expect(res.status).toBe(200)
            expect(res.body).toEqual({ success: true, type: 'logo' })
            expect(saveBrandingFile).toHaveBeenCalled()
        })

        it('should return 400 if no file attached', async () => {
            const res = await request(app).post('/api/uploads').field('type', 'logos')
            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'No file uploaded' })
        })

        it('should return 400 for invalid file type', async () => {
            const res = await request(app)
                .post('/api/uploads')
                .field('type', 'invalid-type')
                .attach('file', Buffer.from('content'), 'test.txt')

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'Invalid file type. Must be: logos, documents, signatures, or branding' })
        })
    })

    // GET /api/uploads/branding/check
    describe('GET /branding/check', () => {
        it('should return branding status', async () => {
            const mockStatus = { logo: true, seal: false, extensions: { logo: 'png', seal: null } }
                ; (checkBrandingFiles as jest.Mock).mockReturnValue(mockStatus)

            const res = await request(app).get('/api/uploads/branding/check')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockStatus)
        })
    })

    // GET /api/uploads/branding/:filename
    describe('GET /branding/:filename', () => {
        it('should return branding file content', async () => {
            ; (fileExists as jest.Mock).mockReturnValue(true)
                ; (readFile as jest.Mock).mockReturnValue(Buffer.from('image'))

            const res = await request(app).get('/api/uploads/branding/logo.png')

            expect(res.status).toBe(200)
            expect(res.headers['content-type']).toContain('image/png')
            expect(readFile).toHaveBeenCalledWith('./data/branding/logo.png')
        })

        it('should return 404 if branding file does not exist', async () => {
            ; (fileExists as jest.Mock).mockReturnValue(false)

            const res = await request(app).get('/api/uploads/branding/unknown.png')

            expect(res.status).toBe(404)
        })
    })

    // GET /api/uploads/:type/:filename
    describe('GET /:type/:filename', () => {
        it('should return file content', async () => {
            ; (fileExists as jest.Mock).mockReturnValue(true)
                ; (readFile as jest.Mock).mockReturnValue(Buffer.from('pdf-content'))

            const res = await request(app).get('/api/uploads/documents/doc.pdf')

            expect(res.status).toBe(200)
            expect(res.headers['content-type']).toContain('application/pdf')
            expect(readFile).toHaveBeenCalledWith('./data/uploads/documents/doc.pdf')
        })

        it('should return 400 for invalid type', async () => {
            const res = await request(app).get('/api/uploads/hacking/doc.pdf')
            expect(res.status).toBe(400)
        })

        it('should return 404 if file does not exist', async () => {
            ; (fileExists as jest.Mock).mockReturnValue(false)
            const res = await request(app).get('/api/uploads/documents/missing.pdf')
            expect(res.status).toBe(404)
        })
    })

    // DELETE /api/uploads/:type/:filename
    describe('DELETE /:type/:filename', () => {
        it('should delete a file', async () => {
            ; (deleteFile as jest.Mock).mockImplementation(() => { })

            const res = await request(app).delete('/api/uploads/documents/doc.pdf')

            expect(res.status).toBe(204)
            expect(deleteFile).toHaveBeenCalledWith('./data/uploads/documents/doc.pdf')
        })

        it('should return 400 for invalid type', async () => {
            const res = await request(app).delete('/api/uploads/hacking/doc.pdf')
            expect(res.status).toBe(400)
        })
    })
})
