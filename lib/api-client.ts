/**
 * API Client for Frontend
 * Provides functions matching storage.ts API but calls backend API endpoints
 */

// Use relative paths for Vercel/Next.js API routes, or explicit URL for Express server
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api' : 'http://localhost:3001/api')

// Connection status tracking
let lastHealthCheck: number = 0
let isServerHealthy: boolean | null = null
const HEALTH_CHECK_CACHE_MS = 2000 // Cache health check for 2 seconds

/**
 * Check if API server is healthy
 * Uses cached result for 2 seconds to avoid excessive requests
 */
export async function checkApiHealth(): Promise<boolean> {
  const now = Date.now()
  
  // Return cached result if recent
  if (isServerHealthy !== null && (now - lastHealthCheck) < HEALTH_CHECK_CACHE_MS) {
    return isServerHealthy
  }

  try {
    const url = `${API_BASE_URL}/health`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    clearTimeout(timeoutId)
    
    const isHealthy = response.ok
    isServerHealthy = isHealthy
    lastHealthCheck = now
    
    return isHealthy
  } catch (error) {
    isServerHealthy = false
    lastHealthCheck = now
    return false
  }
}

/**
 * Wait for API server to be ready with retry logic
 * @param maxRetries Maximum number of retry attempts
 * @param retryDelayMs Delay between retries in milliseconds
 */
export async function waitForApiServer(
  maxRetries: number = 5,
  retryDelayMs: number = 500
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const isHealthy = await checkApiHealth()
    if (isHealthy) {
      return true
    }
    
    if (attempt < maxRetries) {
      // Exponential backoff: delay increases with each attempt
      const delay = retryDelayMs * Math.pow(1.5, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return false
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage
      }
      // Don't log 404 errors as they're expected in some cases (checking if resource exists)
      if (response.status !== 404) {
        console.error(`API Request failed: ${options?.method || 'GET'} ${url} - ${errorMessage}`)
      }
      const error = new Error(errorMessage) as any
      error.status = response.status
      throw error
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  } catch (error: any) {
    // Re-throw with more context
    if (error.message && !error.message.includes('Network error')) {
      // Don't log 404 errors as they're expected in some cases
      if (error.status !== 404) {
        console.error(`API Request error for ${url}:`, error.message)
      }
      throw error
    }
    throw new Error(`Network error: ${error.message || 'Failed to connect to server'}`)
  }
}

// ==================== ADMIN SETTINGS ====================
export async function getAdminSettings(): Promise<any | null> {
  try {
    return await apiRequest<any>('/admin/settings')
  } catch (error) {
    console.error('Failed to get admin settings:', error)
    return null
  }
}

export async function saveAdminSettings(settings: any): Promise<void> {
  try {
    await apiRequest('/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    })
  } catch (error) {
    console.error('Failed to save admin settings:', error)
    throw error
  }
}

// ==================== CUSTOMERS ====================
export async function getAllCustomers(): Promise<any[]> {
  try {
    return await apiRequest<any[]>('/customers') || []
  } catch (error) {
    console.error('Failed to get customers:', error)
    return []
  }
}

export async function getCustomerById(id: string): Promise<any | null> {
  try {
    // Remove trailing slash if present and ensure no double slashes
    const cleanId = id.replace(/\/$/, '')
    const url = `${API_BASE_URL}/customers/${cleanId}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Handle 404 as expected - return null instead of throwing
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    return await response.json()
  } catch (error: any) {
    // Only log unexpected errors (not 404s)
    if (error.message && !error.message.includes('404') && !error.message.includes('Not Found') && !error.message.includes('not found')) {
      console.error('Failed to get customer:', error)
    }
    // Return null for any error (including 404)
    return null
  }
}

export async function saveCustomer(customer: any, isUpdate?: boolean): Promise<void> {
  try {
    // If isUpdate flag is provided, use it directly
    // Otherwise, check if customer exists by trying to get it
    let existingCustomer = null
    
    if (isUpdate === true) {
      // Explicitly an update
      existingCustomer = { id: customer.id } // Dummy object to trigger update path
    } else if (isUpdate === false) {
      // Explicitly a create - skip existence check
      existingCustomer = null
    } else if (customer.id) {
      // Auto-detect: silently check if customer exists (don't log 404 errors)
      try {
        existingCustomer = await getCustomerById(customer.id)
      } catch (error) {
        // Customer doesn't exist, will create new one
        existingCustomer = null
      }
    }

    if (existingCustomer) {
      // Update existing customer
      const cleanId = customer.id.replace(/\/$/, '')
      await apiRequest(`/customers/${cleanId}`, {
        method: 'PUT',
        body: JSON.stringify(customer),
      })
    } else {
      // Create new customer
      await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(customer),
      })
    }
  } catch (error) {
    console.error('Failed to save customer:', error)
    throw error
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    await apiRequest(`/customers/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Failed to delete customer:', error)
    throw error
  }
}

// ==================== VENDORS ====================
export async function getAllVendors(): Promise<any[]> {
  try {
    return await apiRequest<any[]>('/vendors') || []
  } catch (error) {
    console.error('Failed to get vendors:', error)
    return []
  }
}

export async function getVendorById(id: string): Promise<any | null> {
  try {
    const url = `${API_BASE_URL}/vendors/${id}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Handle 404 as expected - return null instead of throwing
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    return await response.json()
  } catch (error: any) {
    // Only log unexpected errors (not 404s)
    if (error.message && !error.message.includes('404') && !error.message.includes('Not Found') && !error.message.includes('not found')) {
      console.error('Failed to get vendor:', error)
    }
    // Return null for any error (including 404)
    return null
  }
}

export async function saveVendor(vendor: any): Promise<void> {
  try {
    // Check if vendor exists by trying to get it
    let existingVendor = null
    if (vendor.id) {
      try {
        existingVendor = await getVendorById(vendor.id)
      } catch (error) {
        // Vendor doesn't exist, will create new one
        existingVendor = null
      }
    }

    if (existingVendor) {
      // Update existing vendor
      await apiRequest(`/vendors/${vendor.id}`, {
        method: 'PUT',
        body: JSON.stringify(vendor),
      })
    } else {
      // Create new vendor
      await apiRequest('/vendors', {
        method: 'POST',
        body: JSON.stringify(vendor),
      })
    }
  } catch (error) {
    console.error('Failed to save vendor:', error)
    throw error
  }
}

export async function deleteVendor(id: string): Promise<void> {
  try {
    await apiRequest(`/vendors/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Failed to delete vendor:', error)
    throw error
  }
}

// ==================== EMPLOYEES ====================
export async function getAllEmployees(): Promise<any[]> {
  try {
    return await apiRequest<any[]>('/employees') || []
  } catch (error) {
    console.error('Failed to get employees:', error)
    return []
  }
}

export async function getEmployeeById(id: string): Promise<any | null> {
  try {
    const url = `${API_BASE_URL}/employees/${id}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Handle 404 as expected - return null instead of throwing
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    return await response.json()
  } catch (error: any) {
    // Only log unexpected errors (not 404s)
    if (error.message && !error.message.includes('404') && !error.message.includes('Not Found')) {
      console.error('Failed to get employee:', error)
    }
    // Return null for any error (including 404)
    return null
  }
}

export async function saveEmployee(employee: any): Promise<void> {
  try {
    // Check if employee exists by trying to get it
    let existingEmployee = null
    if (employee.id) {
      try {
        existingEmployee = await getEmployeeById(employee.id)
      } catch (error) {
        // Employee doesn't exist, will create new one
        existingEmployee = null
      }
    }

    if (existingEmployee) {
      // Update existing employee
      await apiRequest(`/employees/${employee.id}`, {
        method: 'PUT',
        body: JSON.stringify(employee),
      })
    } else {
      // Create new employee
      await apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify(employee),
      })
    }
  } catch (error) {
    console.error('Failed to save employee:', error)
    throw error
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  try {
    await apiRequest(`/employees/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Failed to delete employee:', error)
    throw error
  }
}

// ==================== VEHICLES ====================
export async function getAllVehicles(): Promise<any[]> {
  try {
    return await apiRequest<any[]>('/vehicles') || []
  } catch (error) {
    console.error('Failed to get vehicles:', error)
    return []
  }
}

export async function getVehicleById(id: string): Promise<any | null> {
  try {
    const url = `${API_BASE_URL}/vehicles/${id}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Handle 404 as expected - return null instead of throwing
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    return await response.json()
  } catch (error: any) {
    // Only log unexpected errors (not 404s)
    if (error.message && !error.message.includes('404') && !error.message.includes('Not Found') && !error.message.includes('not found')) {
      console.error('Failed to get vehicle:', error)
    }
    // Return null for any error (including 404)
    return null
  }
}

export async function saveVehicle(vehicle: any): Promise<void> {
  try {
    // Check if vehicle exists by trying to get it
    let existingVehicle = null
    if (vehicle.id) {
      try {
        existingVehicle = await getVehicleById(vehicle.id)
      } catch (error) {
        // Vehicle doesn't exist, will create new one
        existingVehicle = null
      }
    }

    if (existingVehicle) {
      // Update existing vehicle
      await apiRequest(`/vehicles/${vehicle.id}`, {
        method: 'PUT',
        body: JSON.stringify(vehicle),
      })
    } else {
      // Create new vehicle
      await apiRequest('/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicle),
      })
    }
  } catch (error) {
    console.error('Failed to save vehicle:', error)
    throw error
  }
}

export async function deleteVehicle(id: string): Promise<void> {
  try {
    await apiRequest(`/vehicles/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Failed to delete vehicle:', error)
    throw error
  }
}

// ==================== QUOTES ====================
export async function getAllQuotes(): Promise<any[]> {
  try {
    return await apiRequest<any[]>('/quotes') || []
  } catch (error) {
    console.error('Failed to get quotes:', error)
    return []
  }
}

export async function getQuoteById(id: string): Promise<any | null> {
  try {
    const url = `${API_BASE_URL}/quotes/${id}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Handle 404 as expected - return null instead of throwing
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    return await response.json()
  } catch (error: any) {
    // Only log unexpected errors (not 404s)
    if (error.message && !error.message.includes('404') && !error.message.includes('Not Found') && !error.message.includes('not found')) {
      console.error('Failed to get quote:', error)
    }
    // Return null for any error (including 404)
    return null
  }
}

export async function saveQuote(quote: any): Promise<void> {
  try {
    // Check if quote exists by trying to get it
    let existingQuote = null
    if (quote.id) {
      existingQuote = await getQuoteById(quote.id)
      // getQuoteById returns null if not found, doesn't throw
    }

    if (existingQuote) {
      // Update existing quote
      await apiRequest(`/quotes/${quote.id}`, {
        method: 'PUT',
        body: JSON.stringify(quote),
      })
    } else {
      // Create new quote
      await apiRequest('/quotes', {
        method: 'POST',
        body: JSON.stringify(quote),
      })
    }
  } catch (error) {
    console.error('Failed to save quote:', error)
    throw error
  }
}

export async function deleteQuote(id: string): Promise<void> {
  try {
    await apiRequest(`/quotes/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Failed to delete quote:', error)
    throw error
  }
}

// ==================== PURCHASE ORDERS ====================
export async function getAllPurchaseOrders(): Promise<any[]> {
  try {
    return await apiRequest<any[]>('/purchase-orders') || []
  } catch (error) {
    console.error('Failed to get purchase orders:', error)
    return []
  }
}

export async function getPurchaseOrderById(id: string): Promise<any | null> {
  try {
    const url = `${API_BASE_URL}/purchase-orders/${id}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Handle 404 as expected - return null instead of throwing
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    return await response.json()
  } catch (error: any) {
    // Only log unexpected errors (not 404s)
    if (error.message && !error.message.includes('404') && !error.message.includes('Not Found') && !error.message.includes('not found')) {
      console.error('Failed to get purchase order:', error)
    }
    // Return null for any error (including 404)
    return null
  }
}

export async function savePurchaseOrder(po: any): Promise<void> {
  try {
    // Check if purchase order exists by trying to get it
    let existingPO = null
    if (po.id) {
      try {
        existingPO = await getPurchaseOrderById(po.id)
      } catch (error) {
        // Purchase order doesn't exist, will create new one
        existingPO = null
      }
    }

    if (existingPO) {
      // Update existing purchase order
      await apiRequest(`/purchase-orders/${po.id}`, {
        method: 'PUT',
        body: JSON.stringify(po),
      })
    } else {
      // Create new purchase order
      await apiRequest('/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(po),
      })
    }
  } catch (error) {
    console.error('Failed to save purchase order:', error)
    throw error
  }
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  try {
    await apiRequest(`/purchase-orders/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Failed to delete purchase order:', error)
    throw error
  }
}

// ==================== INVOICES ====================
export async function getAllInvoices(): Promise<any[]> {
  try {
    return await apiRequest<any[]>('/invoices') || []
  } catch (error) {
    console.error('Failed to get invoices:', error)
    return []
  }
}

export async function getInvoiceById(id: string): Promise<any | null> {
  try {
    return await apiRequest<any>(`/invoices/${id}`)
  } catch (error: any) {
    // Silently handle "not found" errors - this is expected when checking if invoice exists
    if (error.message && (error.message.includes('not found') || error.message.includes('404'))) {
      return null
    }
    // Only log unexpected errors
    console.error('Failed to get invoice:', error)
    return null
  }
}

export async function saveInvoice(invoice: any): Promise<void> {
  try {
    // If invoice has an ID, check if it exists first
    if (invoice.id) {
      const existing = await getInvoiceById(invoice.id)
      if (existing) {
        // Invoice exists, update it
        await apiRequest(`/invoices/${invoice.id}`, {
          method: 'PUT',
          body: JSON.stringify(invoice),
        })
        return
      }
      // Invoice doesn't exist, create it
      await apiRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoice),
      })
      return
    } else {
      // No ID, always create new invoice
      await apiRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoice),
      })
    }
  } catch (error) {
    console.error('Failed to save invoice:', error)
    throw error
  }
}

export async function deleteInvoice(id: string): Promise<void> {
  try {
    await apiRequest(`/invoices/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Failed to delete invoice:', error)
    throw error
  }
}

// ==================== FILE UPLOADS ====================
// ==================== BRANDING FILES (SIMPLIFIED) ====================

/**
 * Check which branding files exist
 */
export async function checkBrandingFiles(): Promise<{
  logo: boolean;
  seal: boolean;
  signature: boolean;
  extensions: { logo: string | null; seal: string | null; signature: string | null };
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/uploads/branding/check`)
    if (!response.ok) {
      console.error('Failed to check branding files:', response.statusText)
      return { logo: false, seal: false, signature: false, extensions: { logo: null, seal: null, signature: null } }
    }
    return await response.json()
  } catch (error) {
    console.error('Error checking branding files:', error)
    return { logo: false, seal: false, signature: false, extensions: { logo: null, seal: null, signature: null } }
  }
}

/**
 * Get branding image URL (fixed location)
 */
export function getBrandingUrl(type: 'logo' | 'seal' | 'signature', extension: string | null): string | null {
  if (!extension) return null
  return `${API_BASE_URL}/uploads/branding/${type}.${extension}`
}

/**
 * Load branding URLs for document generation
 * Returns URLs for all branding images that exist
 */
export async function loadBrandingUrls(): Promise<{
  logoUrl: string | null;
  sealUrl: string | null;
  signatureUrl: string | null;
}> {
  const branding = await checkBrandingFiles()
  return {
    logoUrl: getBrandingUrl('logo', branding.extensions.logo),
    sealUrl: getBrandingUrl('seal', branding.extensions.seal),
    signatureUrl: getBrandingUrl('signature', branding.extensions.signature),
  }
}

/**
 * Upload branding file (logo, seal, or signature)
 * Files are saved to fixed locations - no path returned
 */
export async function uploadBrandingFile(file: File, brandingType: 'logo' | 'seal' | 'signature'): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', 'branding')
  formData.append('brandingType', brandingType)

  const response = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    let errorMessage = `Upload failed with status ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorMessage
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage)
  }
  
  // Success - no need to parse response, files are at fixed locations
}

// ==================== REGULAR FILE UPLOADS ====================

export async function uploadFile(
  file: File, 
  type: 'logos' | 'documents' | 'signatures'
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  const response = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    let errorMessage = `Upload failed with status ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorMessage
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage)
  }

  const result = await response.json()
  if (!result || !result.path) {
    throw new Error('Invalid response from server: missing path')
  }
  return result.path
}

export function getFileUrl(relativePath: string | null): string | null {
  if (!relativePath) return null
  // Remove ./ prefix if present and extract type and filename
  const cleanPath = relativePath.startsWith('./') ? relativePath.substring(2) : relativePath
  const parts = cleanPath.split('/')
  
  // Handle branding paths: data/branding/logo.png -> /api/uploads/branding/logo.png
  if (parts.length >= 2 && parts[0] === 'data' && parts[1] === 'branding') {
    const filename = parts[parts.length - 1] // filename (e.g., logo.png)
    return `${API_BASE_URL}/uploads/branding/${filename}`
  }
  
  // Handle regular upload paths: data/uploads/type/filename
  if (parts.length >= 3 && parts[0] === 'data' && parts[1] === 'uploads') {
    const type = parts[parts.length - 2] // type (logos, documents, signatures)
    const filename = parts[parts.length - 1] // filename
    return `${API_BASE_URL}/uploads/${type}/${filename}`
  }
  
  return null
}

// ==================== PAYSLIPS ====================
export async function getAllPayslips(): Promise<any[]> {
  try {
    return await apiRequest<any[]>('/payslips') || []
  } catch (error: any) {
    console.error('Failed to get payslips:', error)
    // Return empty array on error instead of throwing
    return []
  }
}

export async function getPayslipById(id: string): Promise<any | null> {
  try {
    const url = `${API_BASE_URL}/payslips/${id}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Handle 404 as expected - return null instead of throwing
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    return await response.json()
  } catch (error: any) {
    // Only log unexpected errors (not 404s)
    if (error.message && !error.message.includes('404') && !error.message.includes('Not Found')) {
      console.error('Failed to get payslip:', error)
    }
    // Return null for any error (including 404)
    return null
  }
}

export async function getPayslipsByMonth(month: string): Promise<any[]> {
  try {
    return await apiRequest<any[]>(`/payslips/month/${month}`) || []
  } catch (error) {
    console.error('Failed to get payslips by month:', error)
    return []
  }
}

export async function savePayslip(payslip: any): Promise<void> {
  try {
    // Validate required fields
    if (!payslip.employeeId || !payslip.month) {
      throw new Error('employeeId and month are required fields')
    }

    // For salary calculation workflow, we always create new payslips
    // If payslip has an ID, check if it exists first to decide between PUT and POST
    if (payslip.id) {
      const existingPayslip = await getPayslipById(payslip.id)
      if (existingPayslip) {
        // Update existing payslip
        await apiRequest(`/payslips/${payslip.id}`, {
          method: 'PUT',
          body: JSON.stringify(payslip),
        })
        return
      }
      // If not found (null), fall through to create new payslip
    }

    // Create new payslip
    await apiRequest('/payslips', {
      method: 'POST',
      body: JSON.stringify(payslip),
    })
  } catch (error: any) {
    console.error('Failed to save payslip:', error)
    console.error('Payslip data:', JSON.stringify(payslip, null, 2))
    const errorMessage = error?.message || 'Failed to save payslip'
    throw new Error(errorMessage)
  }
}

export async function deletePayslip(id: string): Promise<void> {
  try {
    await apiRequest(`/payslips/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Failed to delete payslip:', error)
    throw error
  }
}

export async function updatePayslipStatus(id: string, status: string): Promise<void> {
  try {
    // Get existing payslip first
    const existingPayslip = await getPayslipById(id)
    if (!existingPayslip) {
      throw new Error('Payslip not found')
    }
    
    // Update only the status field
    await apiRequest(`/payslips/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...existingPayslip,
        status,
      }),
    })
  } catch (error) {
    console.error('Failed to update payslip status:', error)
    throw error
  }
}

// ==================== VEHICLE TRANSACTIONS ====================
export async function getAllVehicleTransactions(vehicleId?: string, month?: string): Promise<any[]> {
  try {
    let url = '/vehicle-transactions'
    const params = new URLSearchParams()
    if (vehicleId) params.append('vehicleId', vehicleId)
    if (month) params.append('month', month)
    if (params.toString()) {
      url += `?${params.toString()}`
    }
    return await apiRequest<any[]>(url) || []
  } catch (error) {
    console.error('Failed to get vehicle transactions:', error)
    return []
  }
}

export async function getVehicleTransactionById(id: string): Promise<any | null> {
  try {
    return await apiRequest<any>(`/vehicle-transactions/${id}`)
  } catch (error: any) {
    // Handle 404 as expected - transaction doesn't exist
    if (error?.status === 404 || 
        error?.message?.includes('404') || 
        error?.message?.toLowerCase().includes('not found')) {
      return null
    }
    console.error('Failed to get vehicle transaction:', error)
    throw error
  }
}

export async function saveVehicleTransaction(transaction: any): Promise<void> {
  try {
    // If transaction has an ID, check if it exists to decide between update and create
    if (transaction.id) {
      const existing = await getVehicleTransactionById(transaction.id)
      if (existing) {
        // Update existing transaction
        await apiRequest(`/vehicle-transactions/${transaction.id}`, {
          method: 'PUT',
          body: JSON.stringify(transaction),
        })
        return
      }
      // If ID exists but transaction doesn't, create it with that ID
    }
    // Create new transaction - POST returns the created transaction
    await apiRequest<any>('/vehicle-transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    })
    return
  } catch (error: any) {
    console.error('Failed to save vehicle transaction:', error)
    throw error
  }
}

export async function deleteVehicleTransaction(id: string): Promise<void> {
  try {
    await apiRequest(`/vehicle-transactions/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Failed to delete vehicle transaction:', error)
    throw error
  }
}

export async function getVehicleProfitability(vehicleId: string): Promise<any> {
  try {
    return await apiRequest<any>(`/vehicles/${vehicleId}/profitability`)
  } catch (error) {
    console.error('Failed to get vehicle profitability:', error)
    throw error
  }
}

export async function getVehicleFinanceDashboard(): Promise<any> {
  try {
    return await apiRequest<any>('/vehicle-finances/dashboard')
  } catch (error: any) {
    // Don't throw for 404, return null instead
    if (error?.status === 404 || error?.message?.includes('404') || error?.message?.toLowerCase().includes('not found')) {
      console.warn('Dashboard endpoint not found, returning empty data')
      return null
    }
    console.error('Failed to get vehicle finance dashboard:', error)
    throw error
  }
}

// ==================== EXPENSE CATEGORIES ====================
export async function getAllExpenseCategories(): Promise<any[]> {
  try {
    return await apiRequest<any[]>('/expense-categories') || []
  } catch (error) {
    console.error('Failed to get expense categories:', error)
    return []
  }
}

export async function getExpenseCategoryById(id: string): Promise<any | null> {
  try {
    return await apiRequest<any>(`/expense-categories/${id}`)
  } catch (error: any) {
    // Handle 404 as expected - category doesn't exist
    if (error?.status === 404 || 
        error?.message?.includes('404') || 
        error?.message?.toLowerCase().includes('not found')) {
      return null
    }
    console.error('Failed to get expense category:', error)
    throw error
  }
}

export async function saveExpenseCategory(category: any): Promise<void> {
  try {
    if (category.id) {
      const existing = await getExpenseCategoryById(category.id)
      if (existing) {
        await apiRequest(`/expense-categories/${category.id}`, {
          method: 'PUT',
          body: JSON.stringify(category),
        })
        return
      }
    }
    await apiRequest('/expense-categories', {
      method: 'POST',
      body: JSON.stringify(category),
    })
  } catch (error: any) {
    console.error('Failed to save expense category:', error)
    throw error
  }
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  try {
    await apiRequest(`/expense-categories/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Failed to delete expense category:', error)
    throw error
  }
}

