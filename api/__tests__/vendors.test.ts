import request from 'supertest'
import express from 'express'
import vendorsRouter from '../routes/vendors'

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
}))

// Mock database for foreign key check queries
const mockDb = {
    prepare: jest.fn(),
}
jest.mock('../../lib/database', () => ({
    getDatabase: jest.fn(() => mockDb),
}))

import { vendorsAdapter } from '../adapters/sqlite'

const app = express()
app.use(express.json())
app.use('/api/vendors', vendorsRouter)

describe('Vendors API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    // GET /api/vendors
    describe('GET /', () => {
        it('should return all vendors', async () => {
            const mockVendors = [{ id: '1', name: 'Vendor A' }]
                ; (vendorsAdapter.getAll as jest.Mock).mockReturnValue(mockVendors)

            const res = await request(app).get('/api/vendors')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockVendors)
        })

        it('should handle errors', async () => {
            ; (vendorsAdapter.getAll as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).get('/api/vendors')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // GET /api/vendors/:id
    describe('GET /:id', () => {
        it('should return a vendor by id', async () => {
            const mockVendor = { id: '1', name: 'Vendor A' }
                ; (vendorsAdapter.getById as jest.Mock).mockReturnValue(mockVendor)

            const res = await request(app).get('/api/vendors/1')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockVendor)
        })

        it('should return 404 if vendor not found', async () => {
            ; (vendorsAdapter.getById as jest.Mock).mockReturnValue(null)

            const res = await request(app).get('/api/vendors/999')

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Vendor not found' })
        })
    })

    // POST /api/vendors
    describe('POST /', () => {
        const newVendor = { name: 'Vendor B' }

        it('should create a new vendor', async () => {
            const createdVendor = { ...newVendor, id: '2' }
                ; (vendorsAdapter.create as jest.Mock).mockReturnValue(createdVendor)

            const res = await request(app).post('/api/vendors').send(newVendor)

            expect(res.status).toBe(201)
            expect(res.body).toEqual(createdVendor)
        })

        it('should handle errors', async () => {
            ; (vendorsAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).post('/api/vendors').send(newVendor)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // PUT /api/vendors/:id
    describe('PUT /:id', () => {
        const updateData = { name: 'Vendor Updated' }

        it('should update a vendor', async () => {
            const updatedVendor = { id: '1', name: 'Vendor Updated' }
                ; (vendorsAdapter.update as jest.Mock).mockReturnValue(updatedVendor)

            const res = await request(app).put('/api/vendors/1').send(updateData)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(updatedVendor)
        })

        it('should return 404 if vendor not found', async () => {
            ; (vendorsAdapter.update as jest.Mock).mockReturnValue(null)

            const res = await request(app).put('/api/vendors/999').send(updateData)

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Vendor not found' })
        })
    })

    // DELETE /api/vendors/:id
    describe('DELETE /:id', () => {
        it('should delete a vendor', async () => {
            ; (vendorsAdapter.delete as jest.Mock).mockReturnValue(undefined)

            const res = await request(app).delete('/api/vendors/1')

            expect(res.status).toBe(204)
            expect(res.body).toEqual({})
        })

        it('should check DB references if FOREIGN KEY error occurs', async () => {
            // Simulate FOREIGN KEY error
            ; (vendorsAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('FOREIGN KEY constraint failed')
            })

            // Mock database Query to find references (POs and Invoices)
            mockDb.prepare.mockImplementation((query) => {
                if (query.includes('purchase_orders')) {
                    return { all: () => [{ number: 'PO-100' }] }
                }
                if (query.includes('invoices')) {
                    return { all: () => [{ number: 'INV-100' }] }
                }
                return { all: () => [] }
            })

            const res = await request(app).delete('/api/vendors/1')

            expect(res.status).toBe(409)
            expect(res.body).toEqual({ error: 'Cannot delete Vendor as it is referenced' })

            // Verify DB was queried
            expect(mockDb.prepare).toHaveBeenCalledTimes(2)
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('purchase_orders'))
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('invoices'))
        })

        it('should handle general errors', async () => {
            ; (vendorsAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('General error')
            })

            const res = await request(app).delete('/api/vendors/1')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'General error' })
        })
    })
})
