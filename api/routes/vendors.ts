import { Router, Request, Response } from 'express'
import { vendorsAdapter, formatReferenceError } from '../adapters/sqlite'
import { getDatabase } from '../../lib/database'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  try {
    const vendors = vendorsAdapter.getAll()
    res.json(vendors)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const vendor = vendorsAdapter.getById(req.params.id)
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' })
    }
    res.json(vendor)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', (req: Request, res: Response) => {
  try {
    const vendor = vendorsAdapter.create(req.body)
    res.status(201).json(vendor)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', (req: Request, res: Response) => {
  try {
    const vendor = vendorsAdapter.update(req.params.id, req.body)
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' })
    }
    res.json(vendor)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  try {
    vendorsAdapter.delete(req.params.id)
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
        const purchaseOrders = db.prepare('SELECT number FROM purchase_orders WHERE vendorId = ?').all(req.params.id) as any[]
        const invoices = db.prepare('SELECT number FROM invoices WHERE vendorId = ?').all(req.params.id) as any[]
        const references = [
          ...purchaseOrders.map((po: any) => ({ type: 'Purchase Order', number: po.number })),
          ...invoices.map((i: any) => ({ type: 'Invoice', number: i.number }))
        ]
        if (references.length > 0) {
          res.status(409).json({ error: formatReferenceError('Vendor', references) })
        } else {
          res.status(409).json({ error: 'Cannot delete Vendor as it is referenced in other records' })
        }
      } catch {
        res.status(409).json({ error: 'Cannot delete Vendor as it is referenced in other records' })
      }
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

export default router

