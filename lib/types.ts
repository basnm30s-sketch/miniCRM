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

export interface Vehicle {
  id: string;
  type: string; // e.g., "Pickup Truck", "Sedan", "Lorry"
  description?: string;
  basePrice?: number; // optional
  createdAt?: string; // ISO8601
}

export interface QuoteLineItem {
  id: string;
  vehicleTypeId: string;
  vehicleTypeLabel: string; // display name
  quantity: number; // integer >= 1
  unitPrice: number; // AED
  taxPercent: number; // 0-100
  lineTaxAmount?: number; // auto-computed
  lineTotal?: number; // auto-computed
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
  description: string;
  quantity: number;
  unitPrice: number;
  tax?: number;
  total: number;
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
