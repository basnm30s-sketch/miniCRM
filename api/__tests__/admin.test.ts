import request from 'supertest'
import express from 'express'
import adminRouter from '../routes/admin'

// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    adminAdapter: {
        get: jest.fn(),
        save: jest.fn(),
    },
}))

import { adminAdapter } from '../adapters/sqlite'

const app = express()
app.use(express.json())
app.use('/api/admin', adminRouter)

describe('Admin API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    // GET /api/admin/settings
    describe('GET /settings', () => {
        it('should return admin settings', async () => {
            const mockSettings = { companyName: 'My Company' }
                ; (adminAdapter.get as jest.Mock).mockReturnValue(mockSettings)

            const res = await request(app).get('/api/admin/settings')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockSettings)
            expect(adminAdapter.get).toHaveBeenCalledTimes(1)
        })

        it('should handle errors', async () => {
            ; (adminAdapter.get as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).get('/api/admin/settings')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // POST /api/admin/settings
    describe('POST /settings', () => {
        const newSettings = { companyName: 'New Company Name' }

        it('should save settings via POST', async () => {
            ; (adminAdapter.save as jest.Mock).mockReturnValue(newSettings)

            const res = await request(app).post('/api/admin/settings').send(newSettings)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(newSettings)
            expect(adminAdapter.save).toHaveBeenCalledWith(newSettings)
        })

        it('should handle errors', async () => {
            ; (adminAdapter.save as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).post('/api/admin/settings').send(newSettings)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // PUT /api/admin/settings
    describe('PUT /settings', () => {
        const newSettings = { companyName: 'Updated Company Name' }

        it('should save settings via PUT', async () => {
            ; (adminAdapter.save as jest.Mock).mockReturnValue(newSettings)

            const res = await request(app).put('/api/admin/settings').send(newSettings)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(newSettings)
            expect(adminAdapter.save).toHaveBeenCalledWith(newSettings)
        })

        it('should handle errors', async () => {
            ; (adminAdapter.save as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).put('/api/admin/settings').send(newSettings)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })
})
