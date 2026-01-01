/**
 * SQLite Database Module for iManage
 * Handles database initialization, schema, and connection management
 * 
 * Note: This module is optional. If better-sqlite3 is not installed,
 * the app will gracefully fall back to localStorage.
 */

import * as path from 'path'
import * as fs from 'fs'

// Import better-sqlite3
import Database from 'better-sqlite3'

// Removed Electron-specific imports - using project folder for all environments

let db: any = null
let dbPath: string | null = null

/**
 * Get the database path
 * Always uses ./data directory in project folder for portability
 */
function getDatabasePath(): string {
  // Always use project folder for portability
  const dbDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  return path.join(dbDir, 'imanage.db')
}

/**
 * Initialize the database connection
 * Creates database file and tables if they don't exist
 */
export function initDatabase(): any {
  if (db) {
    return db
  }

  try {
    dbPath = getDatabasePath()
    db = new Database(dbPath)

    // Enable foreign keys
    db.pragma('foreign_keys = ON')

    // Create tables
    createTables(db)

    console.log(`Database initialized at: ${dbPath}`)
    return db
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}

/**
 * Get the database instance (initialize if needed)
 */
export function getDatabase(): any {
  if (!db) {
    return initDatabase()
  }
  return db
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * Create all database tables
 */
function createTables(database: any): void {
  // Admin Settings (single row)
  database.exec(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id TEXT PRIMARY KEY,
      companyName TEXT,
      address TEXT,
      vatNumber TEXT,
      logoUrl TEXT,
      sealUrl TEXT,
      signatureUrl TEXT,
      quoteNumberPattern TEXT,
      currency TEXT,
      defaultTerms TEXT,
      showRevenueTrend INTEGER DEFAULT 1,
      showQuickActions INTEGER DEFAULT 1,
      createdAt TEXT,
      updatedAt TEXT
    )
  `)

  // Migration: Add new columns if they don't exist
  try {
    const tableInfo = database.prepare("PRAGMA table_info(admin_settings)").all() as any[]
    const columnNames = tableInfo.map((col: any) => col.name)

    if (!columnNames.includes('showRevenueTrend')) {
      database.exec('ALTER TABLE admin_settings ADD COLUMN showRevenueTrend INTEGER DEFAULT 1')
    }
    if (!columnNames.includes('showQuickActions')) {
      database.exec('ALTER TABLE admin_settings ADD COLUMN showQuickActions INTEGER DEFAULT 1')
    }
  } catch (error: any) {
    // Ignore errors if columns already exist
    console.log('Migration note:', error.message)
  }

  // Customers
  database.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `)

  // Vendors
  database.exec(`
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contactPerson TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      bankDetails TEXT,
      paymentTerms TEXT,
      createdAt TEXT
    )
  `)

  // Employees
  database.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      employeeId TEXT,
      role TEXT,
      paymentType TEXT,
      hourlyRate REAL,
      salary REAL,
      bankDetails TEXT,
      createdAt TEXT
    )
  `)

  // Migrate existing employees table to add paymentType column if it doesn't exist
  try {
    // Check if column exists by trying to query it
    database.prepare('SELECT paymentType FROM employees LIMIT 1').get()
  } catch (error: any) {
    // Column doesn't exist, add it
    try {
      database.exec(`ALTER TABLE employees ADD COLUMN paymentType TEXT`)
      console.log('Added paymentType column to employees table')
    } catch (alterError: any) {
      const errorMsg = alterError?.message || String(alterError)
      if (!errorMsg.includes('duplicate column') && !errorMsg.includes('no such table')) {
        console.warn('Migration warning:', errorMsg)
      }
    }
  }

  // Vehicles - Fleet Management
  database.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      vehicleNumber TEXT NOT NULL UNIQUE,
      vehicleType TEXT,
      make TEXT,
      model TEXT,
      year INTEGER,
      color TEXT,
      purchasePrice REAL,
      purchaseDate TEXT,
      currentValue REAL,
      insuranceCostMonthly REAL,
      financingCostMonthly REAL,
      odometerReading REAL,
      lastServiceDate TEXT,
      nextServiceDue TEXT,
      fuelType TEXT,
      status TEXT DEFAULT 'active',
      registrationExpiry TEXT,
      insuranceExpiry TEXT,
      description TEXT,
      basePrice REAL,
      notes TEXT,
      createdAt TEXT
    )
  `)

  // Migration: Add new vehicle columns if they don't exist (for existing databases)
  try {
    const vehicleTableInfo = database.prepare("PRAGMA table_info(vehicles)").all() as any[]
    const vehicleColumnNames = vehicleTableInfo.map((col: any) => col.name)

    const newVehicleColumns = [
      { name: 'vehicleNumber', type: 'TEXT' },
      { name: 'vehicleType', type: 'TEXT' },
      { name: 'make', type: 'TEXT' },
      { name: 'model', type: 'TEXT' },
      { name: 'year', type: 'INTEGER' },
      { name: 'color', type: 'TEXT' },
      { name: 'purchasePrice', type: 'REAL' },
      { name: 'purchaseDate', type: 'TEXT' },
      { name: 'currentValue', type: 'REAL' },
      { name: 'insuranceCostMonthly', type: 'REAL' },
      { name: 'financingCostMonthly', type: 'REAL' },
      { name: 'odometerReading', type: 'REAL' },
      { name: 'lastServiceDate', type: 'TEXT' },
      { name: 'nextServiceDue', type: 'TEXT' },
      { name: 'fuelType', type: 'TEXT' },
      { name: 'status', type: "TEXT DEFAULT 'active'" },
      { name: 'registrationExpiry', type: 'TEXT' },
      { name: 'insuranceExpiry', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' },
    ]

    for (const col of newVehicleColumns) {
      if (!vehicleColumnNames.includes(col.name)) {
        database.exec(`ALTER TABLE vehicles ADD COLUMN ${col.name} ${col.type}`)
        console.log(`Added ${col.name} column to vehicles table`)
      }
    }

    // Migrate existing 'type' data to 'vehicleNumber' if vehicleNumber is empty
    if (vehicleColumnNames.includes('type') && vehicleColumnNames.includes('vehicleNumber')) {
      database.exec(`
        UPDATE vehicles 
        SET vehicleNumber = type 
        WHERE vehicleNumber IS NULL OR vehicleNumber = ''
      `)
    }
  } catch (error: any) {
    console.log('Vehicle migration note:', error.message)
  }

  // Quotes
  database.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      date TEXT NOT NULL,
      validUntil TEXT,
      currency TEXT,
      customerId TEXT,
      subTotal REAL,
      totalTax REAL,
      total REAL,
      terms TEXT,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      FOREIGN KEY (customerId) REFERENCES customers(id)
    )
  `)

  // Quote Items
  database.exec(`
    CREATE TABLE IF NOT EXISTS quote_items (
      id TEXT PRIMARY KEY,
      quoteId TEXT NOT NULL,
      vehicleTypeId TEXT,
      vehicleTypeLabel TEXT,
      quantity INTEGER,
      unitPrice REAL,
      taxPercent REAL,
      lineTaxAmount REAL,
      lineTotal REAL,
      FOREIGN KEY (quoteId) REFERENCES quotes(id) ON DELETE CASCADE
    )
  `)

  // Purchase Orders
  database.exec(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      date TEXT NOT NULL,
      vendorId TEXT NOT NULL,
      subtotal REAL,
      tax REAL,
      amount REAL,
      currency TEXT,
      status TEXT,
      notes TEXT,
      createdAt TEXT,
      FOREIGN KEY (vendorId) REFERENCES vendors(id)
    )
  `)

  // Purchase Order Items
  database.exec(`
    CREATE TABLE IF NOT EXISTS po_items (
      id TEXT PRIMARY KEY,
      purchaseOrderId TEXT NOT NULL,
      description TEXT,
      quantity INTEGER,
      unitPrice REAL,
      tax REAL,
      total REAL,
      FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(id) ON DELETE CASCADE
    )
  `)

  // Invoices
  database.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      date TEXT NOT NULL,
      dueDate TEXT,
      customerId TEXT,
      vendorId TEXT,
      purchaseOrderId TEXT,
      quoteId TEXT,
      subtotal REAL,
      tax REAL,
      total REAL,
      amountReceived REAL DEFAULT 0,
      status TEXT,
      notes TEXT,
      createdAt TEXT,
      FOREIGN KEY (customerId) REFERENCES customers(id),
      FOREIGN KEY (vendorId) REFERENCES vendors(id),
      FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(id),
      FOREIGN KEY (quoteId) REFERENCES quotes(id)
    )
  `)

  // Invoice Items
  database.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoiceId TEXT NOT NULL,
      description TEXT,
      quantity INTEGER,
      unitPrice REAL,
      tax REAL,
      total REAL,
      FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `)

  // Payslips
  database.exec(`
    CREATE TABLE IF NOT EXISTS payslips (
      id TEXT PRIMARY KEY,
      month TEXT,
      year INTEGER,
      employeeId TEXT,
      baseSalary REAL,
      overtimeHours REAL,
      overtimeRate REAL,
      overtimePay REAL,
      deductions REAL,
      netPay REAL,
      status TEXT,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      FOREIGN KEY (employeeId) REFERENCES employees(id)
    )
  `)

  // Migrate existing payslips table to add new columns if they don't exist
  const newColumns = [
    { name: 'year', type: 'INTEGER' },
    { name: 'overtimeHours', type: 'REAL' },
    { name: 'overtimeRate', type: 'REAL' },
    { name: 'overtimePay', type: 'REAL' },
    { name: 'notes', type: 'TEXT' },
    { name: 'updatedAt', type: 'TEXT' }
  ]

  newColumns.forEach(col => {
    try {
      database.prepare(`SELECT ${col.name} FROM payslips LIMIT 1`).get()
    } catch (error: any) {
      // Column doesn't exist, add it
      try {
        database.exec(`ALTER TABLE payslips ADD COLUMN ${col.name} ${col.type}`)
        console.log(`Added ${col.name} column to payslips table`)
      } catch (alterError: any) {
        const errorMsg = alterError?.message || String(alterError)
        if (!errorMsg.includes('duplicate column') && !errorMsg.includes('no such table')) {
          console.warn(`Migration warning for ${col.name}:`, errorMsg)
        }
      }
    }
  })

  // Expense Categories
  database.exec(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      isCustom INTEGER DEFAULT 0,
      createdAt TEXT
    )
  `)

  // Initialize predefined expense categories if they don't exist
  try {
    const existingCategories = database.prepare('SELECT COUNT(*) as count FROM expense_categories').get() as any
    if (existingCategories.count === 0) {
      const predefinedCategories = [
        { id: 'cat_purchase', name: 'Purchase', isCustom: 0 },
        { id: 'cat_maintenance', name: 'Maintenance', isCustom: 0 },
        { id: 'cat_insurance', name: 'Insurance', isCustom: 0 },
        { id: 'cat_driver_salary', name: 'Driver Salary', isCustom: 0 },
        { id: 'cat_fuel', name: 'Fuel', isCustom: 0 },
        { id: 'cat_registration', name: 'Registration', isCustom: 0 },
        { id: 'cat_other', name: 'Other', isCustom: 0 },
      ]
      const insertCategory = database.prepare(`
        INSERT INTO expense_categories (id, name, isCustom, createdAt)
        VALUES (?, ?, ?, ?)
      `)
      const now = new Date().toISOString()
      for (const cat of predefinedCategories) {
        try {
          insertCategory.run(cat.id, cat.name, cat.isCustom, now)
        } catch (e) {
          // Ignore if already exists
        }
      }
    }
  } catch (error: any) {
    console.log('Expense categories initialization note:', error.message)
  }

  // Vehicle Transactions
  database.exec(`
    CREATE TABLE IF NOT EXISTS vehicle_transactions (
      id TEXT PRIMARY KEY,
      vehicleId TEXT NOT NULL,
      transactionType TEXT NOT NULL CHECK(transactionType IN ('expense', 'revenue')),
      category TEXT,
      amount REAL NOT NULL CHECK(amount > 0),
      date TEXT NOT NULL,
      month TEXT NOT NULL,
      description TEXT,
      employeeId TEXT,
      invoiceId TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE,
      FOREIGN KEY (employeeId) REFERENCES employees(id),
      FOREIGN KEY (invoiceId) REFERENCES invoices(id)
    )
  `)

  // Create indexes for better performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customerId);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(vendorId);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
    CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_vehicle ON vehicle_transactions(vehicleId);
    CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_date ON vehicle_transactions(date);
    CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_month ON vehicle_transactions(month);
    CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_type ON vehicle_transactions(transactionType);
  `)
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return db !== null
}

