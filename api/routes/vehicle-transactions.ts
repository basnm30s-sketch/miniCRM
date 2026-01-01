import { Router, Request, Response } from 'express'
import { vehicleTransactionsAdapter } from '../adapters/sqlite'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  try {
    const vehicleId = req.query.vehicleId as string | undefined
    const month = req.query.month as string | undefined

    let transactions
    if (vehicleId && month) {
      transactions = vehicleTransactionsAdapter.getByVehicleIdAndMonth(vehicleId, month)
    } else if (vehicleId) {
      transactions = vehicleTransactionsAdapter.getByVehicleId(vehicleId)
    } else {
      transactions = vehicleTransactionsAdapter.getAll()
    }
    res.json(transactions)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const transaction = vehicleTransactionsAdapter.getById(req.params.id)
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' })
    }
    res.json(transaction)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', (req: Request, res: Response) => {
  try {
    const transaction = vehicleTransactionsAdapter.create(req.body)
    res.status(201).json(transaction)
  } catch (error: any) {
    const statusCode = error.message && (
      error.message.includes('does not exist') ||
      error.message.includes('must be') ||
      error.message.includes('cannot be')
    ) ? 400 : 500
    res.status(statusCode).json({ error: error.message || 'Failed to create transaction' })
  }
})

router.put('/:id', (req: Request, res: Response) => {
  try {
    const transaction = vehicleTransactionsAdapter.update(req.params.id, req.body)
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' })
    }
    res.json(transaction)
  } catch (error: any) {
    const statusCode = error.message && (
      error.message.includes('does not exist') ||
      error.message.includes('must be') ||
      error.message.includes('cannot be')
    ) ? 400 : 500
    res.status(statusCode).json({ error: error.message || 'Failed to update transaction' })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  try {
    vehicleTransactionsAdapter.delete(req.params.id)
    res.status(204).send()
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router

