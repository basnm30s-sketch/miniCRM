"use strict";
/**
 * Drizzle ORM Schema
 * Single source of truth for database structure
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehicleTransactions = exports.expenseCategories = exports.payslips = exports.invoiceItems = exports.invoices = exports.poItems = exports.purchaseOrders = exports.quoteItems = exports.quotes = exports.vehicles = exports.employees = exports.vendors = exports.customers = exports.adminSettings = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
// ==================== ADMIN SETTINGS ====================
exports.adminSettings = (0, sqlite_core_1.sqliteTable)('admin_settings', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    companyName: (0, sqlite_core_1.text)('companyName'),
    address: (0, sqlite_core_1.text)('address'),
    vatNumber: (0, sqlite_core_1.text)('vatNumber'),
    logoUrl: (0, sqlite_core_1.text)('logoUrl'),
    sealUrl: (0, sqlite_core_1.text)('sealUrl'),
    signatureUrl: (0, sqlite_core_1.text)('signatureUrl'),
    quoteNumberPattern: (0, sqlite_core_1.text)('quoteNumberPattern'),
    currency: (0, sqlite_core_1.text)('currency'),
    defaultTerms: (0, sqlite_core_1.text)('defaultTerms'),
    showRevenueTrend: (0, sqlite_core_1.integer)('showRevenueTrend', { mode: 'boolean' }).default(true),
    showQuickActions: (0, sqlite_core_1.integer)('showQuickActions', { mode: 'boolean' }).default(true),
    showReports: (0, sqlite_core_1.integer)('showReports', { mode: 'boolean' }),
    showVehicleDashboard: (0, sqlite_core_1.integer)('showVehicleFinances', { mode: 'boolean' }), // Maps to showVehicleFinances column for backward compatibility
    showQuotationsInvoicesCard: (0, sqlite_core_1.integer)('showQuotationsInvoicesCard', { mode: 'boolean' }),
    showQuotationsTwoPane: (0, sqlite_core_1.integer)('showQuotationsTwoPane', { mode: 'boolean' }).default(true),
    showPurchaseOrdersTwoPane: (0, sqlite_core_1.integer)('showPurchaseOrdersTwoPane', { mode: 'boolean' }).default(true),
    showInvoicesTwoPane: (0, sqlite_core_1.integer)('showInvoicesTwoPane', { mode: 'boolean' }).default(true),
    showEmployeeSalariesCard: (0, sqlite_core_1.integer)('showEmployeeSalariesCard', { mode: 'boolean' }),
    showVehicleRevenueExpensesCard: (0, sqlite_core_1.integer)('showVehicleRevenueExpensesCard', { mode: 'boolean' }),
    showActivityThisMonth: (0, sqlite_core_1.integer)('showActivityThisMonth', { mode: 'boolean' }),
    showFinancialHealth: (0, sqlite_core_1.integer)('showFinancialHealth', { mode: 'boolean' }),
    showBusinessOverview: (0, sqlite_core_1.integer)('showBusinessOverview', { mode: 'boolean' }),
    showTopCustomers: (0, sqlite_core_1.integer)('showTopCustomers', { mode: 'boolean' }),
    showActivitySummary: (0, sqlite_core_1.integer)('showActivitySummary', { mode: 'boolean' }),
    footerAddressEnglish: (0, sqlite_core_1.text)('footerAddressEnglish'),
    footerAddressArabic: (0, sqlite_core_1.text)('footerAddressArabic'),
    footerContactEnglish: (0, sqlite_core_1.text)('footerContactEnglish'),
    footerContactArabic: (0, sqlite_core_1.text)('footerContactArabic'),
    quoteStartingNumber: (0, sqlite_core_1.integer)('quoteStartingNumber').default(1),
    invoiceStartingNumber: (0, sqlite_core_1.integer)('invoiceStartingNumber').default(1),
    createdAt: (0, sqlite_core_1.text)('createdAt'),
    updatedAt: (0, sqlite_core_1.text)('updatedAt'),
});
// ==================== CUSTOMERS ====================
exports.customers = (0, sqlite_core_1.sqliteTable)('customers', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    name: (0, sqlite_core_1.text)('name').notNull(),
    company: (0, sqlite_core_1.text)('company'),
    email: (0, sqlite_core_1.text)('email'),
    phone: (0, sqlite_core_1.text)('phone'),
    address: (0, sqlite_core_1.text)('address'),
    createdAt: (0, sqlite_core_1.text)('createdAt'),
    updatedAt: (0, sqlite_core_1.text)('updatedAt'),
});
// ==================== VENDORS ====================
exports.vendors = (0, sqlite_core_1.sqliteTable)('vendors', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    name: (0, sqlite_core_1.text)('name').notNull(),
    contactPerson: (0, sqlite_core_1.text)('contactPerson'),
    email: (0, sqlite_core_1.text)('email'),
    phone: (0, sqlite_core_1.text)('phone'),
    address: (0, sqlite_core_1.text)('address'),
    bankDetails: (0, sqlite_core_1.text)('bankDetails'),
    paymentTerms: (0, sqlite_core_1.text)('paymentTerms'),
    createdAt: (0, sqlite_core_1.text)('createdAt'),
});
// ==================== EMPLOYEES ====================
exports.employees = (0, sqlite_core_1.sqliteTable)('employees', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    name: (0, sqlite_core_1.text)('name').notNull(),
    employeeId: (0, sqlite_core_1.text)('employeeId'),
    role: (0, sqlite_core_1.text)('role'),
    paymentType: (0, sqlite_core_1.text)('paymentType'), // 'hourly' | 'monthly'
    hourlyRate: (0, sqlite_core_1.real)('hourlyRate'),
    salary: (0, sqlite_core_1.real)('salary'),
    overtimeRate: (0, sqlite_core_1.real)('overtimeRate'),
    bankDetails: (0, sqlite_core_1.text)('bankDetails'),
    createdAt: (0, sqlite_core_1.text)('createdAt'),
});
// ==================== VEHICLES ====================
exports.vehicles = (0, sqlite_core_1.sqliteTable)('vehicles', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    vehicleNumber: (0, sqlite_core_1.text)('vehicleNumber').notNull().unique(),
    vehicleType: (0, sqlite_core_1.text)('vehicleType'),
    make: (0, sqlite_core_1.text)('make'),
    model: (0, sqlite_core_1.text)('model'),
    year: (0, sqlite_core_1.integer)('year'),
    color: (0, sqlite_core_1.text)('color'),
    purchasePrice: (0, sqlite_core_1.real)('purchasePrice'),
    purchaseDate: (0, sqlite_core_1.text)('purchaseDate'),
    currentValue: (0, sqlite_core_1.real)('currentValue'),
    insuranceCostMonthly: (0, sqlite_core_1.real)('insuranceCostMonthly'),
    financingCostMonthly: (0, sqlite_core_1.real)('financingCostMonthly'),
    odometerReading: (0, sqlite_core_1.real)('odometerReading'),
    lastServiceDate: (0, sqlite_core_1.text)('lastServiceDate'),
    nextServiceDue: (0, sqlite_core_1.text)('nextServiceDue'),
    fuelType: (0, sqlite_core_1.text)('fuelType'), // 'petrol' | 'diesel' | 'electric' | 'hybrid'
    status: (0, sqlite_core_1.text)('status').default('active'), // 'active' | 'maintenance' | 'sold' | 'retired'
    registrationExpiry: (0, sqlite_core_1.text)('registrationExpiry'),
    insuranceExpiry: (0, sqlite_core_1.text)('insuranceExpiry'),
    description: (0, sqlite_core_1.text)('description'),
    basePrice: (0, sqlite_core_1.real)('basePrice'),
    notes: (0, sqlite_core_1.text)('notes'),
    createdAt: (0, sqlite_core_1.text)('createdAt'),
    // Legacy support
    type: (0, sqlite_core_1.text)('type'),
});
// ==================== QUOTES ====================
exports.quotes = (0, sqlite_core_1.sqliteTable)('quotes', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    number: (0, sqlite_core_1.text)('number').notNull(),
    date: (0, sqlite_core_1.text)('date').notNull(),
    validUntil: (0, sqlite_core_1.text)('validUntil'),
    currency: (0, sqlite_core_1.text)('currency'),
    customerId: (0, sqlite_core_1.text)('customerId').references(() => exports.customers.id),
    subTotal: (0, sqlite_core_1.real)('subTotal'),
    totalTax: (0, sqlite_core_1.real)('totalTax'),
    total: (0, sqlite_core_1.real)('total'),
    terms: (0, sqlite_core_1.text)('terms'),
    notes: (0, sqlite_core_1.text)('notes'),
    createdAt: (0, sqlite_core_1.text)('createdAt'),
    updatedAt: (0, sqlite_core_1.text)('updatedAt'),
});
// ==================== QUOTE ITEMS ====================
exports.quoteItems = (0, sqlite_core_1.sqliteTable)('quote_items', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    quoteId: (0, sqlite_core_1.text)('quoteId').notNull().references(() => exports.quotes.id, { onDelete: 'cascade' }),
    vehicleTypeId: (0, sqlite_core_1.text)('vehicleTypeId'),
    vehicleTypeLabel: (0, sqlite_core_1.text)('vehicleTypeLabel'),
    vehicleNumber: (0, sqlite_core_1.text)('vehicleNumber'),
    description: (0, sqlite_core_1.text)('description'),
    rentalBasis: (0, sqlite_core_1.text)('rentalBasis'), // 'hourly' | 'monthly'
    serialNumber: (0, sqlite_core_1.integer)('serialNumber'),
    quantity: (0, sqlite_core_1.integer)('quantity'),
    unitPrice: (0, sqlite_core_1.real)('unitPrice'),
    taxPercent: (0, sqlite_core_1.real)('taxPercent'),
    grossAmount: (0, sqlite_core_1.real)('grossAmount'),
    lineTaxAmount: (0, sqlite_core_1.real)('lineTaxAmount'),
    lineTotal: (0, sqlite_core_1.real)('lineTotal'),
});
// ==================== PURCHASE ORDERS ====================
exports.purchaseOrders = (0, sqlite_core_1.sqliteTable)('purchase_orders', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    number: (0, sqlite_core_1.text)('number').notNull(),
    date: (0, sqlite_core_1.text)('date').notNull(),
    vendorId: (0, sqlite_core_1.text)('vendorId').notNull().references(() => exports.vendors.id),
    subtotal: (0, sqlite_core_1.real)('subtotal'),
    tax: (0, sqlite_core_1.real)('tax'),
    amount: (0, sqlite_core_1.real)('amount'),
    currency: (0, sqlite_core_1.text)('currency'),
    status: (0, sqlite_core_1.text)('status'), // 'draft' | 'sent' | 'accepted'
    notes: (0, sqlite_core_1.text)('notes'),
    createdAt: (0, sqlite_core_1.text)('createdAt'),
});
// ==================== PURCHASE ORDER ITEMS ====================
exports.poItems = (0, sqlite_core_1.sqliteTable)('po_items', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    purchaseOrderId: (0, sqlite_core_1.text)('purchaseOrderId').notNull().references(() => exports.purchaseOrders.id, { onDelete: 'cascade' }),
    serialNumber: (0, sqlite_core_1.integer)('serialNumber'),
    vehicleTypeId: (0, sqlite_core_1.text)('vehicleTypeId'),
    vehicleTypeLabel: (0, sqlite_core_1.text)('vehicleTypeLabel'),
    vehicleNumber: (0, sqlite_core_1.text)('vehicleNumber'),
    description: (0, sqlite_core_1.text)('description'),
    rentalBasis: (0, sqlite_core_1.text)('rentalBasis'), // 'hourly' | 'monthly'
    quantity: (0, sqlite_core_1.integer)('quantity'),
    unitPrice: (0, sqlite_core_1.real)('unitPrice'),
    taxPercent: (0, sqlite_core_1.real)('taxPercent'),
    tax: (0, sqlite_core_1.real)('tax'), // Legacy support
    grossAmount: (0, sqlite_core_1.real)('grossAmount'),
    lineTaxAmount: (0, sqlite_core_1.real)('lineTaxAmount'),
    lineTotal: (0, sqlite_core_1.real)('lineTotal'),
    total: (0, sqlite_core_1.real)('total'), // Legacy support
});
// ==================== INVOICES ====================
exports.invoices = (0, sqlite_core_1.sqliteTable)('invoices', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    number: (0, sqlite_core_1.text)('number').notNull(),
    date: (0, sqlite_core_1.text)('date').notNull(),
    dueDate: (0, sqlite_core_1.text)('dueDate'),
    customerId: (0, sqlite_core_1.text)('customerId').references(() => exports.customers.id),
    vendorId: (0, sqlite_core_1.text)('vendorId').references(() => exports.vendors.id),
    purchaseOrderId: (0, sqlite_core_1.text)('purchaseOrderId').references(() => exports.purchaseOrders.id),
    quoteId: (0, sqlite_core_1.text)('quoteId').references(() => exports.quotes.id),
    subtotal: (0, sqlite_core_1.real)('subtotal'),
    tax: (0, sqlite_core_1.real)('tax'),
    total: (0, sqlite_core_1.real)('total'),
    amountReceived: (0, sqlite_core_1.real)('amountReceived').default(0),
    status: (0, sqlite_core_1.text)('status'), // 'draft' | 'invoice_sent' | 'payment_received'
    notes: (0, sqlite_core_1.text)('notes'),
    terms: (0, sqlite_core_1.text)('terms'),
    createdAt: (0, sqlite_core_1.text)('createdAt'),
    updatedAt: (0, sqlite_core_1.text)('updatedAt'),
});
// ==================== INVOICE ITEMS ====================
exports.invoiceItems = (0, sqlite_core_1.sqliteTable)('invoice_items', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    invoiceId: (0, sqlite_core_1.text)('invoiceId').notNull().references(() => exports.invoices.id, { onDelete: 'cascade' }),
    serialNumber: (0, sqlite_core_1.integer)('serialNumber'),
    vehicleTypeId: (0, sqlite_core_1.text)('vehicleTypeId'),
    vehicleTypeLabel: (0, sqlite_core_1.text)('vehicleTypeLabel'),
    vehicleNumber: (0, sqlite_core_1.text)('vehicleNumber'),
    description: (0, sqlite_core_1.text)('description'),
    rentalBasis: (0, sqlite_core_1.text)('rentalBasis'), // 'hourly' | 'monthly'
    quantity: (0, sqlite_core_1.integer)('quantity'),
    unitPrice: (0, sqlite_core_1.real)('unitPrice'),
    taxPercent: (0, sqlite_core_1.real)('taxPercent'),
    tax: (0, sqlite_core_1.real)('tax'), // Legacy support
    grossAmount: (0, sqlite_core_1.real)('grossAmount'),
    lineTaxAmount: (0, sqlite_core_1.real)('lineTaxAmount'),
    lineTotal: (0, sqlite_core_1.real)('lineTotal'),
    total: (0, sqlite_core_1.real)('total'), // Legacy support
    amountReceived: (0, sqlite_core_1.real)('amountReceived'),
});
// ==================== PAYSLIPS ====================
exports.payslips = (0, sqlite_core_1.sqliteTable)('payslips', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    month: (0, sqlite_core_1.text)('month'), // YYYY-MM format
    year: (0, sqlite_core_1.integer)('year'),
    employeeId: (0, sqlite_core_1.text)('employeeId').references(() => exports.employees.id),
    baseSalary: (0, sqlite_core_1.real)('baseSalary'),
    overtimeHours: (0, sqlite_core_1.real)('overtimeHours'),
    overtimeRate: (0, sqlite_core_1.real)('overtimeRate'),
    overtimePay: (0, sqlite_core_1.real)('overtimePay'),
    deductions: (0, sqlite_core_1.real)('deductions'),
    deductionRemarks: (0, sqlite_core_1.text)('deductionRemarks'),
    netPay: (0, sqlite_core_1.real)('netPay'),
    status: (0, sqlite_core_1.text)('status'), // 'draft' | 'processed' | 'paid'
    notes: (0, sqlite_core_1.text)('notes'),
    createdAt: (0, sqlite_core_1.text)('createdAt'),
    updatedAt: (0, sqlite_core_1.text)('updatedAt'),
});
// ==================== EXPENSE CATEGORIES ====================
exports.expenseCategories = (0, sqlite_core_1.sqliteTable)('expense_categories', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    name: (0, sqlite_core_1.text)('name').notNull().unique(),
    isCustom: (0, sqlite_core_1.integer)('isCustom', { mode: 'boolean' }).default(false),
    createdAt: (0, sqlite_core_1.text)('createdAt'),
});
// ==================== VEHICLE TRANSACTIONS ====================
exports.vehicleTransactions = (0, sqlite_core_1.sqliteTable)('vehicle_transactions', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    vehicleId: (0, sqlite_core_1.text)('vehicleId').notNull().references(() => exports.vehicles.id, { onDelete: 'cascade' }),
    transactionType: (0, sqlite_core_1.text)('transactionType').notNull(), // 'expense' | 'revenue'
    category: (0, sqlite_core_1.text)('category'),
    amount: (0, sqlite_core_1.real)('amount').notNull(),
    date: (0, sqlite_core_1.text)('date').notNull(),
    month: (0, sqlite_core_1.text)('month').notNull(), // YYYY-MM format
    description: (0, sqlite_core_1.text)('description'),
    employeeId: (0, sqlite_core_1.text)('employeeId').references(() => exports.employees.id),
    invoiceId: (0, sqlite_core_1.text)('invoiceId').references(() => exports.invoices.id),
    purchaseOrderId: (0, sqlite_core_1.text)('purchaseOrderId').references(() => exports.purchaseOrders.id),
    quoteId: (0, sqlite_core_1.text)('quoteId').references(() => exports.quotes.id),
    createdAt: (0, sqlite_core_1.text)('createdAt'),
    updatedAt: (0, sqlite_core_1.text)('updatedAt'),
});
