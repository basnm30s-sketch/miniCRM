import request from 'supertest'
import express from 'express'
import vehicleTransactionsRouter from '../routes/vehicle-transactions'

// Mock the adapters
jest.mock('../adapters/sqlite', () => ({
    vehicleTransactionsAdapter: {
        getAll: jest.fn(),
        getById: jest.fn(),
        getByVehicleId: jest.fn(),
        getByVehicleIdAndMonth: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    vehiclesAdapter: {
        getById: jest.fn(),
    },
    employeesAdapter: {
        getById: jest.fn(),
    },
}))

import { vehicleTransactionsAdapter, vehiclesAdapter, employeesAdapter } from '../adapters/sqlite'

const app = express()
app.use(express.json())
app.use('/api/vehicle-transactions', vehicleTransactionsRouter)

describe('Vehicle Transactions API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    // GET /api/vehicle-transactions
    describe('GET /', () => {
        it('should return all transactions', async () => {
            const mockTransactions = [
                { id: '1', vehicleId: 'v1', transactionType: 'revenue', amount: 1000, date: '2025-01-15', month: '2025-01' },
                { id: '2', vehicleId: 'v1', transactionType: 'expense', amount: 500, date: '2025-01-20', month: '2025-01' },
            ]
            ; (vehicleTransactionsAdapter.getAll as jest.Mock).mockReturnValue(mockTransactions)

            const res = await request(app).get('/api/vehicle-transactions')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockTransactions)
            expect(vehicleTransactionsAdapter.getAll).toHaveBeenCalledTimes(1)
        })

        it('should filter by vehicleId query parameter', async () => {
            const mockTransactions = [
                { id: '1', vehicleId: 'v1', transactionType: 'revenue', amount: 1000, date: '2025-01-15', month: '2025-01' },
            ]
            ; (vehicleTransactionsAdapter.getByVehicleId as jest.Mock).mockReturnValue(mockTransactions)

            const res = await request(app).get('/api/vehicle-transactions?vehicleId=v1')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockTransactions)
            expect(vehicleTransactionsAdapter.getByVehicleId).toHaveBeenCalledWith('v1')
        })

        it('should filter by vehicleId and month query parameters', async () => {
            const mockTransactions = [
                { id: '1', vehicleId: 'v1', transactionType: 'revenue', amount: 1000, date: '2025-01-15', month: '2025-01' },
            ]
            ; (vehicleTransactionsAdapter.getByVehicleIdAndMonth as jest.Mock).mockReturnValue(mockTransactions)

            const res = await request(app).get('/api/vehicle-transactions?vehicleId=v1&month=2025-01')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockTransactions)
            expect(vehicleTransactionsAdapter.getByVehicleIdAndMonth).toHaveBeenCalledWith('v1', '2025-01')
        })

        it('should handle errors', async () => {
            ; (vehicleTransactionsAdapter.getAll as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).get('/api/vehicle-transactions')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // GET /api/vehicle-transactions/:id
    describe('GET /:id', () => {
        it('should return transaction by id', async () => {
            const mockTransaction = {
                id: '1',
                vehicleId: 'v1',
                transactionType: 'revenue',
                amount: 1000,
                date: '2025-01-15',
                month: '2025-01',
            }
            ; (vehicleTransactionsAdapter.getById as jest.Mock).mockReturnValue(mockTransaction)

            const res = await request(app).get('/api/vehicle-transactions/1')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockTransaction)
            expect(vehicleTransactionsAdapter.getById).toHaveBeenCalledWith('1')
        })

        it('should return 404 if transaction not found', async () => {
            ; (vehicleTransactionsAdapter.getById as jest.Mock).mockReturnValue(null)

            const res = await request(app).get('/api/vehicle-transactions/999')

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Transaction not found' })
        })

        it('should handle errors', async () => {
            ; (vehicleTransactionsAdapter.getById as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).get('/api/vehicle-transactions/1')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // POST /api/vehicle-transactions
    describe('POST /', () => {
        const newTransaction = {
            vehicleId: 'v1',
            transactionType: 'revenue',
            category: 'Rental Income',
            amount: 1000,
            date: '2025-01-15',
            month: '2025-01',
        }

        it('should create a new transaction', async () => {
            const createdTransaction = { ...newTransaction, id: '1' }
            ; (vehicleTransactionsAdapter.create as jest.Mock).mockReturnValue(createdTransaction)

            const res = await request(app).post('/api/vehicle-transactions').send(newTransaction)

            expect(res.status).toBe(201)
            expect(res.body).toEqual(createdTransaction)
            expect(vehicleTransactionsAdapter.create).toHaveBeenCalledWith(newTransaction)
        })

        it('should return 400 if vehicle does not exist', async () => {
            ; (vehicleTransactionsAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Vehicle with ID "v1" does not exist')
            })

            const res = await request(app).post('/api/vehicle-transactions').send(newTransaction)

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'Vehicle with ID "v1" does not exist' })
        })

        it('should return 400 if amount is not positive', async () => {
            ; (vehicleTransactionsAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Transaction amount must be greater than 0')
            })

            const res = await request(app).post('/api/vehicle-transactions').send(newTransaction)

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'Transaction amount must be greater than 0' })
        })

        it('should return 400 if date is in the future', async () => {
            ; (vehicleTransactionsAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Transaction date cannot be in the future')
            })

            const res = await request(app).post('/api/vehicle-transactions').send(newTransaction)

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'Transaction date cannot be in the future' })
        })

        it('should return 400 if date is more than 12 months in the past', async () => {
            ; (vehicleTransactionsAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Transaction date cannot be more than 12 months in the past')
            })

            const res = await request(app).post('/api/vehicle-transactions').send(newTransaction)

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'Transaction date cannot be more than 12 months in the past' })
        })

        it('should return 400 if employee does not exist', async () => {
            ; (vehicleTransactionsAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Employee with ID "e1" does not exist')
            })

            const res = await request(app).post('/api/vehicle-transactions').send({ ...newTransaction, employeeId: 'e1' })

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'Employee with ID "e1" does not exist' })
        })

        it('should handle general errors', async () => {
            ; (vehicleTransactionsAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Unexpected error')
            })

            const res = await request(app).post('/api/vehicle-transactions').send(newTransaction)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Unexpected error' })
        })
    })

    // PUT /api/vehicle-transactions/:id
    describe('PUT /:id', () => {
        const updateData = { amount: 1500 }

        it('should update a transaction', async () => {
            const updatedTransaction = {
                id: '1',
                vehicleId: 'v1',
                transactionType: 'revenue',
                amount: 1500,
                date: '2025-01-15',
                month: '2025-01',
            }
            ; (vehicleTransactionsAdapter.update as jest.Mock).mockReturnValue(updatedTransaction)

            const res = await request(app).put('/api/vehicle-transactions/1').send(updateData)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(updatedTransaction)
            expect(vehicleTransactionsAdapter.update).toHaveBeenCalledWith('1', updateData)
        })

        it('should return 404 if transaction not found', async () => {
            ; (vehicleTransactionsAdapter.update as jest.Mock).mockReturnValue(null)

            const res = await request(app).put('/api/vehicle-transactions/999').send(updateData)

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Transaction not found' })
        })

        it('should return 400 for validation errors', async () => {
            ; (vehicleTransactionsAdapter.update as jest.Mock).mockImplementation(() => {
                throw new Error('Transaction amount must be greater than 0')
            })

            const res = await request(app).put('/api/vehicle-transactions/1').send(updateData)

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'Transaction amount must be greater than 0' })
        })

        it('should handle general errors', async () => {
            ; (vehicleTransactionsAdapter.update as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).put('/api/vehicle-transactions/1').send(updateData)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // DELETE /api/vehicle-transactions/:id
    describe('DELETE /:id', () => {
        it('should delete a transaction', async () => {
            ; (vehicleTransactionsAdapter.delete as jest.Mock).mockReturnValue(undefined)

            const res = await request(app).delete('/api/vehicle-transactions/1')

            expect(res.status).toBe(204)
            expect(res.body).toEqual({})
            expect(vehicleTransactionsAdapter.delete).toHaveBeenCalledWith('1')
        })

        it('should handle errors', async () => {
            ; (vehicleTransactionsAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).delete('/api/vehicle-transactions/1')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })
})


