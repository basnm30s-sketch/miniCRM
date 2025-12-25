import { Router, Request, Response } from 'express'
import { customersAdapter, formatReferenceError } from '../adapters/sqlite'
import { getDatabase } from '../../lib/database'

const router = Router()

// GET /api/customers
router.get('/', (req: Request, res: Response) => {
  try {
    const customers = customersAdapter.getAll()
    res.json(customers)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/customers/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const customer = customersAdapter.getById(req.params.id)
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }
    res.json(customer)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/customers
router.post('/', (req: Request, res: Response) => {
  try {
    const customer = customersAdapter.create(req.body)
    res.status(201).json(customer)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/customers/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const customer = customersAdapter.update(req.params.id, req.body)
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }
    res.json(customer)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/customers/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    customersAdapter.delete(req.params.id)
    res.status(204).send()
  } catch (error: any) {
    // Check if it's our formatted reference error
    if (error.message.includes('Cannot delete') && error.message.includes('referenced')) {
      res.status(409).json({ error: error.message })
    } 
    // Check if it's a database foreign key constraint error
    else if (error.message && (error.message.includes('FOREIGN KEY') || error.message.includes('constraint'))) {
      // Try to get references and format error
      try {
        const db = getDatabase()
        const quotes = db.prepare('SELECT number FROM quotes WHERE customerId = ?').all(req.params.id) as any[]
        const invoices = db.prepare('SELECT number FROM invoices WHERE customerId = ?').all(req.params.id) as any[]
        const references = [
          ...quotes.map((q: any) => ({ type: 'Quote', number: q.number })),
          ...invoices.map((i: any) => ({ type: 'Invoice', number: i.number }))
        ]
        if (references.length > 0) {
          res.status(409).json({ error: formatReferenceError('Customer', references) })
        } else {
          res.status(409).json({ error: 'Cannot delete Customer as it is referenced in other records' })
        }
      } catch {
        res.status(409).json({ error: 'Cannot delete Customer as it is referenced in other records' })
      }
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

export default router

