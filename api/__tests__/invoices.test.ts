import request from 'supertest'
import express from 'express'
import invoicesRouter from '../routes/invoices'

// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    invoicesAdapter: {
        getAll: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}))

// Import the mocked adapter to define return values
import { invoicesAdapter } from '../adapters/sqlite'

const app = express()
app.use(express.json())
app.use('/api/invoices', invoicesRouter)

describe('Invoices API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    // GET /api/invoices
    describe('GET /', () => {
        it('should return all invoices', async () => {
            const mockInvoices = [{ id: '1', number: 'INV-001' }, { id: '2', number: 'INV-002' }]
                ; (invoicesAdapter.getAll as jest.Mock).mockReturnValue(mockInvoices)

            const res = await request(app).get('/api/invoices')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockInvoices)
            expect(invoicesAdapter.getAll).toHaveBeenCalledTimes(1)
        })

        it('should handle errors', async () => {
            ; (invoicesAdapter.getAll as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).get('/api/invoices')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // GET /api/invoices/:id
    describe('GET /:id', () => {
        it('should return an invoice by id', async () => {
            const mockInvoice = { id: '1', number: 'INV-001' }
                ; (invoicesAdapter.getById as jest.Mock).mockReturnValue(mockInvoice)

            const res = await request(app).get('/api/invoices/1')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockInvoice)
            expect(invoicesAdapter.getById).toHaveBeenCalledWith('1')
        })

        it('should return 404 if invoice not found', async () => {
            ; (invoicesAdapter.getById as jest.Mock).mockReturnValue(null)

            const res = await request(app).get('/api/invoices/999')

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Invoice not found' })
        })

        it('should handle errors', async () => {
            ; (invoicesAdapter.getById as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).get('/api/invoices/1')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // POST /api/invoices
    describe('POST /', () => {
        const newInvoice = { number: 'INV-003', customerId: 'cust-1', total: 1000 }

        it('should create a new invoice', async () => {
            const createdInvoice = { ...newInvoice, id: '3' }
                ; (invoicesAdapter.create as jest.Mock).mockReturnValue(createdInvoice)

            const res = await request(app).post('/api/invoices').send(newInvoice)

            expect(res.status).toBe(201)
            expect(res.body).toEqual(createdInvoice)
            expect(invoicesAdapter.create).toHaveBeenCalledWith(newInvoice)
        })

        it('should return 400 for validation errors (does not exist)', async () => {
            ; (invoicesAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Customer does not exist')
            })

            const res = await request(app).post('/api/invoices').send(newInvoice)

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'Customer does not exist' })
        })

        it('should return 400 for validation errors (required field)', async () => {
            ; (invoicesAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Field total is required')
            })

            const res = await request(app).post('/api/invoices').send(newInvoice)

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'Field total is required' })
        })

        it('should return 500 for other errors', async () => {
            ; (invoicesAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Unexpected error')
            })

            const res = await request(app).post('/api/invoices').send(newInvoice)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Unexpected error' })
        })
    })

    // PUT /api/invoices/:id
    describe('PUT /:id', () => {
        const updateData = { total: 2000 }

        it('should update an invoice', async () => {
            const updatedInvoice = { id: '1', number: 'INV-001', ...updateData }
                ; (invoicesAdapter.update as jest.Mock).mockReturnValue(updatedInvoice)

            const res = await request(app).put('/api/invoices/1').send(updateData)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(updatedInvoice)
            expect(invoicesAdapter.update).toHaveBeenCalledWith('1', updateData)
        })

        it('should return 404 if invoice not found', async () => {
            ; (invoicesAdapter.update as jest.Mock).mockReturnValue(null)

            const res = await request(app).put('/api/invoices/999').send(updateData)

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Invoice not found' })
        })

        it('should handle errors', async () => {
            ; (invoicesAdapter.update as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).put('/api/invoices/1').send(updateData)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // DELETE /api/invoices/:id
    describe('DELETE /:id', () => {
        it('should delete an invoice', async () => {
            ; (invoicesAdapter.delete as jest.Mock).mockReturnValue(undefined)

            const res = await request(app).delete('/api/invoices/1')

            expect(res.status).toBe(204)
            expect(res.body).toEqual({})
            expect(invoicesAdapter.delete).toHaveBeenCalledWith('1')
        })

        it('should handle errors', async () => {
            ; (invoicesAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).delete('/api/invoices/1')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })
})
