import request from 'supertest'
import express from 'express'
import vehiclesRouter from '../routes/vehicles'

// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    vehiclesAdapter: {
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

import { vehiclesAdapter } from '../adapters/sqlite'

const app = express()
app.use(express.json())
app.use('/api/vehicles', vehiclesRouter)

describe('Vehicles API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    // GET /api/vehicles
    describe('GET /', () => {
        it('should return all vehicles', async () => {
            const mockVehicles = [{ id: '1', type: 'Bus' }]
                ; (vehiclesAdapter.getAll as jest.Mock).mockReturnValue(mockVehicles)

            const res = await request(app).get('/api/vehicles')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockVehicles)
        })

        it('should handle errors', async () => {
            ; (vehiclesAdapter.getAll as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).get('/api/vehicles')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // GET /api/vehicles/:id
    describe('GET /:id', () => {
        it('should return a vehicle by id', async () => {
            const mockVehicle = { id: '1', type: 'Bus' }
                ; (vehiclesAdapter.getById as jest.Mock).mockReturnValue(mockVehicle)

            const res = await request(app).get('/api/vehicles/1')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockVehicle)
        })

        it('should return 404 if vehicle not found', async () => {
            ; (vehiclesAdapter.getById as jest.Mock).mockReturnValue(null)

            const res = await request(app).get('/api/vehicles/999')

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Vehicle not found' })
        })
    })

    // POST /api/vehicles
    describe('POST /', () => {
        const newVehicle = { type: 'Van', capacity: 10 }

        it('should create a new vehicle', async () => {
            const createdVehicle = { ...newVehicle, id: '2' }
                ; (vehiclesAdapter.create as jest.Mock).mockReturnValue(createdVehicle)

            const res = await request(app).post('/api/vehicles').send(newVehicle)

            expect(res.status).toBe(201)
            expect(res.body).toEqual(createdVehicle)
        })

        it('should handle errors', async () => {
            ; (vehiclesAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).post('/api/vehicles').send(newVehicle)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // PUT /api/vehicles/:id
    describe('PUT /:id', () => {
        const updateData = { capacity: 12 }

        it('should update a vehicle', async () => {
            const updatedVehicle = { id: '1', type: 'Bus', ...updateData }
                ; (vehiclesAdapter.update as jest.Mock).mockReturnValue(updatedVehicle)

            const res = await request(app).put('/api/vehicles/1').send(updateData)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(updatedVehicle)
        })

        it('should return 404 if vehicle not found', async () => {
            ; (vehiclesAdapter.update as jest.Mock).mockReturnValue(null)

            const res = await request(app).put('/api/vehicles/999').send(updateData)

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Vehicle not found' })
        })
    })

    // DELETE /api/vehicles/:id
    describe('DELETE /:id', () => {
        it('should delete a vehicle', async () => {
            ; (vehiclesAdapter.delete as jest.Mock).mockReturnValue(undefined)

            const res = await request(app).delete('/api/vehicles/1')

            expect(res.status).toBe(204)
            expect(res.body).toEqual({})
        })

        it('should check DB references if FOREIGN KEY error occurs', async () => {
            // Simulate FOREIGN KEY error
            ; (vehiclesAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('FOREIGN KEY constraint failed')
            })

            // Mock database Query to find references (quotes using this vehicle)
            const mockAll = jest.fn().mockReturnValue([{ number: 'Q-100' }])
            const mockPrepare = jest.fn().mockReturnValue({ all: mockAll })
            mockDb.prepare = mockPrepare

            const res = await request(app).delete('/api/vehicles/1')

            expect(res.status).toBe(409)
            expect(res.body).toEqual({ error: 'Cannot delete Vehicle as it is referenced' })

            // Verify DB was queried
            expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT DISTINCT q.number'))
            expect(mockAll).toHaveBeenCalledWith('1')
        })

        it('should return 409 generic error if FK fails but no refs found (rare case)', async () => {
            ; (vehiclesAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('FOREIGN KEY constraint failed')
            })

            // Mock database returning empty references (maybe referenced by something else we missed?)
            const mockAll = jest.fn().mockReturnValue([])
            const mockPrepare = jest.fn().mockReturnValue({ all: mockAll })
            mockDb.prepare = mockPrepare

            const res = await request(app).delete('/api/vehicles/1')

            expect(res.status).toBe(409)
            expect(res.body).toEqual({ error: 'Cannot delete Vehicle as it is referenced in other records' })
        })

        it('should handle general errors', async () => {
            ; (vehiclesAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('General error')
            })

            const res = await request(app).delete('/api/vehicles/1')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'General error' })
        })
    })
})
