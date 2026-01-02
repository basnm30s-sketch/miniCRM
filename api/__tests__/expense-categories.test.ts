import request from 'supertest'
import express from 'express'
import expenseCategoriesRouter from '../routes/expense-categories'

// Mock the adapter
jest.mock('../adapters/sqlite', () => ({
    expenseCategoriesAdapter: {
        getAll: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}))

import { expenseCategoriesAdapter } from '../adapters/sqlite'

const app = express()
app.use(express.json())
app.use('/api/expense-categories', expenseCategoriesRouter)

describe('Expense Categories API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    // GET /api/expense-categories
    describe('GET /', () => {
        it('should return all categories', async () => {
            const mockCategories = [
                { id: '1', name: 'Purchase', isCustom: false },
                { id: '2', name: 'Maintenance', isCustom: false },
                { id: '3', name: 'Custom Category', isCustom: true },
            ]
            ; (expenseCategoriesAdapter.getAll as jest.Mock).mockReturnValue(mockCategories)

            const res = await request(app).get('/api/expense-categories')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockCategories)
            expect(expenseCategoriesAdapter.getAll).toHaveBeenCalledTimes(1)
        })

        it('should handle errors', async () => {
            ; (expenseCategoriesAdapter.getAll as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).get('/api/expense-categories')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // GET /api/expense-categories/:id
    describe('GET /:id', () => {
        it('should return category by id', async () => {
            const mockCategory = { id: '1', name: 'Purchase', isCustom: false }
            ; (expenseCategoriesAdapter.getById as jest.Mock).mockReturnValue(mockCategory)

            const res = await request(app).get('/api/expense-categories/1')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(mockCategory)
            expect(expenseCategoriesAdapter.getById).toHaveBeenCalledWith('1')
        })

        it('should return 404 if category not found', async () => {
            ; (expenseCategoriesAdapter.getById as jest.Mock).mockReturnValue(null)

            const res = await request(app).get('/api/expense-categories/999')

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Category not found' })
        })

        it('should handle errors', async () => {
            ; (expenseCategoriesAdapter.getById as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).get('/api/expense-categories/1')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // POST /api/expense-categories
    describe('POST /', () => {
        const newCategory = { name: 'Custom Category', isCustom: true }

        it('should create a new category', async () => {
            const createdCategory = { ...newCategory, id: '3' }
            ; (expenseCategoriesAdapter.create as jest.Mock).mockReturnValue(createdCategory)

            const res = await request(app).post('/api/expense-categories').send(newCategory)

            expect(res.status).toBe(201)
            expect(res.body).toEqual(createdCategory)
            expect(expenseCategoriesAdapter.create).toHaveBeenCalledWith(newCategory)
        })

        it('should return 400 if name is required', async () => {
            ; (expenseCategoriesAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Category name is required')
            })

            const res = await request(app).post('/api/expense-categories').send({ isCustom: true })

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'Category name is required' })
        })

        it('should return 400 for UNIQUE constraint violation', async () => {
            ; (expenseCategoriesAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('UNIQUE constraint failed: expense_categories.name')
            })

            const res = await request(app).post('/api/expense-categories').send(newCategory)

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'UNIQUE constraint failed: expense_categories.name' })
        })

        it('should handle general errors', async () => {
            ; (expenseCategoriesAdapter.create as jest.Mock).mockImplementation(() => {
                throw new Error('Unexpected error')
            })

            const res = await request(app).post('/api/expense-categories').send(newCategory)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Unexpected error' })
        })
    })

    // PUT /api/expense-categories/:id
    describe('PUT /:id', () => {
        const updateData = { name: 'Updated Category' }

        it('should update a category', async () => {
            const updatedCategory = { id: '1', name: 'Updated Category', isCustom: true }
            ; (expenseCategoriesAdapter.update as jest.Mock).mockReturnValue(updatedCategory)

            const res = await request(app).put('/api/expense-categories/1').send(updateData)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(updatedCategory)
            expect(expenseCategoriesAdapter.update).toHaveBeenCalledWith('1', updateData)
        })

        it('should return 404 if category not found', async () => {
            ; (expenseCategoriesAdapter.update as jest.Mock).mockReturnValue(null)

            const res = await request(app).put('/api/expense-categories/999').send(updateData)

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'Category not found' })
        })

        it('should return 400 for UNIQUE constraint violation', async () => {
            ; (expenseCategoriesAdapter.update as jest.Mock).mockImplementation(() => {
                throw new Error('UNIQUE constraint failed: expense_categories.name')
            })

            const res = await request(app).put('/api/expense-categories/1').send(updateData)

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'UNIQUE constraint failed: expense_categories.name' })
        })

        it('should handle general errors', async () => {
            ; (expenseCategoriesAdapter.update as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).put('/api/expense-categories/1').send(updateData)

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })

    // DELETE /api/expense-categories/:id
    describe('DELETE /:id', () => {
        it('should delete a category', async () => {
            ; (expenseCategoriesAdapter.delete as jest.Mock).mockReturnValue(undefined)

            const res = await request(app).delete('/api/expense-categories/1')

            expect(res.status).toBe(204)
            expect(res.body).toEqual({})
            expect(expenseCategoriesAdapter.delete).toHaveBeenCalledWith('1')
        })

        it('should return 409 if category is referenced', async () => {
            ; (expenseCategoriesAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('Cannot delete category as it is referenced in vehicle transactions')
            })

            const res = await request(app).delete('/api/expense-categories/1')

            expect(res.status).toBe(409)
            expect(res.body).toEqual({ error: 'Cannot delete category as it is referenced in vehicle transactions' })
        })

        it('should handle general errors', async () => {
            ; (expenseCategoriesAdapter.delete as jest.Mock).mockImplementation(() => {
                throw new Error('Database error')
            })

            const res = await request(app).delete('/api/expense-categories/1')

            expect(res.status).toBe(500)
            expect(res.body).toEqual({ error: 'Database error' })
        })
    })
})


