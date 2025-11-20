/**
 * Local storage utility using localStorage
 * Handles persistence of AdminSettings, Quotes, Customers, and Vehicles
 */

import { AdminSettings, Quote, Customer, Vehicle, Vendor, Employee, PurchaseOrder } from '@/lib/types'

// Initialize localForage stores
const STORE_ADMIN = 'admin_settings'
const STORE_QUOTES = 'quotes'
const STORE_CUSTOMERS = 'customers'
const STORE_VEHICLES = 'vehicles'
const STORE_VENDORS = 'vendors'
const STORE_EMPLOYEES = 'employees'
const STORE_PURCHASE_ORDERS = 'purchase_orders'
const STORE_INVOICES = 'invoices'

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
  try {
    if (typeof window === 'undefined') return null
    const settings = localStorage.getItem(STORE_ADMIN)
    return settings ? JSON.parse(settings) : null
  } catch (err) {
    console.error('Failed to get admin settings:', err)
    return null
  }
}

export async function saveAdminSettings(settings: AdminSettings): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORE_ADMIN, JSON.stringify(settings))
  } catch (err) {
    console.error('Failed to save admin settings:', err)
  }
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
    createdAt: new Date().toISOString(),
  }

  await saveAdminSettings(defaults)
  return defaults
}

// --- Quotes ---
export async function getAllQuotes(): Promise<Quote[]> {
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORE_QUOTES)
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.error('Failed to get quotes:', err)
    return []
  }
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  try {
    if (typeof window === 'undefined') return null
    const quotes = await getAllQuotes()
    return quotes.find((q) => q.id === id) || null
  } catch (err) {
    console.error('Failed to get quote:', err)
    return null
  }
}

export async function saveQuote(quote: Quote): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const quotes = await getAllQuotes()
    const index = quotes.findIndex((q) => q.id === quote.id)
    if (index >= 0) {
      quotes[index] = quote
    } else {
      quotes.push(quote)
    }
    localStorage.setItem(STORE_QUOTES, JSON.stringify(quotes))
  } catch (err) {
    console.error('Failed to save quote:', err)
  }
}

export async function deleteQuote(id: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const quotes = await getAllQuotes()
    const filtered = quotes.filter((q) => q.id !== id)
    localStorage.setItem(STORE_QUOTES, JSON.stringify(filtered))
  } catch (err) {
    console.error('Failed to delete quote:', err)
  }
}

// --- Customers ---
export async function getAllCustomers(): Promise<Customer[]> {
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORE_CUSTOMERS)
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.error('Failed to get customers:', err)
    return []
  }
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    if (typeof window === 'undefined') return null
    const customers = await getAllCustomers()
    return customers.find((c) => c.id === id) || null
  } catch (err) {
    console.error('Failed to get customer:', err)
    return null
  }
}

export async function saveCustomer(customer: Customer): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const customers = await getAllCustomers()
    const index = customers.findIndex((c) => c.id === customer.id)
    if (index >= 0) {
      customers[index] = customer
    } else {
      customers.push(customer)
    }
    localStorage.setItem(STORE_CUSTOMERS, JSON.stringify(customers))
  } catch (err) {
    console.error('Failed to save customer:', err)
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const customers = await getAllCustomers()
    const filtered = customers.filter((c) => c.id !== id)
    localStorage.setItem(STORE_CUSTOMERS, JSON.stringify(filtered))
  } catch (err) {
    console.error('Failed to delete customer:', err)
  }
}

// --- Vehicles ---
export async function getAllVehicles(): Promise<Vehicle[]> {
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORE_VEHICLES)
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.error('Failed to get vehicles:', err)
    return []
  }
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  try {
    if (typeof window === 'undefined') return null
    const vehicles = await getAllVehicles()
    return vehicles.find((v) => v.id === id) || null
  } catch (err) {
    console.error('Failed to get vehicle:', err)
    return null
  }
}

export async function saveVehicle(vehicle: Vehicle): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const vehicles = await getAllVehicles()
    const index = vehicles.findIndex((v) => v.id === vehicle.id)
    if (index >= 0) {
      vehicles[index] = vehicle
    } else {
      vehicles.push(vehicle)
    }
    localStorage.setItem(STORE_VEHICLES, JSON.stringify(vehicles))
  } catch (err) {
    console.error('Failed to save vehicle:', err)
  }
}

export async function deleteVehicle(id: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const vehicles = await getAllVehicles()
    const filtered = vehicles.filter((v) => v.id !== id)
    localStorage.setItem(STORE_VEHICLES, JSON.stringify(filtered))
  } catch (err) {
    console.error('Failed to delete vehicle:', err)
  }
}

// --- Vendors ---
export async function getAllVendors(): Promise<Vendor[]> {
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORE_VENDORS)
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.error('Failed to get vendors:', err)
    return []
  }
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  try {
    if (typeof window === 'undefined') return null
    const vendors = await getAllVendors()
    return vendors.find((v) => v.id === id) || null
  } catch (err) {
    console.error('Failed to get vendor:', err)
    return null
  }
}

export async function saveVendor(vendor: Vendor): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const vendors = await getAllVendors()
    const index = vendors.findIndex((v) => v.id === vendor.id)
    if (index >= 0) {
      vendors[index] = vendor
    } else {
      vendors.push(vendor)
    }
    localStorage.setItem(STORE_VENDORS, JSON.stringify(vendors))
  } catch (err) {
    console.error('Failed to save vendor:', err)
  }
}

export async function deleteVendor(id: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const vendors = await getAllVendors()
    const filtered = vendors.filter((v) => v.id !== id)
    localStorage.setItem(STORE_VENDORS, JSON.stringify(filtered))
  } catch (err) {
    console.error('Failed to delete vendor:', err)
  }
}

// --- Employees ---
export async function getAllEmployees(): Promise<Employee[]> {
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORE_EMPLOYEES)
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.error('Failed to get employees:', err)
    return []
  }
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  try {
    if (typeof window === 'undefined') return null
    const employees = await getAllEmployees()
    return employees.find((e) => e.id === id) || null
  } catch (err) {
    console.error('Failed to get employee:', err)
    return null
  }
}

export async function saveEmployee(employee: Employee): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const employees = await getAllEmployees()
    const index = employees.findIndex((e) => e.id === employee.id)
    if (index >= 0) {
      employees[index] = employee
    } else {
      employees.push(employee)
    }
    localStorage.setItem(STORE_EMPLOYEES, JSON.stringify(employees))
  } catch (err) {
    console.error('Failed to save employee:', err)
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const employees = await getAllEmployees()
    const filtered = employees.filter((e) => e.id !== id)
    localStorage.setItem(STORE_EMPLOYEES, JSON.stringify(filtered))
  } catch (err) {
    console.error('Failed to delete employee:', err)
  }
}

// --- Purchase Orders ---
export async function getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORE_PURCHASE_ORDERS)
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.error('Failed to get purchase orders:', err)
    return []
  }
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
  try {
    if (typeof window === 'undefined') return null
    const pos = await getAllPurchaseOrders()
    return pos.find((po) => po.id === id) || null
  } catch (err) {
    console.error('Failed to get purchase order:', err)
    return null
  }
}

export async function savePurchaseOrder(po: PurchaseOrder): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const pos = await getAllPurchaseOrders()
    const index = pos.findIndex((p) => p.id === po.id)
    if (index >= 0) {
      pos[index] = po
    } else {
      pos.push(po)
    }
    localStorage.setItem(STORE_PURCHASE_ORDERS, JSON.stringify(pos))
  } catch (err) {
    console.error('Failed to save purchase order:', err)
  }
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const pos = await getAllPurchaseOrders()
    const filtered = pos.filter((po) => po.id !== id)
    localStorage.setItem(STORE_PURCHASE_ORDERS, JSON.stringify(filtered))
  } catch (err) {
    console.error('Failed to delete purchase order:', err)
  }
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
  status?: string // draft, sent, paid
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
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORE_INVOICES)
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.error('Failed to get invoices:', err)
    return []
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    if (typeof window === 'undefined') return null
    const invoices = await getAllInvoices()
    return invoices.find((inv) => inv.id === id) || null
  } catch (err) {
    console.error('Failed to get invoice:', err)
    return null
  }
}

export async function saveInvoice(invoice: Invoice): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const invoices = await getAllInvoices()
    const index = invoices.findIndex((inv) => inv.id === invoice.id)
    if (index >= 0) {
      invoices[index] = invoice
    } else {
      invoices.push(invoice)
    }
    localStorage.setItem(STORE_INVOICES, JSON.stringify(invoices))
  } catch (err) {
    console.error('Failed to save invoice:', err)
  }
}

export async function deleteInvoice(id: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const invoices = await getAllInvoices()
    const filtered = invoices.filter((inv) => inv.id !== id)
    localStorage.setItem(STORE_INVOICES, JSON.stringify(filtered))
  } catch (err) {
    console.error('Failed to delete invoice:', err)
  }
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
