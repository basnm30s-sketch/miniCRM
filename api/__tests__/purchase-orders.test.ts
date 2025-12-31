import request from 'supertest'
import express from 'express'
import purchaseOrdersRouter from '../routes/purchase-orders'

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
}))

// Mock database for foreign key check queries
const mockDb = {
    prepare: jest.fn(),
}
jest.mock('../../lib/database', () => ({
    getDatabase: jest.fn(() => mockDb),
}))

import { purchaseOrdersAdapter } from '../adapters/sqlite'

const app = express()
app.use(express.json())
app.use('/api/purchase-orders', purchaseOrdersRouter)

describe('Purchase Orders API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    // GET /api/purchase-orders
    describe('GET /', () => {
        it('should return all purchase orders', async () => {
            const mockPOs = [{ id: '1', number: 'PO-001' }]
                ; (purchaseOrdersAdapter.getAll as jest.Mock).mockReturnValue(mockPOs)

            const res = await request(app).get('/api/purchase-orders')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockPOs)
        })

        it('should handle errors', async () => {
            ; (purchaseOrdersAdapter.getAll as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).get('/api/purchase-orders')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // GET /api/purchase-orders/:id
    describe('GET /:id', () => {
        it('should return a PO by id', async () => {
            const mockPO = { id: '1', number: 'PO-001' }
                ; (purchaseOrdersAdapter.getById as jest.Mock).mockReturnValue(mockPO)

            const res = await request(app).get('/api/purchase-orders/1')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockPO)
        })

        it('should return 404 if PO not found', async () => {
            ; (purchaseOrdersAdapter.getById as jest.Mock).mockReturnValue(null)

            const res = await request(app).get('/api/purchase-orders/999')

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Purchase order not found' })
        })
    })

    // POST /api/purchase-orders
    describe('POST /', () => {
        const newPO = { number: 'PO-002', vendorId: 'v1' }

        it('should create a new PO', async () => {
            const createdPO = { ...newPO, id: '2' }
                ; (purchaseOrdersAdapter.create as jest.Mock).mockReturnValue(createdPO)

            const res = await request(app).post('/api/purchase-orders').send(newPO)

            expect(res.status).toBe(201)
            expect(res.body).toEqual(createdPO)
        })

        it('should handle errors', async () => {
            ; (purchaseOrdersAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).post('/api/purchase-orders').send(newPO)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // PUT /api/purchase-orders/:id
    describe('PUT /:id', () => {
        const updateData = { status: 'Sent' }

        it('should update a PO', async () => {
            const updatedPO = { id: '1', ...updateData }
                ; (purchaseOrdersAdapter.update as jest.Mock).mockReturnValue(updatedPO)

            const res = await request(app).put('/api/purchase-orders/1').send(updateData)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(updatedPO)
        })

        it('should return 404 if PO not found', async () => {
            ; (purchaseOrdersAdapter.update as jest.Mock).mockReturnValue(null)

            const res = await request(app).put('/api/purchase-orders/999').send(updateData)

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Purchase order not found' })
        })
    })

    // DELETE /api/purchase-orders/:id
    describe('DELETE /:id', () => {
        it('should delete a PO', async () => {
            ; (purchaseOrdersAdapter.delete as jest.Mock).mockReturnValue(undefined)

            const res = await request(app).delete('/api/purchase-orders/1')

            expect(res.status).toBe(204)
            expect(res.body).toEqual({})
        })

        it('should verify database references if FOREIGN KEY error occurs', async () => {
            // Simulate FOREIGN KEY error
            ; (purchaseOrdersAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('FOREIGN KEY constraint failed')
            })

            // Mock database Query to find references
            const mockAll = jest.fn().mockReturnValue([{ number: 'INV-101' }])
            const mockPrepare = jest.fn().mockReturnValue({ all: mockAll })
            mockDb.prepare = mockPrepare

            const res = await request(app).delete('/api/purchase-orders/1')

            expect(res.status).toBe(409)
            // The mocked formatReferenceError returns this string
            expect(res.body).toEqual({ error: 'Cannot delete Purchase Order as it is referenced' })

            // Verify DB was queried
            expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT number FROM invoices'))
            expect(mockAll).toHaveBeenCalledWith('1')
        })

        it('should handle general errors', async () => {
            ; (purchaseOrdersAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('General error')
            })

            const res = await request(app).delete('/api/purchase-orders/1')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'General error' })
        })
    })
})
