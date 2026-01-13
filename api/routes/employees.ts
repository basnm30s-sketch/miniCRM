import { Router, Request, Response } from 'express'
import { employeesAdapter, formatReferenceError } from '../adapters/sqlite'
import { getDatabase } from '../../lib/database'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  try {
    const employees = employeesAdapter.getAll()
    res.json(employees)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const employee = employeesAdapter.getById(req.params.id)
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }
    res.json(employee)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', (req: Request, res: Response) => {
  try {
    // Validate that ID exists
    if (!req.body.id) {
      return res.status(400).json({ error: 'Employee ID is required' })
    }
    
    // Validate ID is not null/undefined/empty
    if (!req.body.id || req.body.id.trim() === '') {
      return res.status(400).json({ error: 'Employee ID cannot be empty' })
    }
    
    const employee = employeesAdapter.create(req.body)
    res.status(201).json(employee)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', (req: Request, res: Response) => {
  try {
    const employee = employeesAdapter.update(req.params.id, req.body)
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }
    res.json(employee)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  try {
    employeesAdapter.delete(req.params.id)
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
        const payslips = db.prepare('SELECT id, month FROM payslips WHERE employeeId = ?').all(req.params.id) as any[]
        const references = payslips.map((ps: any) => ({ type: 'Payslip', number: ps.month || ps.id }))
        if (references.length > 0) {
          res.status(409).json({ error: formatReferenceError('Employee', references) })
        } else {
          res.status(409).json({ error: 'Cannot delete Employee as it is referenced in other records' })
        }
      } catch {
        res.status(409).json({ error: 'Cannot delete Employee as it is referenced in other records' })
      }
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

export default router

