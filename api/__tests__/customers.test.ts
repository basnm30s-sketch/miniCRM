import request from 'supertest'
import express from 'express'
import customersRouter from '../routes/customers'

// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    customersAdapter: {
        getAll: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    formatReferenceError: jest.fn((entity, refs) => `Cannot delete ${entity} as it is referenced in other records`),
}))

// Mock database for complex delete logic if needed, but we can stick to error message mocking for now
jest.mock('../../lib/database', () => ({
    getDatabase: jest.fn(),
}))

import { customersAdapter } from '../adapters/sqlite'

const app = express()
app.use(express.json())
app.use('/api/customers', customersRouter)

describe('Customers API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    // GET /api/customers
    describe('GET /', () => {
        it('should return all customers', async () => {
            const mockCustomers = [{ id: '1', name: 'John Doe' }]
                ; (customersAdapter.getAll as jest.Mock).mockReturnValue(mockCustomers)

            const res = await request(app).get('/api/customers')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockCustomers)
            expect(customersAdapter.getAll).toHaveBeenCalledTimes(1)
        })

        it('should handle errors', async () => {
            ; (customersAdapter.getAll as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).get('/api/customers')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // GET /api/customers/:id
    describe('GET /:id', () => {
        it('should return a customer by id', async () => {
            const mockCustomer = { id: '1', name: 'John Doe' }
                ; (customersAdapter.getById as jest.Mock).mockReturnValue(mockCustomer)

            const res = await request(app).get('/api/customers/1')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockCustomer)
            expect(customersAdapter.getById).toHaveBeenCalledWith('1')
        })

        it('should return 404 if customer not found', async () => {
            ; (customersAdapter.getById as jest.Mock).mockReturnValue(null)

            const res = await request(app).get('/api/customers/999')

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Customer not found' })
        })

        it('should handle errors', async () => {
            ; (customersAdapter.getById as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).get('/api/customers/1')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // POST /api/customers
    describe('POST /', () => {
        const newCustomer = { name: 'Jane Doe', email: 'jane@example.com' }

        it('should create a new customer', async () => {
            const createdCustomer = { ...newCustomer, id: '2' }
                ; (customersAdapter.create as jest.Mock).mockReturnValue(createdCustomer)

            const res = await request(app).post('/api/customers').send(newCustomer)

            expect(res.status).toBe(201)
            expect(res.body).toEqual(createdCustomer)
            expect(customersAdapter.create).toHaveBeenCalledWith(newCustomer)
        })

        it('should handle errors', async () => {
            ; (customersAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).post('/api/customers').send(newCustomer)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // PUT /api/customers/:id
    describe('PUT /:id', () => {
        const updateData = { name: 'John Updated' }

        it('should update a customer', async () => {
            const updatedCustomer = { id: '1', name: 'John Updated' }
                ; (customersAdapter.update as jest.Mock).mockReturnValue(updatedCustomer)

            const res = await request(app).put('/api/customers/1').send(updateData)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(updatedCustomer)
            expect(customersAdapter.update).toHaveBeenCalledWith('1', updateData)
        })

        it('should return 404 if customer not found', async () => {
            ; (customersAdapter.update as jest.Mock).mockReturnValue(null)

            const res = await request(app).put('/api/customers/999').send(updateData)

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Customer not found' })
        })

        it('should handle errors', async () => {
            ; (customersAdapter.update as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).put('/api/customers/1').send(updateData)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // DELETE /api/customers/:id
    describe('DELETE /:id', () => {
        it('should delete a customer', async () => {
            ; (customersAdapter.delete as jest.Mock).mockReturnValue(undefined)

            const res = await request(app).delete('/api/customers/1')

            expect(res.status).toBe(204)
            expect(res.body).toEqual({})
            expect(customersAdapter.delete).toHaveBeenCalledWith('1')
        })

        it('should return 409 if customer is referenced (formatted error)', async () => {
            ; (customersAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('Cannot delete Customer as it is referenced in other records')
            })

            const res = await request(app).delete('/api/customers/1')

            expect(res.status).toBe(409)
            expect(res.body).toEqual({ error: 'Cannot delete Customer as it is referenced in other records' })
        })

        it('should handle other errors', async () => {
            ; (customersAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).delete('/api/customers/1')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })
})
