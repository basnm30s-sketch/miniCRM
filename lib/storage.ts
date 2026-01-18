/**
 * Storage utility - API client wrapper
 * Provides same interface as before but uses backend API instead of localStorage
 */

import { AdminSettings, Quote, Customer, Vehicle, Vendor, Employee, PurchaseOrder, Payslip, Invoice, InvoiceItem } from '@/lib/types'
import * as apiClient from './api-client'

// Helper to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Helper to get and increment quote counter
export async function getNextQuoteNumber(): Promise<string> {
  const settings = await getAdminSettings()
  const startingNumber = settings?.quoteStartingNumber || 1

  // Get all existing quotes to find the highest number
  const allQuotes = await getAllQuotes()
  let maxNumber = startingNumber - 1

  // Extract numbers from existing quote numbers (format: Quote-XXX)
  allQuotes.forEach(quote => {
    const match = quote.number.match(/^Quote-(\d+)$/i)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNumber) {
        maxNumber = num
      }
    }
  })

  const nextNumber = maxNumber + 1
  return `Quote-${String(nextNumber).padStart(3, '0')}`
}

// Legacy function for backward compatibility - now uses sequential counter
export async function generateQuoteNumber(pattern?: string): Promise<string> {
  return getNextQuoteNumber()
}

// --- AdminSettings ---
export async function getAdminSettings(): Promise<AdminSettings | null> {
  return apiClient.getAdminSettings()
}

export async function saveAdminSettings(settings: AdminSettings): Promise<void> {
  await apiClient.saveAdminSettings(settings)
}

export async function initializeAdminSettings(): Promise<AdminSettings> {
  const existing = await getAdminSettings()
  if (existing) return existing

  const defaults: AdminSettings = {
    id: 'settings_1',
    companyName: 'ALMSAR ALZAKI TRANSPORT AND MAINTENANCE',
    address: '',
    vatNumber: '',
    logoUrl: null,
    sealUrl: null,
    signatureUrl: null,
    quoteNumberPattern: 'AAT-YYYYMMDD-NNNN',
    currency: 'AED',
    defaultTerms: `1. This quotation is valid for 30 days from the date of issue.\n2. Goods remain the property of the company until full payment is received.\n3. Any additional costs such as tolls, fines or damages are not included unless stated.\n4. Payment terms: as agreed in the contract.`,
    showRevenueTrend: false,
    showQuickActions: false,
    showReports: false,
    showQuotationsTwoPane: true,
    showPurchaseOrdersTwoPane: true,
    showInvoicesTwoPane: true,
    createdAt: new Date().toISOString(),
  }

  await saveAdminSettings(defaults)
  return defaults
}

// --- Quotes ---
export async function getAllQuotes(): Promise<Quote[]> {
  return apiClient.getAllQuotes()
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  return apiClient.getQuoteById(id)
}

export async function saveQuote(quote: Quote): Promise<void> {
  await apiClient.saveQuote(quote)
}

export async function deleteQuote(id: string): Promise<void> {
  await apiClient.deleteQuote(id)
}

// --- Customers ---
export async function getAllCustomers(): Promise<Customer[]> {
  return apiClient.getAllCustomers()
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  return apiClient.getCustomerById(id)
}

export async function saveCustomer(customer: Customer, isUpdate?: boolean): Promise<void> {
  await apiClient.saveCustomer(customer, isUpdate)
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient.deleteCustomer(id)
}

// --- Vehicles ---
export async function getAllVehicles(): Promise<Vehicle[]> {
  return apiClient.getAllVehicles()
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  return apiClient.getVehicleById(id)
}

export async function saveVehicle(vehicle: Vehicle): Promise<void> {
  await apiClient.saveVehicle(vehicle)
}

export async function deleteVehicle(id: string): Promise<void> {
  await apiClient.deleteVehicle(id)
}

// --- Vendors ---
export async function getAllVendors(): Promise<Vendor[]> {
  return apiClient.getAllVendors()
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  return apiClient.getVendorById(id)
}

export async function saveVendor(vendor: Vendor): Promise<void> {
  await apiClient.saveVendor(vendor)
}

export async function deleteVendor(id: string): Promise<void> {
  await apiClient.deleteVendor(id)
}

// --- Employees ---
export async function getAllEmployees(): Promise<Employee[]> {
  return apiClient.getAllEmployees()
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  return apiClient.getEmployeeById(id)
}

export async function saveEmployee(employee: Employee): Promise<void> {
  await apiClient.saveEmployee(employee)
}

export async function deleteEmployee(id: string): Promise<void> {
  await apiClient.deleteEmployee(id)
}

// --- Payslips ---
export async function getAllPayslips(): Promise<Payslip[]> {
  return apiClient.getAllPayslips()
}

export async function getPayslipById(id: string): Promise<Payslip | null> {
  return apiClient.getPayslipById(id)
}

export async function getPayslipsByMonth(month: string): Promise<Payslip[]> {
  return apiClient.getPayslipsByMonth(month)
}

export async function savePayslip(payslip: Payslip): Promise<void> {
  await apiClient.savePayslip(payslip)
}

export async function deletePayslip(id: string): Promise<void> {
  await apiClient.deletePayslip(id)
}

export async function updatePayslipStatus(id: string, status: 'draft' | 'processed' | 'paid'): Promise<void> {
  await apiClient.updatePayslipStatus(id, status)
}

// --- Purchase Orders ---
export async function getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
  return apiClient.getAllPurchaseOrders()
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
  return apiClient.getPurchaseOrderById(id)
}

export async function savePurchaseOrder(po: PurchaseOrder): Promise<void> {
  await apiClient.savePurchaseOrder(po)
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  await apiClient.deletePurchaseOrder(id)
}

// --- Invoices ---
// --- Invoices ---
// Invoice and InvoiceItem are imported from @/lib/types


export async function getAllInvoices(): Promise<Invoice[]> {
  return apiClient.getAllInvoices()
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  return apiClient.getInvoiceById(id)
}

export async function saveInvoice(invoice: Invoice): Promise<void> {
  await apiClient.saveInvoice(invoice)
}

export async function deleteInvoice(id: string): Promise<void> {
  await apiClient.deleteInvoice(id)
}

// Helper to get and increment invoice counter
export async function getNextInvoiceNumber(): Promise<string> {
  const settings = await getAdminSettings()
  const startingNumber = settings?.invoiceStartingNumber || 1

  // Get all existing invoices to find the highest number
  const allInvoices = await getAllInvoices()
  let maxNumber = startingNumber - 1

  // Extract numbers from existing invoice numbers (format: Invoice-XXX)
  allInvoices.forEach(invoice => {
    const match = invoice.number.match(/^Invoice-(\d+)$/i)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNumber) {
        maxNumber = num
      }
    }
  })

  const nextNumber = maxNumber + 1
  return `Invoice-${String(nextNumber).padStart(3, '0')}`
}

// Legacy function for backward compatibility - now uses sequential counter
export async function generateInvoiceNumber(pattern?: string): Promise<string> {
  return getNextInvoiceNumber()
}

// Convert Quote to Invoice format
export async function convertQuoteToInvoice(quote: Quote): Promise<Invoice> {
  // Validate quote has required data
  if (!quote.customer || !quote.customer.id || quote.customer.id.trim() === '') {
    throw new Error('Quote must have a valid customer to convert to invoice. The customer may have been deleted from the database.')
  }
  if (!quote.items || quote.items.length === 0) {
    throw new Error('Quote must have at least one item to convert to invoice')
  }

  // Convert QuoteLineItems to InvoiceItems
  const invoiceItems: InvoiceItem[] = quote.items.map((quoteItem) => {
    const lineSubtotal = quoteItem.quantity * quoteItem.unitPrice
    const lineTax = (lineSubtotal * quoteItem.taxPercent) / 100
    const lineTotal = lineSubtotal + lineTax

    return {
      id: generateId(),
      description: quoteItem.vehicleTypeLabel || '',
      quantity: quoteItem.quantity,
      unitPrice: quoteItem.unitPrice,
      tax: lineTax,
      total: lineTotal,
    }
  })

  // Calculate totals
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const tax = invoiceItems.reduce((sum, item) => sum + (item.tax || 0), 0)
  const total = subtotal + tax

  // Create invoice
  const invoiceNumber = await getNextInvoiceNumber()
  const invoice: Invoice = {
    id: generateId(),
    number: invoiceNumber,
    date: new Date().toISOString().split('T')[0],
    dueDate: quote.validUntil || undefined,
    customerId: quote.customer.id,
    quoteId: quote.id,
    items: invoiceItems,
    subtotal: subtotal,
    tax: tax,
    total: total,
    amountReceived: 0,
    status: 'draft',
    notes: quote.notes || '',
  }

  return invoice
}

// Initialize sample data on first load
export async function initializeSampleData(): Promise<void> {
  const vehicles = await getAllVehicles()
  if (vehicles.length === 0) {
    const sampleVehicles: Vehicle[] = [
      { id: generateId(), vehicleNumber: 'PKT-001', vehicleType: 'Pickup Truck', description: 'Standard pickup truck', basePrice: 500 },
      { id: generateId(), vehicleNumber: 'SED-001', vehicleType: 'Sedan', description: 'Sedan car', basePrice: 300 },
      { id: generateId(), vehicleNumber: 'SUV-001', vehicleType: 'SUV', description: 'Sport Utility Vehicle', basePrice: 400 },
      { id: generateId(), vehicleNumber: 'LOR-001', vehicleType: 'Lorry', description: 'Heavy duty truck', basePrice: 800 },
      { id: generateId(), vehicleNumber: 'VAN-001', vehicleType: 'Van', description: 'Commercial van', basePrice: 600 },
    ]
    for (const vehicle of sampleVehicles) {
      await saveVehicle(vehicle)
    }
  }

  const customers = await getAllCustomers()
  if (customers.length === 0) {
    const sampleCustomers: Customer[] = [
      {
        id: generateId(),
        name: 'Ahmed Al Mansouri',
        company: 'Al Mansouri Trading',
        email: 'ahmed@almansouri.ae',
        phone: '+971 4 1234567',
        address: 'Dubai, UAE',
      },
      {
        id: generateId(),
        name: 'Fatima Al Maktoum',
        company: 'Al Maktoum Logistics',
        email: 'fatima@almaktoum.ae',
        phone: '+971 4 7654321',
        address: 'Abu Dhabi, UAE',
      },
    ]
    for (const customer of sampleCustomers) {
      await saveCustomer(customer)
    }
  }
}

// --- Vehicle Transactions ---
export async function getAllVehicleTransactions(vehicleId?: string, month?: string): Promise<any[]> {
  return apiClient.getAllVehicleTransactions(vehicleId, month)
}

export async function getVehicleTransactionById(id: string): Promise<any | null> {
  return apiClient.getVehicleTransactionById(id)
}

export async function saveVehicleTransaction(transaction: any): Promise<void> {
  await apiClient.saveVehicleTransaction(transaction)
}

export async function deleteVehicleTransaction(id: string): Promise<void> {
  await apiClient.deleteVehicleTransaction(id)
}

export async function getVehicleProfitability(vehicleId: string): Promise<any> {
  return apiClient.getVehicleProfitability(vehicleId)
}

export async function getVehicleFinanceDashboard(): Promise<any> {
  return apiClient.getVehicleFinanceDashboard()
}

// --- Expense Categories ---
export async function getAllExpenseCategories(): Promise<any[]> {
  return apiClient.getAllExpenseCategories()
}

export async function getExpenseCategoryById(id: string): Promise<any | null> {
  return apiClient.getExpenseCategoryById(id)
}

export async function saveExpenseCategory(category: any): Promise<void> {
  await apiClient.saveExpenseCategory(category)
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  await apiClient.deleteExpenseCategory(id)
}