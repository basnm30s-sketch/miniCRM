/**
 * Validation utilities for quotes and invoices
 * Provides comprehensive validation functions for production-ready data integrity
 */

import { Quote, QuoteLineItem, Customer, Vehicle } from '@/lib/types'
import { Invoice, InvoiceItem } from '@/lib/storage'
import { getAllQuotes, getAllInvoices, getAllCustomers, getAllVehicles, getQuoteById, getPurchaseOrderById } from '@/lib/storage'

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// Date validation utilities
export function isValidDate(dateString: string): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

export function isDateAfter(date1: string, date2: string): boolean {
  if (!date1 || !date2) return false
  return new Date(date1) >= new Date(date2)
}

export function isDateInFuture(dateString: string): boolean {
  if (!dateString) return false
  return new Date(dateString) > new Date()
}

// Number validation utilities
export function isPositiveNumber(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value > 0
}

export function isNonNegativeNumber(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= 0
}

export function isInteger(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && Number.isInteger(value)
}

export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max
}

// String validation utilities
export function isNonEmptyString(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

// Quote validation
export async function validateQuote(
  quote: Quote,
  options: {
    checkUniqueness?: boolean
    excludeQuoteId?: string // For edit mode, exclude current quote from uniqueness check
    checkCustomerExists?: boolean
    checkVehiclesExist?: boolean
  } = {}
): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const {
    checkUniqueness = false,
    excludeQuoteId,
    checkCustomerExists = false,
    checkVehiclesExist = false,
  } = options

  // Quote Number validation
  if (!isNonEmptyString(quote.number)) {
    errors.push({ field: 'number', message: 'Quote number is required' })
  } else if (checkUniqueness) {
    try {
      const allQuotes = await getAllQuotes()
      const existingQuote = allQuotes.find(
        (q) => q.number === quote.number && q.id !== excludeQuoteId
      )
      if (existingQuote) {
        errors.push({ field: 'number', message: 'Quote number must be unique' })
      }
    } catch (err) {
      console.error('Error checking quote uniqueness:', err)
    }
  }

  // Date validation
  if (!isValidDate(quote.date)) {
    errors.push({ field: 'date', message: 'Valid quote date is required' })
  }

  // Valid Until validation
  if (quote.validUntil) {
    if (!isValidDate(quote.validUntil)) {
      errors.push({ field: 'validUntil', message: 'Valid Until must be a valid date' })
    } else if (!isDateAfter(quote.validUntil, quote.date)) {
      errors.push({
        field: 'validUntil',
        message: 'Valid Until date must be on or after the quote date',
      })
    }
  }

  // Currency validation
  if (!isNonEmptyString(quote.currency)) {
    errors.push({ field: 'currency', message: 'Currency is required' })
  }

  // Customer validation
  if (!quote.customer || !quote.customer.id) {
    errors.push({ field: 'customer', message: 'Customer must be selected' })
  } else if (!isNonEmptyString(quote.customer.id)) {
    errors.push({ field: 'customer', message: 'Customer ID is invalid' })
  } else if (checkCustomerExists) {
    try {
      const customers = await getAllCustomers()
      const customerExists = customers.some((c) => c.id === quote.customer.id)
      if (!customerExists) {
        errors.push({ field: 'customer', message: 'Selected customer does not exist' })
      }
    } catch (err) {
      console.error('Error checking customer existence:', err)
    }
  }

  // Customer information completeness (for export)
  if (quote.customer) {
    if (!isNonEmptyString(quote.customer.name) && !isNonEmptyString(quote.customer.company || '')) {
      errors.push({
        field: 'customer',
        message: 'Customer must have either a name or company',
      })
    }
  }

  // Line Items validation
  if (!quote.items || quote.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one line item is required' })
  } else {
    quote.items.forEach((item, index) => {
      const itemPrefix = `items[${index}]`

      // Vehicle Type validation
      if (!isNonEmptyString(item.vehicleTypeId)) {
        errors.push({
          field: `${itemPrefix}.vehicleTypeId`,
          message: 'Vehicle type must be selected',
        })
      } else if (checkVehiclesExist) {
        // This will be checked asynchronously if needed
      }

      // Quantity validation
      if (!isInteger(item.quantity) || item.quantity < 1) {
        errors.push({
          field: `${itemPrefix}.quantity`,
          message: 'Quantity must be a positive integer (>= 1)',
        })
      }

      // Unit Price validation
      if (!isNonNegativeNumber(item.unitPrice)) {
        errors.push({
          field: `${itemPrefix}.unitPrice`,
          message: 'Unit price must be a valid number (>= 0)',
        })
      }

      // Tax Percent validation
      if (!isInRange(item.taxPercent, 0, 100)) {
        errors.push({
          field: `${itemPrefix}.taxPercent`,
          message: 'Tax percent must be between 0 and 100',
        })
      }
    })
  }

  // Total validation
  if (!isPositiveNumber(quote.total)) {
    errors.push({
      field: 'total',
      message: 'Quote total must be greater than zero',
    })
  }

  // Check if at least one item has price > 0
  if (quote.items && quote.items.length > 0) {
    const hasValidPrice = quote.items.some((item) => item.unitPrice > 0)
    if (!hasValidPrice) {
      errors.push({
        field: 'items',
        message: 'At least one line item must have a unit price greater than zero',
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Invoice validation
export async function validateInvoice(
  invoice: Invoice,
  options: {
    checkUniqueness?: boolean
    excludeInvoiceId?: string // For edit mode, exclude current invoice from uniqueness check
    checkCustomerExists?: boolean
    checkQuoteExists?: boolean
    checkPOExists?: boolean
  } = {}
): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const {
    checkUniqueness = false,
    excludeInvoiceId,
    checkCustomerExists = false,
    checkQuoteExists = false,
    checkPOExists = false,
  } = options

  // Invoice Number validation
  if (!isNonEmptyString(invoice.number)) {
    errors.push({ field: 'number', message: 'Invoice number is required' })
  } else if (checkUniqueness) {
    try {
      const allInvoices = await getAllInvoices()
      const existingInvoice = allInvoices.find(
        (inv) => inv.number === invoice.number && inv.id !== excludeInvoiceId
      )
      if (existingInvoice) {
        errors.push({ field: 'number', message: 'Invoice number must be unique' })
      }
    } catch (err) {
      console.error('Error checking invoice uniqueness:', err)
    }
  }

  // Date validation
  if (!isValidDate(invoice.date)) {
    errors.push({ field: 'date', message: 'Valid invoice date is required' })
  }

  // Due Date validation
  if (invoice.dueDate) {
    if (!isValidDate(invoice.dueDate)) {
      errors.push({ field: 'dueDate', message: 'Due date must be a valid date' })
    } else if (!isDateAfter(invoice.dueDate, invoice.date)) {
      errors.push({
        field: 'dueDate',
        message: 'Due date must be on or after the invoice date',
      })
    }
  }

  // Customer validation
  if (!invoice.customerId || !isNonEmptyString(invoice.customerId)) {
    errors.push({ field: 'customerId', message: 'Customer must be selected' })
  } else if (checkCustomerExists) {
    try {
      const customers = await getAllCustomers()
      const customerExists = customers.some((c) => c.id === invoice.customerId)
      if (!customerExists) {
        errors.push({ field: 'customerId', message: 'Selected customer does not exist' })
      }
    } catch (err) {
      console.error('Error checking customer existence:', err)
    }
  }

  // Quote link validation
  if (invoice.quoteId && checkQuoteExists) {
    try {
      const quote = await getQuoteById(invoice.quoteId)
      if (!quote) {
        errors.push({ field: 'quoteId', message: 'Linked quote does not exist' })
      }
    } catch (err) {
      console.error('Error checking quote existence:', err)
    }
  }

  // Purchase Order link validation
  if (invoice.purchaseOrderId && checkPOExists) {
    try {
      const po = await getPurchaseOrderById(invoice.purchaseOrderId)
      if (!po) {
        errors.push({ field: 'purchaseOrderId', message: 'Linked purchase order does not exist' })
      }
    } catch (err) {
      console.error('Error checking purchase order existence:', err)
    }
  }

  // Line Items validation
  if (!invoice.items || invoice.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one line item is required' })
  } else {
    invoice.items.forEach((item, index) => {
      const itemPrefix = `items[${index}]`

      // Description validation
      if (!isNonEmptyString(item.description)) {
        errors.push({
          field: `${itemPrefix}.description`,
          message: 'Item description is required',
        })
      }

      // Quantity validation
      if (!isPositiveNumber(item.quantity)) {
        errors.push({
          field: `${itemPrefix}.quantity`,
          message: 'Quantity must be a positive number (>= 1)',
        })
      }

      // Unit Price validation (must be > 0 for invoices)
      if (!isPositiveNumber(item.unitPrice)) {
        errors.push({
          field: `${itemPrefix}.unitPrice`,
          message: 'Unit price must be greater than zero',
        })
      }

      // Tax validation (if present, must be non-negative)
      if (item.tax !== undefined && !isNonNegativeNumber(item.tax)) {
        errors.push({
          field: `${itemPrefix}.tax`,
          message: 'Tax must be a valid non-negative number',
        })
      }
    })
  }

  // Total validation
  if (!isPositiveNumber(invoice.total)) {
    errors.push({
      field: 'total',
      message: 'Invoice total must be greater than zero',
    })
  }

  // Amount Received validation
  if (invoice.amountReceived !== undefined) {
    if (!isNonNegativeNumber(invoice.amountReceived)) {
      errors.push({
        field: 'amountReceived',
        message: 'Amount received must be a valid non-negative number',
      })
    } else if (invoice.amountReceived > invoice.total) {
      errors.push({
        field: 'amountReceived',
        message: 'Amount received cannot exceed the invoice total',
      })
    }
  }

  // Status validation
  const validStatuses = ['draft', 'invoice_sent', 'payment_received']
  if (invoice.status && !validStatuses.includes(invoice.status)) {
    errors.push({
      field: 'status',
      message: `Status must be one of: ${validStatuses.join(', ')}`,
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Simplified validation for export (no async checks)
export function validateQuoteForExport(quote: Quote): ValidationResult {
  const errors: ValidationError[] = []

  // Basic required fields
  if (!isNonEmptyString(quote.number)) {
    errors.push({ field: 'number', message: 'Quote number is required' })
  }

  if (!isValidDate(quote.date)) {
    errors.push({ field: 'date', message: 'Valid quote date is required' })
  }

  if (quote.validUntil && !isDateAfter(quote.validUntil, quote.date)) {
    errors.push({
      field: 'validUntil',
      message: 'Valid Until date must be on or after the quote date',
    })
  }

  if (!quote.customer || !quote.customer.id) {
    errors.push({ field: 'customer', message: 'Customer must be selected' })
  } else if (!isNonEmptyString(quote.customer.name) && !isNonEmptyString(quote.customer.company || '')) {
    errors.push({
      field: 'customer',
      message: 'Customer must have either a name or company',
    })
  }

  if (!quote.items || quote.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one line item is required' })
  } else {
    const hasValidItem = quote.items.some(
      (item) => isNonEmptyString(item.vehicleTypeId) && item.unitPrice > 0
    )
    if (!hasValidItem) {
      errors.push({
        field: 'items',
        message: 'At least one line item with vehicle type and price > 0 is required',
      })
    }
  }

  if (!isPositiveNumber(quote.total)) {
    errors.push({
      field: 'total',
      message: 'Quote total must be greater than zero',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Simplified validation for export (no async checks)
export function validateInvoiceForExport(invoice: Invoice): ValidationResult {
  const errors: ValidationError[] = []

  // Basic required fields
  if (!isNonEmptyString(invoice.number)) {
    errors.push({ field: 'number', message: 'Invoice number is required' })
  }

  if (!isValidDate(invoice.date)) {
    errors.push({ field: 'date', message: 'Valid invoice date is required' })
  }

  if (invoice.dueDate && !isDateAfter(invoice.dueDate, invoice.date)) {
    errors.push({
      field: 'dueDate',
      message: 'Due date must be on or after the invoice date',
    })
  }

  if (!invoice.customerId || !isNonEmptyString(invoice.customerId)) {
    errors.push({ field: 'customerId', message: 'Customer must be selected' })
  }

  if (!invoice.items || invoice.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one line item is required' })
  } else {
    const hasValidItem = invoice.items.some(
      (item) => isNonEmptyString(item.description) && item.unitPrice > 0
    )
    if (!hasValidItem) {
      errors.push({
        field: 'items',
        message: 'At least one line item with description and price > 0 is required',
      })
    }
  }

  if (!isPositiveNumber(invoice.total)) {
    errors.push({
      field: 'total',
      message: 'Invoice total must be greater than zero',
    })
  }

  if (invoice.amountReceived !== undefined && invoice.amountReceived > invoice.total) {
    errors.push({
      field: 'amountReceived',
      message: 'Amount received cannot exceed the invoice total',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}



