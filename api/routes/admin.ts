import { Router, Request, Response } from 'express'
import { adminAdapter } from '../adapters/sqlite'

const router = Router()

// GET /api/admin/settings
router.get('/settings', (req: Request, res: Response) => {
  try {
    const settings = adminAdapter.get()
    res.json(settings)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/admin/settings
router.post('/settings', (req: Request, res: Response) => {
  try {
    const settings = adminAdapter.save(req.body)
    res.json(settings)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/admin/settings
router.put('/settings', (req: Request, res: Response) => {
  try {
    const settings = adminAdapter.save(req.body)
    res.json(settings)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router

