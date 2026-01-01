/**
 * Storage utility - API client wrapper
 * Provides same interface as before but uses backend API instead of localStorage
 */

import { AdminSettings, Quote, Customer, Vehicle, Vendor, Employee, PurchaseOrder, Payslip } from '@/lib/types'
import * as apiClient from './api-client'

// Helper to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Helper to generate quote number from pattern
export function generateQuoteNumber(pattern: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const timestamp = `${year}${month}${day}`

  // Simple counter per day; in production, use server-backed counter
  const randomSuffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0')

  return pattern
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('YYYYMMDD', timestamp)
    .replace('NNNN', randomSuffix)
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

export async function saveCustomer(customer: Customer): Promise<void> {
  await apiClient.saveCustomer(customer)
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
export interface Invoice {
  id: string
  number: string
  date: string
  dueDate?: string
  customerId?: string
  vendorId?: string
  purchaseOrderId?: string
  quoteId?: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  amountReceived?: number // Amount received from customer (defaults to 0)
  status?: string // draft, invoice_sent, payment_received
  notes?: string
  createdAt?: string
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  tax?: number
  total: number
}

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

// Helper to generate invoice number
export function generateInvoiceNumber(pattern: string = 'INV-YYYYMMDD-NNNN'): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const timestamp = `${year}${month}${day}`
  const randomSuffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0')

  return pattern
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('YYYYMMDD', timestamp)
    .replace('NNNN', randomSuffix)
}

// Convert Quote to Invoice format
export function convertQuoteToInvoice(quote: Quote): Invoice {
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
  const invoice: Invoice = {
    id: generateId(),
    number: generateInvoiceNumber(),
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
      { id: generateId(), type: 'Pickup Truck', description: 'Standard pickup truck', basePrice: 500 },
      { id: generateId(), type: 'Sedan', description: 'Sedan car', basePrice: 300 },
      { id: generateId(), type: 'SUV', description: 'Sport Utility Vehicle', basePrice: 400 },
      { id: generateId(), type: 'Lorry', description: 'Heavy duty truck', basePrice: 800 },
      { id: generateId(), type: 'Van', description: 'Commercial van', basePrice: 600 },
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