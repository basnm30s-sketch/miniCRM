import { Router, Request, Response } from 'express'
import { vehiclesAdapter, formatReferenceError } from '../adapters/sqlite'
import { getDatabase } from '../../lib/database'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  try {
    const vehicles = vehiclesAdapter.getAll()
    res.json(vehicles)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const vehicle = vehiclesAdapter.getById(req.params.id)
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' })
    }
    res.json(vehicle)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', (req: Request, res: Response) => {
  try {
    const vehicle = vehiclesAdapter.create(req.body)
    res.status(201).json(vehicle)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', (req: Request, res: Response) => {
  try {
    const vehicle = vehiclesAdapter.update(req.params.id, req.body)
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' })
    }
    res.json(vehicle)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  try {
    vehiclesAdapter.delete(req.params.id)
    res.status(204).send()
  } catch (error: any) {
    // Check if it's our formatted reference error
    if (error.message.includes('Cannot delete') && error.message.includes('referenced')) {
      res.status(409).json({ error: error.message })
    } 
    // Check if it's a database foreign key constraint error
    else if (error.message && (error.message.includes('FOREIGN KEY') || error.message.includes('constraint'))) {
      try {
        const db = getDatabase()
        const quoteItems = db.prepare(`
          SELECT DISTINCT q.number 
          FROM quote_items qi
          JOIN quotes q ON qi.quoteId = q.id
          WHERE qi.vehicleTypeId = ?
        `).all(req.params.id) as any[]
        const references = quoteItems.map((qi: any) => ({ type: 'Quote', number: qi.number }))
        if (references.length > 0) {
          res.status(409).json({ error: formatReferenceError('Vehicle', references) })
        } else {
          res.status(409).json({ error: 'Cannot delete Vehicle as it is referenced in other records' })
        }
      } catch {
        res.status(409).json({ error: 'Cannot delete Vehicle as it is referenced in other records' })
      }
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

export default router

