import { Router, Request, Response } from 'express'
import { invoicesAdapter } from '../adapters/sqlite'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  try {
    const invoices = invoicesAdapter.getAll()
    res.json(invoices)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const invoice = invoicesAdapter.getById(req.params.id)
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }
    res.json(invoice)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', (req: Request, res: Response) => {
  try {
    const invoice = invoicesAdapter.create(req.body)
    res.status(201).json(invoice)
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    console.error('Request body:', JSON.stringify(req.body, null, 2))
    // Return appropriate status code based on error type
    const statusCode = error.message && (
      error.message.includes('does not exist') || 
      error.message.includes('required') ||
      error.message.includes('FOREIGN KEY')
    ) ? 400 : 500
    res.status(statusCode).json({ error: error.message || 'Failed to create invoice' })
  }
})

router.put('/:id', (req: Request, res: Response) => {
  try {
    const invoice = invoicesAdapter.update(req.params.id, req.body)
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }
    res.json(invoice)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  try {
    invoicesAdapter.delete(req.params.id)
    res.status(204).send()
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router

