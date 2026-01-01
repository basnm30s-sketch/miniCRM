import { Router, Request, Response } from 'express'
import { expenseCategoriesAdapter } from '../adapters/sqlite'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  try {
    const categories = expenseCategoriesAdapter.getAll()
    res.json(categories)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const category = expenseCategoriesAdapter.getById(req.params.id)
    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }
    res.json(category)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', (req: Request, res: Response) => {
  try {
    const category = expenseCategoriesAdapter.create(req.body)
    res.status(201).json(category)
  } catch (error: any) {
    const statusCode = error.message && (
      error.message.includes('UNIQUE constraint') ||
      error.message.includes('required')
    ) ? 400 : 500
    res.status(statusCode).json({ error: error.message || 'Failed to create category' })
  }
})

router.put('/:id', (req: Request, res: Response) => {
  try {
    const category = expenseCategoriesAdapter.update(req.params.id, req.body)
    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }
    res.json(category)
  } catch (error: any) {
    const statusCode = error.message && (
      error.message.includes('UNIQUE constraint') ||
      error.message.includes('required')
    ) ? 400 : 500
    res.status(statusCode).json({ error: error.message || 'Failed to update category' })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  try {
    expenseCategoriesAdapter.delete(req.params.id)
    res.status(204).send()
  } catch (error: any) {
    const statusCode = error.message && (
      error.message.includes('Cannot delete')
    ) ? 409 : 500
    res.status(statusCode).json({ error: error.message })
  }
})

export default router

