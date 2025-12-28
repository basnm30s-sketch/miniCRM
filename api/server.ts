/**
 * Express API Server for iManage
 * Handles all database operations and file uploads
 */

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import { initDatabase } from '../lib/database'

// Import routes
import customersRouter from './routes/customers'
import vendorsRouter from './routes/vendors'
import employeesRouter from './routes/employees'
import vehiclesRouter from './routes/vehicles'
import quotesRouter from './routes/quotes'
import purchaseOrdersRouter from './routes/purchase-orders'
import invoicesRouter from './routes/invoices'
import adminRouter from './routes/admin'
import uploadsRouter from './routes/uploads'
import payslipsRouter from './routes/payslips'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' })) // Increased limit for large requests
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Initialize database
try {
  initDatabase()
  console.log('Database initialized successfully')
} catch (error) {
  console.error('Failed to initialize database:', error)
  process.exit(1)
}

// API Routes
app.use('/api/customers', customersRouter)
app.use('/api/vendors', vendorsRouter)
app.use('/api/employees', employeesRouter)
app.use('/api/vehicles', vehiclesRouter)
app.use('/api/quotes', quotesRouter)
app.use('/api/purchase-orders', purchaseOrdersRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/admin', adminRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/payslips', payslipsRouter)
console.log('Payslips routes registered at /api/payslips')

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API server is running' })
})

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`)
  })
}

export default app

