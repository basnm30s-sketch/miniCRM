/**
 * Core data types for the Quote MVP
 */

export interface AdminSettings {
  id: string;
  companyName: string;
  address: string;
  vatNumber: string;
  logoUrl: string | null; // base64 data URL
  sealUrl: string | null; // base64 data URL
  signatureUrl: string | null; // base64 data URL
  quoteNumberPattern: string; // e.g., "AAT-YYYYMMDD-NNNN"
  currency: string; // e.g., "AED"
  defaultTerms?: string; // default Terms and Conditions text
  showRevenueTrend?: boolean; // Show/hide revenue trend chart on home page
  showQuickActions?: boolean; // Show/hide quick actions on home page
  showReports?: boolean; // Show/hide Reports menu in sidebar
  showVehicleFinances?: boolean; // Show/hide Vehicle Finances menu in sidebar
  showQuotationsInvoicesCard?: boolean; // Show/hide Quotations & Invoices card on home page
  showEmployeeSalariesCard?: boolean; // Show/hide Employee Salaries card on home page
  showVehicleRevenueExpensesCard?: boolean; // Show/hide Vehicle Revenue & Expenses card on home page
  showActivityThisMonth?: boolean; // Show/hide Activity This Month section on home page
  showFinancialHealth?: boolean; // Show/hide Financial Health section on home page
  showBusinessOverview?: boolean; // Show/hide Business Overview section on home page
  showTopCustomers?: boolean; // Show/hide Top Customers by Value card on home page
  showActivitySummary?: boolean; // Show/hide Activity Summary card on home page
  footerAddressEnglish?: string; // Footer address in English
  footerAddressArabic?: string; // Footer address in Arabic
  footerContactEnglish?: string; // Footer contact details in English
  footerContactArabic?: string; // Footer contact details in Arabic
  createdAt?: string; // ISO8601
  updatedAt?: string; // ISO8601
}

export interface Customer {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt?: string; // ISO8601
  updatedAt?: string; // ISO8601
}

export type VehicleFuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid';
export type VehicleStatus = 'active' | 'maintenance' | 'sold' | 'retired';

export interface Vehicle {
  id: string;
  vehicleNumber: string; // Required, unique (e.g., "DXB A-12345")
  vehicleType?: string; // Optional link to vehicle category
  make?: string; // Manufacturer (Toyota, Ford, etc.)
  model?: string; // Model name
  year?: number; // Manufacturing year
  color?: string;
  // Financial tracking
  purchasePrice?: number;
  purchaseDate?: string; // YYYY-MM-DD
  currentValue?: number;
  insuranceCostMonthly?: number;
  financingCostMonthly?: number;
  // Operational info
  odometerReading?: number; // km
  lastServiceDate?: string; // YYYY-MM-DD
  nextServiceDue?: string; // YYYY-MM-DD
  fuelType?: VehicleFuelType;
  status?: VehicleStatus;
  // Compliance
  registrationExpiry?: string; // YYYY-MM-DD
  insuranceExpiry?: string; // YYYY-MM-DD
  // Legacy/general
  description?: string;
  basePrice?: number;
  notes?: string;
  createdAt?: string; // ISO8601
  type?: string; // Legacy support
}

export interface QuoteLineItem {
  id: string;
  serialNumber?: number; // Auto-generated
  vehicleTypeId: string;
  vehicleTypeLabel: string; // display name (Item name)
  vehicleNumber?: string; // NEW - from vehicle master
  description?: string; // NEW - from vehicle master
  rentalBasis?: 'hourly' | 'monthly'; // NEW - rental basis selection
  quantity: number; // integer >= 1 (now represents hours or months)
  unitPrice: number; // AED (Rate per hour or per month)
  taxPercent: number; // 0-100
  grossAmount?: number; // NEW - calculated (quantity * unitPrice)
  lineTaxAmount?: number; // auto-computed (Tax)
  lineTotal?: number; // auto-computed (Net amount)
}

export interface Quote {
  id: string;
  number: string; // e.g., "AAT-20251118-0001"
  date: string; // YYYY-MM-DD
  validUntil?: string; // optional YYYY-MM-DD
  currency: string; // AED (fixed)
  customer: Customer;
  items: QuoteLineItem[];
  subTotal: number;
  totalTax: number;
  total: number;
  terms?: string; // Terms and Conditions for this quote (overrides admin default)
  notes?: string;
  createdAt?: string; // ISO8601
  updatedAt?: string; // ISO8601
}

// DTO for creating/updating quotes
export interface CreateQuoteInput {
  customerId: string;
  items: Omit<QuoteLineItem, 'id' | 'lineTaxAmount' | 'lineTotal'>[];
  notes?: string;
}

export interface UpdateQuoteInput {
  id: string;
  customerId?: string;
  items?: Omit<QuoteLineItem, 'id' | 'lineTaxAmount' | 'lineTotal'>[];
  notes?: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  bankDetails?: string;
  paymentTerms?: string;
  createdAt?: string;
}

export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  role?: string;
  paymentType?: 'hourly' | 'monthly';
  hourlyRate?: number;
  salary?: number;
  overtimeRate?: number; // NEW - default overtime rate per hour
  bankDetails?: string;
  createdAt?: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  present: boolean;
  overtimeHours?: number;
  createdAt?: string;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  date: string;
  vendorId: string;
  vendor?: Vendor;
  items: POItem[];
  subtotal?: number;
  tax?: number;
  amount?: number;
  currency?: string;
  status?: string; // draft, sent, accepted
  notes?: string;
  createdAt?: string;
}

export interface POItem {
  id: string;
  serialNumber?: number; // Auto-generated, matches quotation/invoice
  vehicleTypeId?: string; // Optional - reference to vehicle master (for backward compatibility)
  vehicleTypeLabel?: string; // Display name (Item name)
  vehicleNumber?: string; // From vehicle master
  description?: string; // Optional - can be auto-filled from vehicle or manually entered
  rentalBasis?: 'hourly' | 'monthly'; // Rental basis selection
  quantity: number;
  unitPrice: number;
  taxPercent?: number; // NEW - percentage-based tax (0-100)
  tax?: number; // Keep for backward compatibility (flat tax amount)
  grossAmount?: number; // Calculated: quantity * unitPrice
  lineTaxAmount?: number; // Calculated: grossAmount * (taxPercent / 100) or use tax if provided
  lineTotal?: number; // Calculated: grossAmount + lineTaxAmount
  total: number; // Keep for backward compatibility
}

export interface Payslip {
  id: string;
  employeeId: string;
  employee?: Employee; // populated on fetch
  month: string; // YYYY-MM format
  year: number;
  baseSalary: number;
  overtimeHours?: number;
  overtimeRate?: number;
  overtimePay?: number;
  deductions: number;
  deductionRemarks?: string; // NEW - reason for deductions
  netPay: number;
  status: 'draft' | 'processed' | 'paid';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalaryCalculation {
  employeeId: string;
  employee: Employee;
  basePay: number;
  overtimeHours?: number;
  overtimeRate?: number;
  overtimePay?: number;
  deductions: number;
  netPay: number;
}

export type VehicleTransactionType = 'expense' | 'revenue';

export interface ExpenseCategory {
  id: string;
  name: string;
  isCustom: boolean;
  createdAt?: string;
}

export interface VehicleTransaction {
  id: string;
  vehicleId: string;
  transactionType: VehicleTransactionType;
  category?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  description?: string;
  employeeId?: string;
  invoiceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleProfitability {
  vehicleId: string;
  month: string; // YYYY-MM
  totalRevenue: number;
  totalExpenses: number;
  profit: number; // revenue - expenses
  transactionCount: number;
}

export interface VehicleProfitabilitySummary {
  vehicleId: string;
  currentMonth: VehicleProfitability | null;
  lastMonth: VehicleProfitability | null;
  allTimeRevenue: number;
  allTimeExpenses: number;
  allTimeProfit: number;
  months: VehicleProfitability[];
}

export interface InvoiceItem {
  id: string
  serialNumber?: number // Auto-generated, matches quotation
  vehicleTypeId?: string // Optional - reference to vehicle master (for backward compatibility)
  vehicleTypeLabel?: string // Display name (Item name)
  vehicleNumber?: string // From vehicle master
  description?: string // Optional - can be auto-filled from vehicle or manually entered
  rentalBasis?: 'hourly' | 'monthly' // Rental basis selection
  quantity: number
  unitPrice: number
  taxPercent?: number // NEW - percentage-based tax (0-100)
  tax?: number // Keep for backward compatibility (flat tax amount)
  grossAmount?: number // Calculated: quantity * unitPrice
  lineTaxAmount?: number // Calculated: grossAmount * (taxPercent / 100) or use tax if provided
  lineTotal?: number // Calculated: grossAmount + lineTaxAmount
  total: number // Keep for backward compatibility
  amountReceived?: number // Invoice-specific - per line item payment tracking
}

export interface Invoice {
  id: string
  number: string
  date: string
  dueDate?: string
  customerId?: string
  vendorId?: string
  purchaseOrderId?: string
  quoteNumber?: string
  purchaseOrderNumber?: string
  quoteId?: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  amountReceived?: number // Amount received from customer (defaults to 0)
  status?: string // draft, invoice_sent, payment_received
  notes?: string
  createdAt?: string
  updatedAt?: string
}