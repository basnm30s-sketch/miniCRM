import request from 'supertest'
import express from 'express'
import employeesRouter from '../routes/employees'

// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    employeesAdapter: {
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

import { employeesAdapter } from '../adapters/sqlite'

const app = express()
app.use(express.json())
app.use('/api/employees', employeesRouter)

describe('Employees API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    // GET /api/employees
    describe('GET /', () => {
        it('should return all employees', async () => {
            const mockEmployees = [{ id: '1', name: 'Alice' }]
                ; (employeesAdapter.getAll as jest.Mock).mockReturnValue(mockEmployees)

            const res = await request(app).get('/api/employees')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockEmployees)
        })

        it('should handle errors', async () => {
            ; (employeesAdapter.getAll as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).get('/api/employees')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // GET /api/employees/:id
    describe('GET /:id', () => {
        it('should return an employee by id', async () => {
            const mockEmployee = { id: '1', name: 'Alice' }
                ; (employeesAdapter.getById as jest.Mock).mockReturnValue(mockEmployee)

            const res = await request(app).get('/api/employees/1')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockEmployee)
        })

        it('should return 404 if employee not found', async () => {
            ; (employeesAdapter.getById as jest.Mock).mockReturnValue(null)

            const res = await request(app).get('/api/employees/999')

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Employee not found' })
        })
    })

    // POST /api/employees
    describe('POST /', () => {
        const newEmployee = { name: 'Bob', role: 'Driver' }

        it('should create a new employee', async () => {
            const createdEmployee = { ...newEmployee, id: '2' }
                ; (employeesAdapter.create as jest.Mock).mockReturnValue(createdEmployee)

            const res = await request(app).post('/api/employees').send(newEmployee)

            expect(res.status).toBe(201)
            expect(res.body).toEqual(createdEmployee)
        })

        it('should handle errors', async () => {
            ; (employeesAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).post('/api/employees').send(newEmployee)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // PUT /api/employees/:id
    describe('PUT /:id', () => {
        const updateData = { role: 'Manager' }

        it('should update an employee', async () => {
            const updatedEmployee = { id: '1', name: 'Alice', ...updateData }
                ; (employeesAdapter.update as jest.Mock).mockReturnValue(updatedEmployee)

            const res = await request(app).put('/api/employees/1').send(updateData)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(updatedEmployee)
        })

        it('should return 404 if employee not found', async () => {
            ; (employeesAdapter.update as jest.Mock).mockReturnValue(null)

            const res = await request(app).put('/api/employees/999').send(updateData)

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Employee not found' })
        })
    })

    // DELETE /api/employees/:id
    describe('DELETE /:id', () => {
        it('should delete an employee', async () => {
            ; (employeesAdapter.delete as jest.Mock).mockReturnValue(undefined)

            const res = await request(app).delete('/api/employees/1')

            expect(res.status).toBe(204)
            expect(res.body).toEqual({})
        })

        it('should check DB references if FOREIGN KEY error occurs', async () => {
            // Simulate FOREIGN KEY error
            ; (employeesAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('FOREIGN KEY constraint failed')
            })

            // Mock database Query to find references (payslips)
            const mockAll = jest.fn().mockReturnValue([{ id: 'PS-01', month: '2025-01' }])
            const mockPrepare = jest.fn().mockReturnValue({ all: mockAll })
            mockDb.prepare = mockPrepare

            const res = await request(app).delete('/api/employees/1')

            expect(res.status).toBe(409)
            expect(res.body).toEqual({ error: 'Cannot delete Employee as it is referenced' })

            // Verify DB was queried
            expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT id, month FROM payslips'))
            expect(mockAll).toHaveBeenCalledWith('1')
        })

        it('should handle general errors', async () => {
            ; (employeesAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('General error')
            })

            const res = await request(app).delete('/api/employees/1')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'General error' })
        })
    })
})
