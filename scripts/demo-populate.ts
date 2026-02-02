import os from 'os'
import path from 'path'

function resolveUserDataDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(appData, 'iManage')
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'iManage')
  }
  return path.join(os.homedir(), '.config', 'iManage')
}

function ensureDbPath(): void {
  if (process.env.DB_PATH) return
  const userDataDir = resolveUserDataDir()
  process.env.DB_PATH = path.join(userDataDir, 'data', 'imanage.db')
}

function formatDate(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatMonth(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

async function clearDemoData(db: any): Promise<void> {
  const prefix = 'demo_'
  const like = `${prefix}%`
  const run = (sql: string, params: any[] = []) => db.prepare(sql).run(...params)

  db.exec('BEGIN')
  try {
    run('DELETE FROM quote_items WHERE id LIKE ? OR quoteId LIKE ?', [like, like])
    run('DELETE FROM invoice_items WHERE id LIKE ? OR invoiceId LIKE ?', [like, like])
    run('DELETE FROM po_items WHERE id LIKE ? OR purchaseOrderId LIKE ?', [like, like])
    run(
      `DELETE FROM vehicle_transactions 
       WHERE id LIKE ? 
          OR vehicleId LIKE ? 
          OR employeeId LIKE ? 
          OR invoiceId LIKE ? 
          OR purchaseOrderId LIKE ? 
          OR quoteId LIKE ?`,
      [like, like, like, like, like, like]
    )
    run('DELETE FROM payslips WHERE id LIKE ? OR employeeId LIKE ?', [like, like])

    run('DELETE FROM invoices WHERE id LIKE ?', [like])
    run('DELETE FROM quotes WHERE id LIKE ?', [like])
    run('DELETE FROM purchase_orders WHERE id LIKE ?', [like])

    run('DELETE FROM customers WHERE id LIKE ?', [like])
    run('DELETE FROM vendors WHERE id LIKE ?', [like])
    run('DELETE FROM employees WHERE id LIKE ?', [like])
    run('DELETE FROM vehicles WHERE id LIKE ?', [like])
    run('DELETE FROM expense_categories WHERE id LIKE ?', [like])

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

async function populateDemoData(): Promise<void> {
  ensureDbPath()
  const { initDatabase, getDatabase } = await import('../lib/database')
  const {
    customersAdapter,
    vendorsAdapter,
    employeesAdapter,
    payslipsAdapter,
    vehiclesAdapter,
    quotesAdapter,
    purchaseOrdersAdapter,
    invoicesAdapter,
    expenseCategoriesAdapter,
    vehicleTransactionsAdapter,
  } = await import('../api/adapters/sqlite')

  initDatabase()
  const db = getDatabase()
  if (!db) {
    throw new Error('Database is not available. Demo populate aborted.')
  }

  await clearDemoData(db)

  const today = new Date()
  const dateStr = formatDate(today)
  const monthStr = formatMonth(today)

  const customers = [
    {
      id: 'demo_customer_1',
      name: 'Al Noor Trading',
      company: 'Al Noor Trading LLC',
      email: 'contact@alnoor.example',
      phone: '+971-55-111-2222',
      address: 'Dubai, UAE',
    },
    {
      id: 'demo_customer_2',
      name: 'Gulf Horizon',
      company: 'Gulf Horizon Transport',
      email: 'info@gulfhorizon.example',
      phone: '+971-55-333-4444',
      address: 'Abu Dhabi, UAE',
    },
    {
      id: 'demo_customer_3',
      name: 'Aisha Khan',
      company: '',
      email: 'aisha.khan@example',
      phone: '+971-55-555-6666',
      address: 'Sharjah, UAE',
    },
  ]

  const vendors = [
    {
      id: 'demo_vendor_1',
      name: 'Desert Parts Co.',
      contactPerson: 'Rashid Ali',
      email: 'sales@desertparts.example',
      phone: '+971-55-777-8888',
      address: 'Industrial Area, Dubai',
      bankDetails: 'Bank XYZ, IBAN AE00 0000 0000 0000 0000 000',
      paymentTerms: 'Net 15',
    },
    {
      id: 'demo_vendor_2',
      name: 'City Fuel Services',
      contactPerson: 'Maha Noor',
      email: 'support@cityfuel.example',
      phone: '+971-55-999-0000',
      address: 'Al Quoz, Dubai',
      bankDetails: 'Bank ABC, IBAN AE11 1111 1111 1111 1111 111',
      paymentTerms: 'Net 30',
    },
  ]

  const employees = [
    {
      id: 'demo_employee_1',
      name: 'Omar Saeed',
      employeeId: 'EMP-001',
      role: 'Driver',
      paymentType: 'salary',
      salary: 5500,
      bankDetails: 'Bank DEF, IBAN AE22 2222 2222 2222 2222 222',
    },
    {
      id: 'demo_employee_2',
      name: 'Sara Ahmed',
      employeeId: 'EMP-002',
      role: 'Coordinator',
      paymentType: 'hourly',
      hourlyRate: 75,
      bankDetails: 'Bank GHI, IBAN AE33 3333 3333 3333 3333 333',
    },
  ]

  const vehicles = [
    {
      id: 'demo_vehicle_1',
      vehicleNumber: 'DEMO-001',
      vehicleType: 'Sedan',
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      color: 'White',
      basePrice: 150,
      status: 'active',
    },
    {
      id: 'demo_vehicle_2',
      vehicleNumber: 'DEMO-002',
      vehicleType: 'SUV',
      make: 'Nissan',
      model: 'X-Trail',
      year: 2022,
      color: 'Black',
      basePrice: 220,
      status: 'active',
    },
    {
      id: 'demo_vehicle_3',
      vehicleNumber: 'DEMO-003',
      vehicleType: 'Van',
      make: 'Ford',
      model: 'Transit',
      year: 2021,
      color: 'Silver',
      basePrice: 300,
      status: 'maintenance',
    },
  ]

  const expenseCategories = [
    { id: 'demo_expense_1', name: 'Fuel', isCustom: true },
    { id: 'demo_expense_2', name: 'Maintenance', isCustom: true },
  ]

  customers.forEach((c) => customersAdapter.create(c))
  vendors.forEach((v) => vendorsAdapter.create(v))
  employees.forEach((e) => employeesAdapter.create(e))
  vehicles.forEach((v) => vehiclesAdapter.create(v))
  expenseCategories.forEach((c) => expenseCategoriesAdapter.create(c))

  payslipsAdapter.create({
    id: 'demo_payslip_1',
    employeeId: employees[0].id,
    month: monthStr,
    year: today.getFullYear(),
    baseSalary: 5500,
    deductions: 250,
    netPay: 5250,
    status: 'processed',
    notes: 'Demo payslip for driver',
  })

  payslipsAdapter.create({
    id: 'demo_payslip_2',
    employeeId: employees[1].id,
    month: monthStr,
    year: today.getFullYear(),
    baseSalary: 0,
    overtimeHours: 15,
    overtimeRate: 75,
    overtimePay: 1125,
    deductions: 0,
    netPay: 1125,
    status: 'processed',
    notes: 'Demo payslip for coordinator',
  })

  const quoteItems = [
    {
      id: 'demo_quote_item_1',
      vehicleTypeId: vehicles[0].id,
      vehicleTypeLabel: `${vehicles[0].make} ${vehicles[0].model}`,
      vehicleNumber: vehicles[0].vehicleNumber,
      description: 'Monthly rental',
      rentalBasis: 'monthly',
      serialNumber: 1,
      quantity: 1,
      unitPrice: 4500,
      taxPercent: 5,
    },
    {
      id: 'demo_quote_item_2',
      vehicleTypeId: vehicles[1].id,
      vehicleTypeLabel: `${vehicles[1].make} ${vehicles[1].model}`,
      vehicleNumber: vehicles[1].vehicleNumber,
      description: 'Weekly rental',
      rentalBasis: 'hourly',
      serialNumber: 2,
      quantity: 24,
      unitPrice: 90,
      taxPercent: 5,
    },
  ].map((item) => {
    const gross = item.quantity * item.unitPrice
    const tax = (gross * item.taxPercent) / 100
    const total = gross + tax
    return {
      ...item,
      grossAmount: gross,
      lineTaxAmount: tax,
      lineTotal: total,
    }
  })

  const quoteSubTotal = quoteItems.reduce((sum, i) => sum + (i.grossAmount || 0), 0)
  const quoteTax = quoteItems.reduce((sum, i) => sum + (i.lineTaxAmount || 0), 0)
  const quoteTotal = quoteItems.reduce((sum, i) => sum + (i.lineTotal || 0), 0)

  const quote = quotesAdapter.create({
    id: 'demo_quote_1',
    number: 'Quote-DEMO-001',
    date: dateStr,
    validUntil: dateStr,
    currency: 'AED',
    customerId: customers[0].id,
    items: quoteItems,
    subTotal: quoteSubTotal,
    totalTax: quoteTax,
    total: quoteTotal,
    terms: 'Demo terms for quotation',
    notes: 'Demo quote notes',
  })

  const poItems = [
    {
      id: 'demo_po_item_1',
      description: 'Spare parts batch',
      quantity: 10,
      unitPrice: 120,
      taxPercent: 5,
      serialNumber: 1,
    },
  ].map((item) => {
    const gross = item.quantity * item.unitPrice
    const tax = (gross * (item.taxPercent || 0)) / 100
    const total = gross + tax
    return {
      ...item,
      grossAmount: gross,
      lineTaxAmount: tax,
      lineTotal: total,
      total,
      tax,
    }
  })

  const poSubTotal = poItems.reduce((sum, i) => sum + (i.grossAmount || 0), 0)
  const poTax = poItems.reduce((sum, i) => sum + (i.lineTaxAmount || 0), 0)
  const poTotal = poItems.reduce((sum, i) => sum + (i.lineTotal || 0), 0)

  const purchaseOrder = purchaseOrdersAdapter.create({
    id: 'demo_po_1',
    number: 'PO-DEMO-001',
    date: dateStr,
    vendorId: vendors[0].id,
    items: poItems,
    subtotal: poSubTotal,
    tax: poTax,
    amount: poTotal,
    currency: 'AED',
    status: 'sent',
    terms: 'Demo PO terms',
    notes: 'Demo PO notes',
  })

  const invoiceItems = quoteItems.map((item, idx) => ({
    id: `demo_invoice_item_${idx + 1}`,
    serialNumber: item.serialNumber,
    vehicleTypeId: item.vehicleTypeId,
    vehicleTypeLabel: item.vehicleTypeLabel,
    vehicleNumber: item.vehicleNumber,
    description: item.description,
    rentalBasis: item.rentalBasis,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxPercent: item.taxPercent,
    grossAmount: item.grossAmount,
    lineTaxAmount: item.lineTaxAmount,
    lineTotal: item.lineTotal,
    total: item.lineTotal,
    amountReceived: 0,
  }))

  invoicesAdapter.create({
    id: 'demo_invoice_1',
    number: 'INV-DEMO-001',
    date: dateStr,
    dueDate: dateStr,
    customerId: customers[0].id,
    purchaseOrderId: purchaseOrder.id,
    quoteId: quote.id,
    items: invoiceItems,
    subtotal: quoteSubTotal,
    tax: quoteTax,
    total: quoteTotal,
    amountReceived: 0,
    status: 'invoice_sent',
    notes: 'Demo invoice notes',
    terms: 'Demo invoice terms',
  })

  const lastMonth = new Date(today)
  lastMonth.setMonth(lastMonth.getMonth() - 1)

  vehicleTransactionsAdapter.create({
    id: 'demo_tx_1',
    vehicleId: vehicles[0].id,
    transactionType: 'revenue',
    amount: quoteTotal,
    date: formatDate(lastMonth),
    description: 'Demo rental income',
    invoiceId: 'demo_invoice_1',
    quoteId: quote.id,
  })

  vehicleTransactionsAdapter.create({
    id: 'demo_tx_2',
    vehicleId: vehicles[0].id,
    transactionType: 'expense',
    category: 'Fuel',
    amount: 350,
    date: formatDate(today),
    description: 'Demo fuel expense',
    employeeId: employees[0].id,
    purchaseOrderId: purchaseOrder.id,
  })
}

populateDemoData()
  .then(() => {
    console.log('Demo data populated successfully.')
  })
  .catch((error) => {
    console.error('Demo data populate failed:', error)
    process.exit(1)
  })
