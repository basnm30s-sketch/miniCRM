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
  vehicleTransactionsAdapter,
  expenseCategoriesAdapter,
  formatReferenceError,
} from '../../../api/adapters/sqlite'
import { getDatabase } from '../../../lib/database'

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
  'vehicle-transactions': vehicleTransactionsAdapter,
  'expense-categories': expenseCategoriesAdapter,
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route: routeParam } = await params
    // Filter out empty strings (from trailing slashes)
    const route = (routeParam || []).filter(segment => segment !== '')
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('API Route:', route, 'URL:', request.url)
    }
    
    // Health check
    if (route.length === 0 || (route.length === 1 && route[0] === 'health')) {
      return NextResponse.json({ status: 'ok', message: 'API server is running' })
    }
    
    // Admin settings
    if (route[0] === 'admin' && route[1] === 'settings') {
      const settings = adminAdapter.get()
      return NextResponse.json(settings)
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
    
    // Special route: /api/vehicles/:id/profitability
    if (route[0] === 'vehicles' && route[1] && route[2] === 'profitability') {
      try {
        const vehicle = vehiclesAdapter.getById(route[1])
        if (!vehicle) {
          return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
        }
        const profitability = vehicleTransactionsAdapter.getProfitabilityByVehicle(route[1])
        return NextResponse.json(profitability)
      } catch (error: any) {
        return handleError(error)
      }
    }
    
    // Special route: /api/vehicle-finances/dashboard
    if (route[0] === 'vehicle-finances' && route[1] === 'dashboard') {
      try {
        const dashboardMetrics = vehicleTransactionsAdapter.getDashboardMetrics()
        return NextResponse.json(dashboardMetrics)
      } catch (error: any) {
        console.error('Error getting dashboard metrics:', error)
        // Return empty dashboard structure instead of error
        return NextResponse.json({
          overall: {
            totalRevenue: 0,
            totalExpenses: 0,
            netProfit: 0,
            profitMargin: 0,
            avgRevenuePerVehicle: 0,
            avgProfitPerVehicle: 0,
            totalTransactions: 0,
            avgTransactionValue: 0,
          },
          timeBased: {
            currentMonth: { revenue: 0, expenses: 0, profit: 0 },
            lastMonth: { revenue: 0, expenses: 0, profit: 0 },
            momGrowth: { revenue: 0, expenses: 0, profit: 0 },
            ytd: { revenue: 0, expenses: 0, profit: 0 },
            monthlyTrend: [],
          },
          vehicleBased: {
            totalActive: 0,
            profitable: 0,
            lossMaking: 0,
            noData: 0,
            topByRevenue: [],
            topByProfit: [],
            bottomByProfit: [],
          },
          customerBased: {
            totalUnique: 0,
            topByRevenue: [],
            avgRevenuePerCustomer: 0,
          },
          categoryBased: {
            revenueByCategory: {},
            expensesByCategory: {},
            topExpenseCategory: 'N/A',
          },
          operational: {
            revenuePerVehiclePerMonth: 0,
            expenseRatio: 0,
            mostActiveVehicle: { vehicleId: '', vehicleNumber: 'N/A', transactionCount: 0 },
            avgTransactionsPerVehicle: 0,
          },
        })
      }
    }
    
    // Special route: /api/vehicle-transactions with query params or ID
    if (route[0] === 'vehicle-transactions') {
      const id = route[1]
      
      // If there's an ID, handle it as a single transaction request
      if (id) {
        try {
          const transaction = vehicleTransactionsAdapter.getById(id)
          if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
          }
          return NextResponse.json(transaction)
        } catch (error: any) {
          return handleError(error)
        }
      }
      
      // Otherwise, handle query params for filtering
      const searchParams = request.nextUrl.searchParams
      const vehicleId = searchParams.get('vehicleId')
      const month = searchParams.get('month')
      
      try {
        let transactions
        if (vehicleId && month) {
          transactions = vehicleTransactionsAdapter.getByVehicleIdAndMonth(vehicleId, month)
        } else if (vehicleId) {
          transactions = vehicleTransactionsAdapter.getByVehicleId(vehicleId)
        } else {
          transactions = vehicleTransactionsAdapter.getAll()
        }
        return NextResponse.json(transactions || [])
      } catch (error: any) {
        return handleError(error)
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
    const body = await request.json()
    
    // Admin settings
    if (route[0] === 'admin' && route[1] === 'settings') {
      const settings = adminAdapter.save(body)
      return NextResponse.json(settings, { status: 201 })
    }
    
    // Special route: /api/vehicle-transactions
    if (route[0] === 'vehicle-transactions') {
      try {
        const transaction = vehicleTransactionsAdapter.create(body)
        return NextResponse.json(transaction, { status: 201 })
      } catch (error: any) {
        return handleError(error)
      }
    }
    
    // Special route: /api/expense-categories
    if (route[0] === 'expense-categories') {
      try {
        const category = expenseCategoriesAdapter.create(body)
        return NextResponse.json(category, { status: 201 })
      } catch (error: any) {
        return handleError(error)
      }
    }
    
    // Resource routes: /api/{resource}
    const resource = route[0]
    
    if (!routeHandlers[resource]) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }
    
    const adapter = routeHandlers[resource]
    
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
    
    // Special route: /api/vehicle-transactions/:id
    if (route[0] === 'vehicle-transactions' && route[1]) {
      try {
        const transaction = vehicleTransactionsAdapter.update(route[1], body)
        if (!transaction) {
          return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }
        return NextResponse.json(transaction)
      } catch (error: any) {
        return handleError(error)
      }
    }
    
    // Special route: /api/expense-categories/:id
    if (route[0] === 'expense-categories' && route[1]) {
      try {
        const category = expenseCategoriesAdapter.update(route[1], body)
        if (!category) {
          return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }
        return NextResponse.json(category)
      } catch (error: any) {
        return handleError(error)
      }
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
    
    // Special route: /api/vehicle-transactions/:id
    if (route[0] === 'vehicle-transactions' && route[1]) {
      try {
        vehicleTransactionsAdapter.delete(route[1])
        return new NextResponse(null, { status: 204 })
      } catch (error: any) {
        return handleError(error)
      }
    }
    
    // Special route: /api/expense-categories/:id
    if (route[0] === 'expense-categories' && route[1]) {
      try {
        expenseCategoriesAdapter.delete(route[1])
        return new NextResponse(null, { status: 204 })
      } catch (error: any) {
        return handleError(error)
      }
    }
    
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

