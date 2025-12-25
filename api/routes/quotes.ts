import { Router, Request, Response } from 'express'
import { quotesAdapter, formatReferenceError } from '../adapters/sqlite'
import { getDatabase } from '../../lib/database'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  try {
    const quotes = quotesAdapter.getAll()
    res.json(quotes)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const quote = quotesAdapter.getById(req.params.id)
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' })
    }
    res.json(quote)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', (req: Request, res: Response) => {
  try {
    const quote = quotesAdapter.create(req.body)
    res.status(201).json(quote)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', (req: Request, res: Response) => {
  try {
    const quote = quotesAdapter.update(req.params.id, req.body)
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' })
    }
    res.json(quote)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  try {
    quotesAdapter.delete(req.params.id)
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
        const invoices = db.prepare('SELECT number FROM invoices WHERE quoteId = ?').all(req.params.id) as any[]
        const references = invoices.map((i: any) => ({ type: 'Invoice', number: i.number }))
        if (references.length > 0) {
          res.status(409).json({ error: formatReferenceError('Quote', references) })
        } else {
          res.status(409).json({ error: 'Cannot delete Quote as it is referenced in other records' })
        }
      } catch {
        res.status(409).json({ error: 'Cannot delete Quote as it is referenced in other records' })
      }
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

export default router

