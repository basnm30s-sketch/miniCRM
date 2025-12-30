/**
 * Consolidated API Route Handler for Vercel
 * Handles all API endpoints in a single serverless function to stay within Vercel's 12 function limit
 */

import { NextRequest, NextResponse } from 'next/server'
import { initDatabase } from '../../../lib/database'
import {
  customersAdapter,
  vendorsAdapter,
  employeesAdapter,
  vehiclesAdapter,
  quotesAdapter,
  invoicesAdapter,
  payslipsAdapter,
  adminAdapter,
  formatReferenceError,
} from '../../../api/adapters/sqlite'
import { getDatabase } from '../../../lib/database'
import { 
  saveFile, 
  readFile, 
  fileExists, 
  saveBrandingFile, 
  checkBrandingFiles,
  ensureBrandingDirectory
} from '../../../api/services/file-storage'

// Initialize database on first import
try {
  initDatabase()
} catch (error) {
  console.error('Database initialization error:', error)
}

// Helper to handle errors
function handleError(error: any, defaultMessage = 'Internal server error'): NextResponse {
  const message = error?.message || defaultMessage
  const statusCode = 
    message.includes('not found') || message.includes('404') ? 404 :
    message.includes('Cannot delete') && message.includes('referenced') ? 409 :
    message.includes('FOREIGN KEY') || message.includes('constraint') ? 409 :
    message.includes('required') || message.includes('does not exist') ? 400 :
    500
  
  return NextResponse.json({ error: message }, { status: statusCode })
}

// Route handlers for each resource
const routeHandlers: Record<string, any> = {
  customers: customersAdapter,
  vendors: vendorsAdapter,
  employees: employeesAdapter,
  vehicles: vehiclesAdapter,
  quotes: quotesAdapter,
  invoices: invoicesAdapter,
  payslips: payslipsAdapter,
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route: routeParam } = await params
    const route = routeParam || []
    
    // Health check
    if (route.length === 0 || (route.length === 1 && route[0] === 'health')) {
      return NextResponse.json({ status: 'ok', message: 'API server is running' })
    }
    
    // Admin settings
    if (route[0] === 'admin' && route[1] === 'settings') {
      const settings = adminAdapter.get()
      return NextResponse.json(settings)
    }
    
    // Uploads routes: /api/uploads/branding/check
    if (route[0] === 'uploads' && route[1] === 'branding' && route[2] === 'check') {
      try {
        // Ensure default branding files are initialized (copies from repo to persistent disk if needed)
        ensureBrandingDirectory()
        const result = checkBrandingFiles()
        return NextResponse.json(result)
      } catch (error: any) {
        console.error('Error checking branding files:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
    
    // Uploads routes: /api/uploads/branding/:filename
    if (route[0] === 'uploads' && route[1] === 'branding' && route[2]) {
      try {
        // Ensure default branding files are initialized (copies from repo to persistent disk if needed)
        ensureBrandingDirectory()
        
        const filename = route[2]
        const relativePath = `./data/branding/${filename}`
        
        // Try to read file (readFile has fallback logic to check repo location)
        let fileBuffer: Buffer
        try {
          fileBuffer = readFile(relativePath)
        } catch (readError: any) {
          // If readFile fails, log and return 404
          console.error(`[API] Branding file not found: ${filename} at path: ${relativePath}`)
          console.error(`[API] Read error:`, readError?.message || readError)
          return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }
        
        // Determine content type
        const ext = filename.split('.').pop()?.toLowerCase()
        let contentType = 'application/octet-stream'
        if (ext === 'png') contentType = 'image/png'
        else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg'
        else if (ext === 'gif') contentType = 'image/gif'
        else if (ext === 'webp') contentType = 'image/webp'
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
          },
        })
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
    
    // Special route: /api/payslips/month/:month
    if (route[0] === 'payslips' && route[1] === 'month' && route[2]) {
      const month = route[2]
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: 'Invalid month format. Expected YYYY-MM' }, { status: 400 })
      }
      try {
        const payslips = payslipsAdapter.getByMonth(month)
        return NextResponse.json(payslips || [])
      } catch (error: any) {
        console.error('Error getting payslips by month:', error)
        return NextResponse.json([])
      }
    }
    
    // Resource routes: /api/{resource} or /api/{resource}/{id}
    const resource = route[0]
    const id = route[1]
    
    if (!routeHandlers[resource]) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }
    
    const adapter = routeHandlers[resource]
    
    if (id) {
      // GET /api/{resource}/{id}
      const item = adapter.getById(id)
      if (!item) {
        return NextResponse.json({ error: `${resource.slice(0, -1)} not found` }, { status: 404 })
      }
      return NextResponse.json(item)
    } else {
      // GET /api/{resource}
      try {
        const items = adapter.getAll()
        return NextResponse.json(items || [])
      } catch (error: any) {
        // For payslips, return empty array on error to prevent frontend crashes
        if (resource === 'payslips') {
          console.error('Error getting all payslips:', error)
          return NextResponse.json([])
        }
        throw error
      }
    }
  } catch (error: any) {
    return handleError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route: routeParam } = await params
    const route = routeParam || []
    
    // Uploads routes: /api/uploads
    if (route[0] === 'uploads') {
      try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        
        if (!file) {
          return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }
        
        const type = formData.get('type') as string | null
        const brandingType = formData.get('brandingType') as string | null
        
        // Handle branding images (logo, seal, signature)
        if (type === 'branding') {
          if (!brandingType || !['logo', 'seal', 'signature'].includes(brandingType)) {
            return NextResponse.json({ 
              error: 'Invalid branding type. Must be: logo, seal, or signature' 
            }, { status: 400 })
          }
          
          try {
            // Convert File to Buffer
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            
            saveBrandingFile(
              buffer,
              file.name,
              brandingType as 'logo' | 'seal' | 'signature'
            )
            
            return NextResponse.json({ success: true, type: brandingType })
          } catch (saveError: any) {
            console.error('Error saving branding file:', saveError)
            return NextResponse.json({ 
              error: `Failed to save branding file: ${saveError?.message || 'Unknown error'}` 
            }, { status: 500 })
          }
        }
        
        // Handle regular uploads
        if (!type || !['logos', 'documents', 'signatures'].includes(type)) {
          return NextResponse.json({ 
            error: 'Invalid file type. Must be: logos, documents, signatures, or branding' 
          }, { status: 400 })
        }
        
        try {
          // Convert File to Buffer
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          
          const relativePath = saveFile(
            buffer,
            file.name,
            type as 'logos' | 'documents' | 'signatures'
          )
          
          return NextResponse.json({ path: relativePath })
        } catch (saveError: any) {
          console.error('Error saving file:', saveError)
          return NextResponse.json({ 
            error: `Failed to save file: ${saveError?.message || 'Unknown error'}` 
          }, { status: 500 })
        }
      } catch (error: any) {
        console.error('Upload error:', error)
        const errorMessage = error?.message || error?.toString() || 'Unknown error occurred'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
    }
    
    // Admin settings
    if (route[0] === 'admin' && route[1] === 'settings') {
      const body = await request.json()
      const settings = adminAdapter.save(body)
      return NextResponse.json(settings, { status: 201 })
    }
    
    // Resource routes: /api/{resource}
    const resource = route[0]
    
    if (!routeHandlers[resource]) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }
    
    const adapter = routeHandlers[resource]
    const body = await request.json()
    
    // Special validation for payslips
    if (resource === 'payslips') {
      if (!body.employeeId || !body.month) {
        return NextResponse.json({ error: 'employeeId and month are required' }, { status: 400 })
      }
    }
    
    try {
      const item = adapter.create(body)
      return NextResponse.json(item, { status: 201 })
    } catch (error: any) {
      // For payslips, provide more detailed error logging
      if (resource === 'payslips') {
        console.error('Error creating payslip:', error)
        console.error('Payslip data:', JSON.stringify(body, null, 2))
      }
      throw error
    }
  } catch (error: any) {
    return handleError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route: routeParam } = await params
    const route = routeParam || []
    const body = await request.json()
    
    // Admin settings
    if (route[0] === 'admin' && route[1] === 'settings') {
      const settings = adminAdapter.save(body)
      return NextResponse.json(settings)
    }
    
    // Resource routes: /api/{resource}/{id}
    const resource = route[0]
    const id = route[1]
    
    if (!routeHandlers[resource] || !id) {
      return NextResponse.json({ error: 'Resource or ID not found' }, { status: 404 })
    }
    
    const adapter = routeHandlers[resource]
    const item = adapter.update(id, body)
    
    if (!item) {
      return NextResponse.json({ error: `${resource.slice(0, -1)} not found` }, { status: 404 })
    }
    
    return NextResponse.json(item)
  } catch (error: any) {
    return handleError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route: routeParam } = await params
    const route = routeParam || []
    
    // Resource routes: /api/{resource}/{id}
    const resource = route[0]
    const id = route[1]
    
    if (!routeHandlers[resource] || !id) {
      return NextResponse.json({ error: 'Resource or ID not found' }, { status: 404 })
    }
    
    const adapter = routeHandlers[resource]
    
    try {
      adapter.delete(id)
      return new NextResponse(null, { status: 204 })
    } catch (error: any) {
      // Handle reference errors with proper formatting
      if (error.message && error.message.includes('Cannot delete') && error.message.includes('referenced')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      
      // Try to get references for better error messages
      if (error.message && (error.message.includes('FOREIGN KEY') || error.message.includes('constraint'))) {
        try {
          const db = getDatabase()
          let references: Array<{type: string, number: string}> = []
          
          if (resource === 'customers') {
            const quotes = db.prepare('SELECT number FROM quotes WHERE customerId = ?').all(id) as any[]
            const invoices = db.prepare('SELECT number FROM invoices WHERE customerId = ?').all(id) as any[]
            references = [
              ...quotes.map((q: any) => ({ type: 'Quote', number: q.number })),
              ...invoices.map((i: any) => ({ type: 'Invoice', number: i.number }))
            ]
          } else if (resource === 'vendors') {
            const purchaseOrders = db.prepare('SELECT number FROM purchase_orders WHERE vendorId = ?').all(id) as any[]
            const invoices = db.prepare('SELECT number FROM invoices WHERE vendorId = ?').all(id) as any[]
            references = [
              ...purchaseOrders.map((po: any) => ({ type: 'Purchase Order', number: po.number })),
              ...invoices.map((i: any) => ({ type: 'Invoice', number: i.number }))
            ]
          } else if (resource === 'employees') {
            const payslips = db.prepare('SELECT id, month FROM payslips WHERE employeeId = ?').all(id) as any[]
            references = payslips.map((ps: any) => ({ type: 'Payslip', number: ps.month || ps.id }))
          } else if (resource === 'vehicles') {
            const quoteItems = db.prepare(`
              SELECT DISTINCT q.number 
              FROM quote_items qi
              JOIN quotes q ON qi.quoteId = q.id
              WHERE qi.vehicleTypeId = ?
            `).all(id) as any[]
            references = quoteItems.map((qi: any) => ({ type: 'Quote', number: qi.number }))
          } else if (resource === 'quotes') {
            const invoices = db.prepare('SELECT number FROM invoices WHERE quoteId = ?').all(id) as any[]
            references = invoices.map((i: any) => ({ type: 'Invoice', number: i.number }))
          }
          
          if (references.length > 0) {
            const entityName = resource.charAt(0).toUpperCase() + resource.slice(1, -1)
            return NextResponse.json({ error: formatReferenceError(entityName, references) }, { status: 409 })
          }
        } catch {
          // Fall through to generic error
        }
      }
      
      return handleError(error)
    }
  } catch (error: any) {
    return handleError(error)
  }
}

