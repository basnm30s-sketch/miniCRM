/**
 * Demo Data Population Script
 * 
 * This script populates comprehensive demo data across all modules
 * for customer demonstrations. It replaces all existing data.
 * 
 * Usage: npm run demo:populate
 */

import { initDatabase, getDatabase, closeDatabase } from '../lib/database'
import {
  customersAdapter,
  vendorsAdapter,
  employeesAdapter,
  vehiclesAdapter,
  adminAdapter,
  quotesAdapter,
  purchaseOrdersAdapter,
  invoicesAdapter,
  expenseCategoriesAdapter,
  vehicleTransactionsAdapter,
} from '../api/adapters/sqlite'

// Helper to generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Helper to get safe date (not in future)
function getSafeDate(month: string, day: number): string {
  const transactionDate = new Date(month + '-01')
  const today = new Date()
  const maxDay = transactionDate.getMonth() === today.getMonth() && transactionDate.getFullYear() === today.getFullYear()
    ? today.getDate()
    : new Date(transactionDate.getFullYear(), transactionDate.getMonth() + 1, 0).getDate()
  const safeDay = Math.min(day, maxDay)
  return `${month}-${String(safeDay).padStart(2, '0')}`
}

// Clear all existing data
function clearAllData(): void {
  const db = getDatabase()
  console.log('Clearing all existing data...')
  
  // Delete in reverse dependency order to avoid foreign key constraints
  db.prepare('DELETE FROM vehicle_transactions').run()
  db.prepare('DELETE FROM invoices').run()
  db.prepare('DELETE FROM quotes').run()
  db.prepare('DELETE FROM purchase_orders').run()
  db.prepare('DELETE FROM payslips').run()
  db.prepare('DELETE FROM expense_categories WHERE isCustom = 1').run() // Keep predefined
  db.prepare('DELETE FROM vehicles').run()
  db.prepare('DELETE FROM employees').run()
  db.prepare('DELETE FROM vendors').run()
  db.prepare('DELETE FROM customers').run()
  
  console.log('✓ All data cleared')
}

// Populate Admin Settings
function populateAdminSettings(): void {
  console.log('Populating Admin Settings...')
  
  const settings = {
    id: 'settings_1',
    companyName: 'ALMSAR ALZAKI TRANSPORT AND MAINTENANCE',
    address: 'Dubai, United Arab Emirates',
    vatNumber: 'VAT-123456789',
    phone: '+971 4 123 4567',
    email: 'info@almsar.ae',
    logoPath: '',
    sealPath: '',
    signaturePath: '',
    quoteNumberPattern: 'Q-YYYYMMDD-NNNN',
    invoiceNumberPattern: 'INV-YYYYMMDD-NNNN',
    purchaseOrderNumberPattern: 'PO-YYYYMMDD-NNNN',
  }
  
  adminAdapter.create(settings)
  console.log('✓ Admin Settings created')
}

// Populate Expense Categories (predefined already exist, add custom ones)
function populateExpenseCategories(): void {
  console.log('Populating Expense Categories...')
  
  const customCategories = [
    { id: generateId(), name: 'Tire Replacement', isCustom: true },
    { id: generateId(), name: 'Roadside Assistance', isCustom: true },
    { id: generateId(), name: 'Parking Fees', isCustom: true },
  ]
  
  for (const cat of customCategories) {
    try {
      expenseCategoriesAdapter.create(cat)
    } catch (err: any) {
      // Ignore if already exists
      if (!err.message.includes('UNIQUE')) {
        console.warn(`Failed to create category ${cat.name}:`, err.message)
      }
    }
  }
  
  console.log(`✓ Expense Categories ready (${customCategories.length} custom added)`)
}

// Populate Customers
function populateCustomers(): any[] {
  console.log('Populating Customers...')
  
  const customers = [
    {
      id: generateId(),
      name: 'Ahmed Al Mansouri',
      company: 'Al Mansouri Trading LLC',
      email: 'ahmed@almansouri.ae',
      phone: '+971 4 123 4567',
      address: 'Business Bay, Dubai, UAE',
    },
    {
      id: generateId(),
      name: 'Fatima Al Maktoum',
      company: 'Al Maktoum Logistics',
      email: 'fatima@almaktoum.ae',
      phone: '+971 4 765 4321',
      address: 'Al Khalidiyah, Abu Dhabi, UAE',
    },
    {
      id: generateId(),
      name: 'Mohammed Al Zaabi',
      company: 'Zaabi Construction Group',
      email: 'mohammed@zaabi.ae',
      phone: '+971 2 234 5678',
      address: 'Al Nahyan, Abu Dhabi, UAE',
    },
    {
      id: generateId(),
      name: 'Sara Al Shamsi',
      company: 'Shamsi Trading Company',
      email: 'sara@shamsi.ae',
      phone: '+971 4 345 6789',
      address: 'Deira, Dubai, UAE',
    },
    {
      id: generateId(),
      name: 'Khalid Al Suwaidi',
      company: 'Suwaidi Transport Services',
      email: 'khalid@suwaidi.ae',
      phone: '+971 4 456 7890',
      address: 'Jumeirah, Dubai, UAE',
    },
    {
      id: generateId(),
      name: 'Layla Al Dhaheri',
      company: 'Dhaheri Events Management',
      email: 'layla@dhaheri.ae',
      phone: '+971 2 567 8901',
      address: 'Al Khalidiyah, Abu Dhabi, UAE',
    },
    {
      id: generateId(),
      name: 'Omar Al Nuaimi',
      company: 'Nuaimi Real Estate',
      email: 'omar@nuaimi.ae',
      phone: '+971 4 678 9012',
      address: 'Marina, Dubai, UAE',
    },
  ]
  
  const created = customers.map(c => customersAdapter.create(c))
  console.log(`✓ ${created.length} Customers created`)
  return created
}

// Populate Vendors
function populateVendors(): any[] {
  console.log('Populating Vendors...')
  
  const vendors = [
    {
      id: generateId(),
      name: 'Dubai Auto Parts',
      contactPerson: 'Yusuf Al Hashimi',
      email: 'yusuf@dubaiauto.ae',
      phone: '+971 4 111 2222',
      address: 'Al Quoz, Dubai, UAE',
    },
    {
      id: generateId(),
      name: 'Gulf Insurance Services',
      contactPerson: 'Noor Al Mazrouei',
      email: 'noor@gulfinsurance.ae',
      phone: '+971 4 222 3333',
      address: 'Business Bay, Dubai, UAE',
    },
    {
      id: generateId(),
      name: 'Emirates Fuel Supply',
      contactPerson: 'Hassan Al Otaiba',
      email: 'hassan@emiratesfuel.ae',
      phone: '+971 4 333 4444',
      address: 'Jebel Ali, Dubai, UAE',
    },
    {
      id: generateId(),
      name: 'Al Ain Maintenance Center',
      contactPerson: 'Rashid Al Dhaheri',
      email: 'rashid@alainmaintenance.ae',
      phone: '+971 3 444 5555',
      address: 'Al Ain, UAE',
    },
  ]
  
  const created = vendors.map(v => vendorsAdapter.create(v))
  console.log(`✓ ${created.length} Vendors created`)
  return created
}

// Populate Vehicles
function populateVehicles(): any[] {
  console.log('Populating Vehicles...')
  
  const vehicles = [
    {
      id: generateId(),
      vehicleNumber: '23 A 45345',
      vehicleType: 'SUV',
      make: 'Toyota',
      model: 'Land Cruiser',
      year: 2022,
      color: 'White',
      purchasePrice: 40000,
      purchaseDate: '2023-01-15',
      fuelType: 'Petrol',
      status: 'active',
      basePrice: 800,
    },
    {
      id: generateId(),
      vehicleNumber: 'HJJK999',
      vehicleType: 'Sedan',
      make: 'Honda',
      model: 'Accord',
      year: 2021,
      color: 'Silver',
      purchasePrice: 20000,
      purchaseDate: '2023-03-10',
      fuelType: 'Petrol',
      status: 'active',
      basePrice: 400,
    },
    {
      id: generateId(),
      vehicleNumber: 'AB 12345',
      vehicleType: 'Van',
      make: 'Mercedes',
      model: 'Sprinter',
      year: 2020,
      color: 'White',
      purchasePrice: 35000,
      purchaseDate: '2023-05-20',
      fuelType: 'Diesel',
      status: 'active',
      basePrice: 600,
    },
    {
      id: generateId(),
      vehicleNumber: 'CD 67890',
      vehicleType: 'Pickup Truck',
      make: 'Ford',
      model: 'F-150',
      year: 2021,
      color: 'Black',
      purchasePrice: 28000,
      purchaseDate: '2023-07-05',
      fuelType: 'Petrol',
      status: 'active',
      basePrice: 500,
    },
    {
      id: generateId(),
      vehicleNumber: 'EF 11111',
      vehicleType: 'Lorry',
      make: 'Volvo',
      model: 'FH16',
      year: 2019,
      color: 'Blue',
      purchasePrice: 85000,
      purchaseDate: '2023-02-28',
      fuelType: 'Diesel',
      status: 'active',
      basePrice: 1000,
    },
    {
      id: generateId(),
      vehicleNumber: 'GH 22222',
      vehicleType: 'SUV',
      make: 'Nissan',
      model: 'Patrol',
      year: 2022,
      color: 'Grey',
      purchasePrice: 45000,
      purchaseDate: '2023-04-12',
      fuelType: 'Petrol',
      status: 'active',
      basePrice: 750,
    },
    {
      id: generateId(),
      vehicleNumber: 'IJ 33333',
      vehicleType: 'Sedan',
      make: 'BMW',
      model: '5 Series',
      year: 2023,
      color: 'Black',
      purchasePrice: 55000,
      purchaseDate: '2023-08-15',
      fuelType: 'Petrol',
      status: 'active',
      basePrice: 900,
    },
    {
      id: generateId(),
      vehicleNumber: 'KL 44444',
      vehicleType: 'Van',
      make: 'Ford',
      model: 'Transit',
      year: 2021,
      color: 'White',
      purchasePrice: 32000,
      purchaseDate: '2023-06-22',
      fuelType: 'Diesel',
      status: 'maintenance',
      basePrice: 550,
    },
  ]
  
  const created = vehicles.map(v => vehiclesAdapter.create(v))
  console.log(`✓ ${created.length} Vehicles created`)
  return created
}

// Populate Employees
function populateEmployees(): any[] {
  console.log('Populating Employees...')
  
  const employees = [
    {
      id: generateId(),
      name: 'Ali Al Mazrouei',
      designation: 'Driver',
      email: 'ali@almsar.ae',
      phone: '+971 50 111 2222',
      salary: 3000,
      employmentDate: '2023-01-01',
      status: 'active',
    },
    {
      id: generateId(),
      name: 'Mohammed Al Zaabi',
      designation: 'Driver',
      email: 'mohammed.driver@almsar.ae',
      phone: '+971 50 222 3333',
      salary: 2800,
      employmentDate: '2023-02-15',
      status: 'active',
    },
    {
      id: generateId(),
      name: 'Ahmed Al Suwaidi',
      designation: 'Senior Driver',
      email: 'ahmed.driver@almsar.ae',
      phone: '+971 50 333 4444',
      salary: 3500,
      employmentDate: '2022-11-01',
      status: 'active',
    },
    {
      id: generateId(),
      name: 'Fatima Al Dhaheri',
      designation: 'Office Manager',
      email: 'fatima@almsar.ae',
      phone: '+971 50 444 5555',
      salary: 5000,
      employmentDate: '2023-01-10',
      status: 'active',
    },
    {
      id: generateId(),
      name: 'Khalid Al Nuaimi',
      designation: 'Accountant',
      email: 'khalid@almsar.ae',
      phone: '+971 50 555 6666',
      salary: 4500,
      employmentDate: '2023-03-01',
      status: 'active',
    },
  ]
  
  const created = employees.map(e => employeesAdapter.create(e))
  console.log(`✓ ${created.length} Employees created`)
  return created
}

// Populate Vehicle Transactions
function populateVehicleTransactions(vehicles: any[], employees: any[]): void {
  console.log('Populating Vehicle Transactions...')
  
  const now = new Date()
  const months: string[] = []
  
  // Generate last 12 months (rolling)
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth() + 1
    months.push(`${year}-${String(month).padStart(2, '0')}`)
  }
  
  let totalTransactions = 0
  
  vehicles.forEach((vehicle, vIndex) => {
    const isHighValue = vehicle.purchasePrice >= 40000
    const purchasePrice = vehicle.purchasePrice || 20000
    
    // Purchase expense in first month
    const firstMonth = months[0]
    const purchaseDate = getSafeDate(firstMonth, 15)
    
    try {
      vehicleTransactionsAdapter.create({
        id: generateId(),
        vehicleId: vehicle.id,
        transactionType: 'expense',
        category: 'Purchase',
        amount: purchasePrice,
        date: purchaseDate,
        month: firstMonth,
        description: `Vehicle purchase: ${vehicle.vehicleNumber}`,
      })
      totalTransactions++
    } catch (err: any) {
      console.warn(`Failed to create purchase transaction for ${vehicle.vehicleNumber}:`, err.message)
    }
    
    // Generate transactions for each month
    months.forEach((month, mIndex) => {
      const isFirstMonth = mIndex === 0
      
      // Revenue transactions (2-4 per month)
      const numRevenue = isFirstMonth ? 2 : (mIndex === months.length - 1 ? 4 : 3)
      const baseRevenue = isHighValue ? 3500 : 2000
      const revenueVariation = 0.9 + (Math.sin((mIndex / months.length) * Math.PI * 2) * 0.15)
      const monthlyRevenue = Math.round((isHighValue ? 10000 : 6000) * revenueVariation)
      const revenuePerTx = Math.round(monthlyRevenue / numRevenue)
      
      for (let i = 0; i < numRevenue; i++) {
        const day = 5 + (i * 7) + (i % 3)
        const amount = revenuePerTx + (i % 2 === 0 ? 200 : -100)
        
        try {
          vehicleTransactionsAdapter.create({
            id: generateId(),
            vehicleId: vehicle.id,
            transactionType: 'revenue',
            category: 'Rental Income',
            amount,
            date: getSafeDate(month, day),
            month,
            description: `Rental income - Customer ${String.fromCharCode(65 + i)}`,
          })
          totalTransactions++
        } catch (err: any) {
          console.warn(`Failed to create revenue transaction:`, err.message)
        }
      }
      
      // Expenses
      if (!isFirstMonth) {
        // Insurance
        try {
          vehicleTransactionsAdapter.create({
            id: generateId(),
            vehicleId: vehicle.id,
            transactionType: 'expense',
            category: 'Insurance',
            amount: isHighValue ? 1000 : 700,
            date: getSafeDate(month, 1),
            month,
            description: 'Monthly insurance premium',
          })
          totalTransactions++
        } catch (err: any) {
          console.warn(`Failed to create insurance transaction:`, err.message)
        }
      }
      
      // Driver salary (every 3 months)
      if (mIndex % 3 === 0 && mIndex > 0 && employees.length > 0) {
        const driver = employees.find(e => e.designation === 'Driver') || employees[0]
        try {
          vehicleTransactionsAdapter.create({
            id: generateId(),
            vehicleId: vehicle.id,
            transactionType: 'expense',
            category: 'Driver Salary',
            amount: isHighValue ? 2500 : 2000,
            date: getSafeDate(month, 15),
            month,
            description: 'Driver salary for rental period',
            employeeId: driver.id,
          })
          totalTransactions++
        } catch (err: any) {
          console.warn(`Failed to create driver salary transaction:`, err.message)
        }
      }
      
      // Fuel (every month except first)
      if (mIndex > 0) {
        try {
          vehicleTransactionsAdapter.create({
            id: generateId(),
            vehicleId: vehicle.id,
            transactionType: 'expense',
            category: 'Fuel',
            amount: isHighValue ? (1200 + Math.floor(Math.random() * 300)) : (800 + Math.floor(Math.random() * 300)),
            date: getSafeDate(month, 20),
            month,
            description: 'Fuel expenses for the month',
          })
          totalTransactions++
        } catch (err: any) {
          console.warn(`Failed to create fuel transaction:`, err.message)
        }
      }
      
      // Maintenance (every 4 months)
      if (mIndex % 4 === 3 && mIndex > 0) {
        try {
          vehicleTransactionsAdapter.create({
            id: generateId(),
            vehicleId: vehicle.id,
            transactionType: 'expense',
            category: 'Maintenance',
            amount: isHighValue ? (600 + Math.floor(Math.random() * 300)) : (300 + Math.floor(Math.random() * 200)),
            date: getSafeDate(month, 25),
            month,
            description: 'Regular service and maintenance',
          })
          totalTransactions++
        } catch (err: any) {
          console.warn(`Failed to create maintenance transaction:`, err.message)
        }
      }
      
      // Registration (once for high value vehicles)
      if (isHighValue && mIndex === 6) {
        try {
          vehicleTransactionsAdapter.create({
            id: generateId(),
            vehicleId: vehicle.id,
            transactionType: 'expense',
            category: 'Registration',
            amount: 1500,
            date: getSafeDate(month, 1),
            month,
            description: 'Vehicle registration renewal',
          })
          totalTransactions++
        } catch (err: any) {
          console.warn(`Failed to create registration transaction:`, err.message)
        }
      }
    })
  })
  
  console.log(`✓ ${totalTransactions} Vehicle Transactions created`)
}

// Populate Quotes
function populateQuotes(customers: any[], vehicles: any[]): any[] {
  console.log('Populating Quotes...')
  
  const quotes: any[] = []
  const statuses = ['draft', 'sent', 'accepted', 'rejected']
  const now = new Date()
  
  for (let i = 0; i < 10; i++) {
    const monthsAgo = Math.floor(Math.random() * 6)
    const quoteDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.floor(Math.random() * 28) + 1)
    const customer = customers[Math.floor(Math.random() * customers.length)]
    const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    
    const lineItems = [
      {
        id: generateId(),
        description: `Vehicle rental - ${vehicle.vehicleNumber}`,
        quantity: Math.floor(Math.random() * 5) + 1,
        unitPrice: vehicle.basePrice || 500,
      },
      {
        id: generateId(),
        description: 'Driver service',
        quantity: Math.floor(Math.random() * 3) + 1,
        unitPrice: 200,
      },
    ]
    
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const tax = subtotal * 0.05
    const total = subtotal + tax
    
    const quote = {
      id: generateId(),
      number: `Q-${quoteDate.getFullYear()}${String(quoteDate.getMonth() + 1).padStart(2, '0')}${String(quoteDate.getDate()).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
      customerId: customer.id,
      date: quoteDate.toISOString().split('T')[0],
      status,
      lineItems,
      subtotal,
      tax,
      total,
      notes: `Quote for ${customer.company || customer.name}`,
    }
    
    try {
      quotesAdapter.create(quote)
      quotes.push(quote)
    } catch (err: any) {
      console.warn(`Failed to create quote ${quote.number}:`, err.message)
    }
  }
  
  console.log(`✓ ${quotes.length} Quotes created`)
  return quotes
}

// Populate Invoices
function populateInvoices(customers: any[], quotes: any[]): void {
  console.log('Populating Invoices...')
  
  const invoices: any[] = []
  const statuses = ['draft', 'sent', 'paid', 'partial']
  const now = new Date()
  
  // Some invoices from quotes
  quotes.filter(q => q.status === 'accepted').slice(0, 5).forEach(quote => {
    const invoiceDate = new Date(quote.date)
    invoiceDate.setDate(invoiceDate.getDate() + 7)
    
    const invoice = {
      id: generateId(),
      number: `INV-${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}${String(invoiceDate.getDate()).padStart(2, '0')}-${String(invoices.length + 1).padStart(4, '0')}`,
      customerId: quote.customerId,
      quoteId: quote.id,
      date: invoiceDate.toISOString().split('T')[0],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      lineItems: quote.lineItems,
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      amountReceived: Math.random() > 0.5 ? quote.total : quote.total * 0.5,
      notes: `Invoice from quote ${quote.number}`,
    }
    
    try {
      invoicesAdapter.create(invoice)
      invoices.push(invoice)
    } catch (err: any) {
      console.warn(`Failed to create invoice ${invoice.number}:`, err.message)
    }
  })
  
  // Standalone invoices
  for (let i = 0; i < 8; i++) {
    const monthsAgo = Math.floor(Math.random() * 6)
    const invoiceDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.floor(Math.random() * 28) + 1)
    const customer = customers[Math.floor(Math.random() * customers.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    
    const lineItems = [
      {
        id: generateId(),
        description: 'Vehicle rental service',
        quantity: Math.floor(Math.random() * 5) + 1,
        unitPrice: 500 + Math.floor(Math.random() * 500),
      },
    ]
    
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const tax = subtotal * 0.05
    const total = subtotal + tax
    
    const invoice = {
      id: generateId(),
      number: `INV-${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}${String(invoiceDate.getDate()).padStart(2, '0')}-${String(invoices.length + 1).padStart(4, '0')}`,
      customerId: customer.id,
      date: invoiceDate.toISOString().split('T')[0],
      status,
      lineItems,
      subtotal,
      tax,
      total,
      amountReceived: status === 'paid' ? total : (status === 'partial' ? total * 0.5 : 0),
      notes: `Invoice for ${customer.company || customer.name}`,
    }
    
    try {
      invoicesAdapter.create(invoice)
      invoices.push(invoice)
    } catch (err: any) {
      console.warn(`Failed to create invoice ${invoice.number}:`, err.message)
    }
  }
  
  console.log(`✓ ${invoices.length} Invoices created`)
}

// Populate Purchase Orders
function populatePurchaseOrders(vendors: any[]): void {
  console.log('Populating Purchase Orders...')
  
  const pos: any[] = []
  const statuses = ['draft', 'sent', 'received', 'cancelled']
  const now = new Date()
  
  for (let i = 0; i < 6; i++) {
    const monthsAgo = Math.floor(Math.random() * 4)
    const poDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.floor(Math.random() * 28) + 1)
    const vendor = vendors[Math.floor(Math.random() * vendors.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    
    const lineItems = [
      {
        id: generateId(),
        description: 'Auto parts and supplies',
        quantity: Math.floor(Math.random() * 10) + 1,
        unitPrice: 100 + Math.floor(Math.random() * 200),
      },
    ]
    
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const tax = subtotal * 0.05
    const total = subtotal + tax
    
    const po = {
      id: generateId(),
      number: `PO-${poDate.getFullYear()}${String(poDate.getMonth() + 1).padStart(2, '0')}${String(poDate.getDate()).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
      vendorId: vendor.id,
      date: poDate.toISOString().split('T')[0],
      status,
      lineItems,
      subtotal,
      tax,
      total,
      notes: `Purchase order to ${vendor.name}`,
    }
    
    try {
      purchaseOrdersAdapter.create(po)
      pos.push(po)
    } catch (err: any) {
      console.warn(`Failed to create PO ${po.number}:`, err.message)
    }
  }
  
  console.log(`✓ ${pos.length} Purchase Orders created`)
}

// Populate Payslips
function populatePayslips(employees: any[]): void {
  console.log('Populating Payslips...')
  
  const payslips: any[] = []
  const now = new Date()
  
  employees.forEach(employee => {
    // Generate payslips for last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
      
      const basicSalary = employee.salary || 3000
      const allowances = basicSalary * 0.1
      const deductions = basicSalary * 0.05
      const netSalary = basicSalary + allowances - deductions
      
      const payslip = {
        id: generateId(),
        employeeId: employee.id,
        month,
        basicSalary,
        allowances,
        deductions,
        netSalary,
        status: 'paid',
      }
      
      try {
        payslipsAdapter.create(payslip)
        payslips.push(payslip)
      } catch (err: any) {
        console.warn(`Failed to create payslip for ${employee.name} (${month}):`, err.message)
      }
    }
  })
  
  console.log(`✓ ${payslips.length} Payslips created`)
}

// Main function
async function populateDemoData(): Promise<void> {
  const startTime = Date.now()
  
  try {
    console.log('========================================')
    console.log('Demo Data Population Script')
    console.log('========================================\n')
    
    // Initialize database
    initDatabase()
    
    // Clear existing data
    clearAllData()
    
    // Populate in dependency order
    populateAdminSettings()
    populateExpenseCategories()
    const customers = populateCustomers()
    const vendors = populateVendors()
    const vehicles = populateVehicles()
    const employees = populateEmployees()
    populateVehicleTransactions(vehicles, employees)
    const quotes = populateQuotes(customers, vehicles)
    populateInvoices(customers, quotes)
    populatePurchaseOrders(vendors)
    populatePayslips(employees)
    
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    
    console.log('\n========================================')
    console.log('✓ Demo data population complete!')
    console.log(`✓ Total time: ${duration} seconds`)
    console.log('========================================')
    
  } catch (error: any) {
    console.error('\n❌ Error populating demo data:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    closeDatabase()
  }
}

// Run the script
populateDemoData()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

export { populateDemoData }

