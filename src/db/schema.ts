/**
 * Drizzle ORM Schema
 * Single source of truth for database structure
 */

import { sqliteTable, text, integer, real, sql } from 'drizzle-orm/sqlite-core'

// ==================== ADMIN SETTINGS ====================
export const adminSettings = sqliteTable('admin_settings', {
  id: text('id').primaryKey(),
  companyName: text('companyName'),
  address: text('address'),
  vatNumber: text('vatNumber'),
  logoUrl: text('logoUrl'),
  sealUrl: text('sealUrl'),
  signatureUrl: text('signatureUrl'),
  quoteNumberPattern: text('quoteNumberPattern'),
  currency: text('currency'),
  defaultTerms: text('defaultTerms'),
  // Doc-type specific defaults (fallback to defaultTerms for backward compatibility)
  defaultInvoiceTerms: text('defaultInvoiceTerms'),
  defaultPurchaseOrderTerms: text('defaultPurchaseOrderTerms'),
  showRevenueTrend: integer('showRevenueTrend', { mode: 'boolean' }).default(true),
  showQuickActions: integer('showQuickActions', { mode: 'boolean' }).default(true),
  showReports: integer('showReports', { mode: 'boolean' }),
  showVehicleDashboard: integer('showVehicleFinances', { mode: 'boolean' }), // Maps to showVehicleFinances column for backward compatibility
  showQuotationsInvoicesCard: integer('showQuotationsInvoicesCard', { mode: 'boolean' }),
  showQuotationsTwoPane: integer('showQuotationsTwoPane', { mode: 'boolean' }).default(true),
  showPurchaseOrdersTwoPane: integer('showPurchaseOrdersTwoPane', { mode: 'boolean' }).default(true),
  showInvoicesTwoPane: integer('showInvoicesTwoPane', { mode: 'boolean' }).default(true),
  showEmployeeSalariesCard: integer('showEmployeeSalariesCard', { mode: 'boolean' }),
  showVehicleRevenueExpensesCard: integer('showVehicleRevenueExpensesCard', { mode: 'boolean' }),
  showActivityThisMonth: integer('showActivityThisMonth', { mode: 'boolean' }),
  showFinancialHealth: integer('showFinancialHealth', { mode: 'boolean' }),
  showBusinessOverview: integer('showBusinessOverview', { mode: 'boolean' }),
  showTopCustomers: integer('showTopCustomers', { mode: 'boolean' }),
  showActivitySummary: integer('showActivitySummary', { mode: 'boolean' }),
  footerAddressEnglish: text('footerAddressEnglish'),
  footerAddressArabic: text('footerAddressArabic'),
  footerContactEnglish: text('footerContactEnglish'),
  footerContactArabic: text('footerContactArabic'),
  quoteStartingNumber: integer('quoteStartingNumber').default(1),
  invoiceStartingNumber: integer('invoiceStartingNumber').default(1),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
})

// ==================== CUSTOMERS ====================
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  company: text('company'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
})

// ==================== VENDORS ====================
export const vendors = sqliteTable('vendors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactPerson: text('contactPerson'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  bankDetails: text('bankDetails'),
  paymentTerms: text('paymentTerms'),
  createdAt: text('createdAt'),
})

// ==================== EMPLOYEES ====================
export const employees = sqliteTable('employees', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  employeeId: text('employeeId'),
  role: text('role'),
  paymentType: text('paymentType'), // 'hourly' | 'monthly'
  hourlyRate: real('hourlyRate'),
  salary: real('salary'),
  overtimeRate: real('overtimeRate'),
  bankDetails: text('bankDetails'),
  createdAt: text('createdAt'),
})

// ==================== VEHICLES ====================
export const vehicles = sqliteTable('vehicles', {
  id: text('id').primaryKey(),
  vehicleNumber: text('vehicleNumber').notNull().unique(),
  vehicleType: text('vehicleType'),
  make: text('make'),
  model: text('model'),
  year: integer('year'),
  color: text('color'),
  purchasePrice: real('purchasePrice'),
  purchaseDate: text('purchaseDate'),
  currentValue: real('currentValue'),
  insuranceCostMonthly: real('insuranceCostMonthly'),
  financingCostMonthly: real('financingCostMonthly'),
  odometerReading: real('odometerReading'),
  lastServiceDate: text('lastServiceDate'),
  nextServiceDue: text('nextServiceDue'),
  fuelType: text('fuelType'), // 'petrol' | 'diesel' | 'electric' | 'hybrid'
  status: text('status').default('active'), // 'active' | 'maintenance' | 'sold' | 'retired'
  registrationExpiry: text('registrationExpiry'),
  insuranceExpiry: text('insuranceExpiry'),
  description: text('description'),
  basePrice: real('basePrice'),
  notes: text('notes'),
  createdAt: text('createdAt'),
  // Legacy support
  type: text('type'),
})

// ==================== QUOTES ====================
export const quotes = sqliteTable('quotes', {
  id: text('id').primaryKey(),
  number: text('number').notNull(),
  date: text('date').notNull(),
  validUntil: text('validUntil'),
  currency: text('currency'),
  customerId: text('customerId').references(() => customers.id),
  subTotal: real('subTotal'),
  totalTax: real('totalTax'),
  total: real('total'),
  terms: text('terms'),
  notes: text('notes'),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
})

// ==================== QUOTE ITEMS ====================
export const quoteItems = sqliteTable('quote_items', {
  id: text('id').primaryKey(),
  quoteId: text('quoteId').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
  vehicleTypeId: text('vehicleTypeId'),
  vehicleTypeLabel: text('vehicleTypeLabel'),
  vehicleNumber: text('vehicleNumber'),
  description: text('description'),
  rentalBasis: text('rentalBasis'), // 'hourly' | 'monthly'
  serialNumber: integer('serialNumber'),
  quantity: integer('quantity'),
  unitPrice: real('unitPrice'),
  taxPercent: real('taxPercent'),
  grossAmount: real('grossAmount'),
  lineTaxAmount: real('lineTaxAmount'),
  lineTotal: real('lineTotal'),
})

// ==================== PURCHASE ORDERS ====================
export const purchaseOrders = sqliteTable('purchase_orders', {
  id: text('id').primaryKey(),
  number: text('number').notNull(),
  date: text('date').notNull(),
  vendorId: text('vendorId').notNull().references(() => vendors.id),
  subtotal: real('subtotal'),
  tax: real('tax'),
  amount: real('amount'),
  currency: text('currency'),
  status: text('status'), // 'draft' | 'sent' | 'accepted'
  terms: text('terms'),
  notes: text('notes'),
  createdAt: text('createdAt'),
})

// ==================== PURCHASE ORDER ITEMS ====================
export const poItems = sqliteTable('po_items', {
  id: text('id').primaryKey(),
  purchaseOrderId: text('purchaseOrderId').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  serialNumber: integer('serialNumber'),
  vehicleTypeId: text('vehicleTypeId'),
  vehicleTypeLabel: text('vehicleTypeLabel'),
  vehicleNumber: text('vehicleNumber'),
  description: text('description'),
  rentalBasis: text('rentalBasis'), // 'hourly' | 'monthly'
  quantity: integer('quantity'),
  unitPrice: real('unitPrice'),
  taxPercent: real('taxPercent'),
  tax: real('tax'), // Legacy support
  grossAmount: real('grossAmount'),
  lineTaxAmount: real('lineTaxAmount'),
  lineTotal: real('lineTotal'),
  total: real('total'), // Legacy support
})

// ==================== INVOICES ====================
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  number: text('number').notNull(),
  date: text('date').notNull(),
  dueDate: text('dueDate'),
  customerId: text('customerId').references(() => customers.id),
  vendorId: text('vendorId').references(() => vendors.id),
  purchaseOrderId: text('purchaseOrderId').references(() => purchaseOrders.id),
  quoteId: text('quoteId').references(() => quotes.id),
  subtotal: real('subtotal'),
  tax: real('tax'),
  total: real('total'),
  amountReceived: real('amountReceived').default(0),
  status: text('status'), // 'draft' | 'invoice_sent' | 'payment_received'
  notes: text('notes'),
  terms: text('terms'),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
})

// ==================== INVOICE ITEMS ====================
export const invoiceItems = sqliteTable('invoice_items', {
  id: text('id').primaryKey(),
  invoiceId: text('invoiceId').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  serialNumber: integer('serialNumber'),
  vehicleTypeId: text('vehicleTypeId'),
  vehicleTypeLabel: text('vehicleTypeLabel'),
  vehicleNumber: text('vehicleNumber'),
  description: text('description'),
  rentalBasis: text('rentalBasis'), // 'hourly' | 'monthly'
  quantity: integer('quantity'),
  unitPrice: real('unitPrice'),
  taxPercent: real('taxPercent'),
  tax: real('tax'), // Legacy support
  grossAmount: real('grossAmount'),
  lineTaxAmount: real('lineTaxAmount'),
  lineTotal: real('lineTotal'),
  total: real('total'), // Legacy support
  amountReceived: real('amountReceived'),
})

// ==================== PAYSLIPS ====================
export const payslips = sqliteTable('payslips', {
  id: text('id').primaryKey(),
  month: text('month'), // YYYY-MM format
  year: integer('year'),
  employeeId: text('employeeId').references(() => employees.id),
  baseSalary: real('baseSalary'),
  overtimeHours: real('overtimeHours'),
  overtimeRate: real('overtimeRate'),
  overtimePay: real('overtimePay'),
  deductions: real('deductions'),
  deductionRemarks: text('deductionRemarks'),
  netPay: real('netPay'),
  status: text('status'), // 'draft' | 'processed' | 'paid'
  notes: text('notes'),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
})

// ==================== EXPENSE CATEGORIES ====================
export const expenseCategories = sqliteTable('expense_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  isCustom: integer('isCustom', { mode: 'boolean' }).default(false),
  createdAt: text('createdAt'),
})

// ==================== VEHICLE TRANSACTIONS ====================
export const vehicleTransactions = sqliteTable('vehicle_transactions', {
  id: text('id').primaryKey(),
  vehicleId: text('vehicleId').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  transactionType: text('transactionType').notNull(), // 'expense' | 'revenue'
  category: text('category'),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  month: text('month').notNull(), // YYYY-MM format
  description: text('description'),
  employeeId: text('employeeId').references(() => employees.id),
  invoiceId: text('invoiceId').references(() => invoices.id),
  purchaseOrderId: text('purchaseOrderId').references(() => purchaseOrders.id),
  quoteId: text('quoteId').references(() => quotes.id),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
})
