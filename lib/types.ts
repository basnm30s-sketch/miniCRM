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
