/**
 * Express API Server for iManage
 * Handles all database operations and file uploads
 */

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
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
import vehicleTransactionsRouter from './routes/vehicle-transactions'
import expenseCategoriesRouter from './routes/expense-categories'

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled promise rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err)
})

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' })) // Increased limit for large requests
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Request timeout: close stuck handlers so clients get 503 instead of hanging (client has 8s abort)
const REQUEST_TIMEOUT_MS = 18000
app.use((req: Request, res: Response, next: NextFunction) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'Request timeout' })
    }
  }, REQUEST_TIMEOUT_MS)
  res.on('finish', () => clearTimeout(timer))
  next()
})

// Initialize database
try {
  initDatabase()
  console.log('✓ Database initialized successfully')
} catch (error) {
  console.error('✗ Failed to initialize database:', error)
  console.error('Continuing without database (will use client-side storage)...')
  // Don't exit - allow server to run without database
}

// ============================================
// SERVE STATIC FRONTEND BUILD (CRITICAL FOR ELECTRON)
// ============================================
// In packaged mode, __dirname is dist-server/api/, so we need to go up two levels
// to get to the app root where 'out' folder is located
const frontendPath = path.join(__dirname, '..', '..', 'out')
console.log('[Server] Serving static files from:', frontendPath)

// Serve static assets (CSS, JS, images, fonts) with correct MIME types
app.use(express.static(frontendPath, {
  setHeaders: (res, filePath) => {
    // Ensure correct MIME types for assets
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css')
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript')
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json')
    } else if (filePath.endsWith('.woff2')) {
      res.setHeader('Content-Type', 'font/woff2')
    } else if (filePath.endsWith('.woff')) {
      res.setHeader('Content-Type', 'font/woff')
    }
  }
}))

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
app.use('/api/vehicle-transactions', vehicleTransactionsRouter)
app.use('/api/expense-categories', expenseCategoriesRouter)
console.log('Payslips routes registered at /api/payslips')
console.log('Vehicle transactions routes registered at /api/vehicle-transactions')
console.log('Expense categories routes registered at /api/expense-categories')

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API server is running' })
})

// ============================================
// SPA CATCH-ALL ROUTE (MUST BE AFTER API ROUTES)
// ============================================
// For client-side routes like /customers, /invoices, etc.
// This allows Next.js client-side routing to work
// Note: Express 5 requires named wildcard parameter syntax
app.get('/{*splat}', (req: Request, res: Response, next: NextFunction) => {
  // Skip if it's an API route (already handled above)
  if (req.path.startsWith('/api/')) {
    return next()
  }
  
  // Skip if it's a static asset (has file extension)
  // This prevents serving index.html for JS, CSS, images, etc.
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.map', '.webp']
  const hasExtension = staticExtensions.some(ext => req.path.toLowerCase().endsWith(ext))
  
  if (hasExtension) {
    // Let Express static middleware handle it, or return 404 if not found
    return next()
  }
  
  // Check if the requested file exists as a static file
  const requestedFile = path.join(frontendPath, req.path)
  if (fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()) {
    // File exists, let static middleware serve it
    return next()
  }
  
  // Serve index.html for all other routes (SPA catch-all)
  const indexPath = path.join(frontendPath, 'index.html')
  console.log('[Server] Catch-all route hit:', req.path, '-> serving index.html')
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('[Server] Error serving index.html:', err)
      res.status(500).send('Error loading application')
    }
  })
})

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// Start server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log('========================================')
    console.log(`✓ API server running on http://localhost:${PORT}`)
    console.log(`✓ Frontend path: ${path.join(__dirname, '..', 'out')}`)
    console.log(`✓ Node version: ${process.version}`)
    console.log(`✓ Process ID: ${process.pid}`)
    console.log('========================================')
  })

  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`✗ Port ${PORT} is already in use`)
      console.error('Another instance may be running')
    } else {
      console.error('✗ Server error:', error)
    }
    process.exit(1)
  })

  // Handle process termination
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('SIGINT received, closing server...')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  })
}

export default app

