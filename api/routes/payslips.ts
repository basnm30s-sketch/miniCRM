import { Router, Request, Response } from 'express'
import { payslipsAdapter } from '../adapters/sqlite'

const router = Router()

// Test route to verify router is loaded
router.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Payslips router is working' })
})

router.get('/', (req: Request, res: Response) => {
  try {
    const payslips = payslipsAdapter.getAll()
    res.json(payslips || [])
  } catch (error: any) {
    console.error('Error getting all payslips:', error)
    // Return empty array instead of error to prevent frontend crashes
    res.json([])
  }
})

// IMPORTANT: This route must come before /:id to avoid route conflicts
router.get('/month/:month', (req: Request, res: Response) => {
  try {
    const month = req.params.month
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM' })
    }
    const payslips = payslipsAdapter.getByMonth(month)
    res.json(payslips)
  } catch (error: any) {
    console.error('Error getting payslips by month:', error)
    res.status(500).json({ error: error.message || 'Failed to get payslips by month' })
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const payslip = payslipsAdapter.getById(req.params.id)
    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found' })
    }
    res.json(payslip)
  } catch (error: any) {
    console.error('Error getting payslip by id:', error)
    res.status(500).json({ error: error.message || 'Failed to get payslip' })
  }
})

router.post('/', (req: Request, res: Response) => {
  try {
    console.log('POST /payslips - Received request:', { body: req.body })
    // Validate required fields
    if (!req.body.employeeId || !req.body.month) {
      console.error('POST /payslips - Missing required fields:', { employeeId: req.body.employeeId, month: req.body.month })
      return res.status(400).json({ error: 'employeeId and month are required' })
    }
    console.log('POST /payslips - Creating payslip...')
    const payslip = payslipsAdapter.create(req.body)
    console.log('POST /payslips - Payslip created successfully:', payslip.id)
    res.status(201).json(payslip)
  } catch (error: any) {
    console.error('Error creating payslip:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ error: error.message || 'Failed to create payslip' })
  }
})

router.put('/:id', (req: Request, res: Response) => {
  try {
    const payslip = payslipsAdapter.update(req.params.id, req.body)
    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found' })
    }
    res.json(payslip)
  } catch (error: any) {
    console.error('Error updating payslip:', error)
    res.status(500).json({ error: error.message || 'Failed to update payslip' })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  try {
    payslipsAdapter.delete(req.params.id)
    res.status(204).send()
  } catch (error: any) {
    console.error('Error deleting payslip:', error)
    res.status(500).json({ error: error.message || 'Failed to delete payslip' })
  }
})

export default router

