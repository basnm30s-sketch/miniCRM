/**
 * API Client for Frontend
 * Provides functions matching storage.ts API but calls backend API endpoints
 */

import type {
  AdminSettings,
  Customer,
  Vendor,
  Employee,
  Vehicle,
  Quote,
  PurchaseOrder,
  Invoice,
  Payslip,
  VehicleTransaction,
  ExpenseCategory,
} from './types'

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

const DEFAULT_REQUEST_TIMEOUT_MS = 8000

/**
 * fetch with AbortController-based timeout to avoid hanging when server is unresponsive.
 * @param url URL to fetch
 * @param init Optional RequestInit (method, headers, body, etc.)
 * @param timeoutMs Timeout in ms (default 8000). Set to 0 to disable.
 */
async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = timeoutMs > 0 ? new AbortController() : null
  const timeoutId =
    controller && timeoutMs > 0 ? setTimeout(() => controller!.abort(), timeoutMs) : null
  try {
    const response = await fetch(url, {
      ...init,
      signal: init?.signal ?? controller?.signal,
    })
    if (timeoutId) clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId)
    if (error?.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  }
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  try {
    // Avoid requests hanging forever (common when local backend is stuck).
    // Use existing signal if provided; otherwise attach a timeout signal.
    const controller = options?.signal ? null : new AbortController()
    const timeoutMs =
      typeof options?.signal === 'undefined'
        ? 8000
        : 0
    const timeoutId =
      controller && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null

    const response = await fetch(url, {
      ...options,
      signal: options?.signal ?? controller?.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (timeoutId) clearTimeout(timeoutId)

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
    if (error?.name === 'AbortError') {
      throw new Error('Request timeout')
    }
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
export async function getAdminSettings(): Promise<AdminSettings | null> {
  try {
    return await apiRequest<AdminSettings>('/admin/settings')
  } catch (error) {
    console.error('Failed to get admin settings:', error)
    return null
  }
}

export async function saveAdminSettings(settings: AdminSettings): Promise<void> {
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
export async function getAllCustomers(): Promise<Customer[]> {
  try {
    return await apiRequest<Customer[]>('/customers') || []
  } catch (error) {
    console.error('Failed to get customers:', error)
    return []
  }
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    // Remove trailing slash if present and ensure no double slashes
    const cleanId = id.replace(/\/$/, '')
    const url = `${API_BASE_URL}/customers/${cleanId}`
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json' },
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

export async function saveCustomer(customer: Customer, isUpdate?: boolean): Promise<void> {
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
export async function getAllVendors(): Promise<Vendor[]> {
  try {
    return await apiRequest<Vendor[]>('/vendors') || []
  } catch (error) {
    console.error('Failed to get vendors:', error)
    return []
  }
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  try {
    const url = `${API_BASE_URL}/vendors/${id}`
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json' },
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

export async function saveVendor(vendor: Vendor): Promise<void> {
  try {
    // New vendors (no createdAt) don't exist yet — POST directly to avoid 404 from getVendorById
    const isNew = !vendor.createdAt
    if (isNew) {
      await apiRequest('/vendors', {
        method: 'POST',
        body: JSON.stringify(vendor),
      })
      return
    }

    // For possibly existing vendors, check then update or create
    let existingVendor = null
    if (vendor.id) {
      try {
        existingVendor = await getVendorById(vendor.id)
      } catch {
        existingVendor = null
      }
    }

    if (existingVendor) {
      await apiRequest(`/vendors/${vendor.id}`, {
        method: 'PUT',
        body: JSON.stringify(vendor),
      })
    } else {
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
export async function getAllEmployees(): Promise<Employee[]> {
  try {
    return await apiRequest<Employee[]>('/employees') || []
  } catch (error) {
    console.error('Failed to get employees:', error)
    return []
  }
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  try {
    const url = `${API_BASE_URL}/employees/${id}`
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json' },
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

export async function saveEmployee(employee: Employee): Promise<void> {
  try {
    // New employees (no createdAt) don't exist yet — POST directly to avoid 404 from getEmployeeById
    const isNew = !employee.createdAt
    if (isNew) {
      await apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify(employee),
      })
      return
    }

    // For possibly existing employees, check then update or create
    let existingEmployee = null
    if (employee.id) {
      try {
        existingEmployee = await getEmployeeById(employee.id)
      } catch {
        existingEmployee = null
      }
    }

    if (existingEmployee) {
      await apiRequest(`/employees/${employee.id}`, {
        method: 'PUT',
        body: JSON.stringify(employee),
      })
    } else {
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
export async function getAllVehicles(): Promise<Vehicle[]> {
  try {
    return await apiRequest<Vehicle[]>('/vehicles') || []
  } catch (error) {
    console.error('Failed to get vehicles:', error)
    return []
  }
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  try {
    const url = `${API_BASE_URL}/vehicles/${id}`
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json' },
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

export async function saveVehicle(vehicle: Vehicle): Promise<void> {
  try {
    // New vehicles (no createdAt) don't exist yet — POST directly to avoid 404 from getVehicleById
    const isNew = !vehicle.createdAt
    if (isNew) {
      await apiRequest('/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicle),
      })
      return
    }

    // For possibly existing vehicles, check then update or create
    let existingVehicle = null
    if (vehicle.id) {
      try {
        existingVehicle = await getVehicleById(vehicle.id)
      } catch {
        existingVehicle = null
      }
    }

    if (existingVehicle) {
      await apiRequest(`/vehicles/${vehicle.id}`, {
        method: 'PUT',
        body: JSON.stringify(vehicle),
      })
    } else {
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
export async function getAllQuotes(): Promise<Quote[]> {
  try {
    return await apiRequest<Quote[]>('/quotes') || []
  } catch (error) {
    console.error('Failed to get quotes:', error)
    return []
  }
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  try {
    const url = `${API_BASE_URL}/quotes/${id}`
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json' },
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

export async function saveQuote(quote: Quote): Promise<Quote> {
  try {
    // New quotes (no createdAt) don't exist yet — POST directly to avoid 404 from getQuoteById
    const isNew = !quote.createdAt
    if (isNew) {
      return await apiRequest('/quotes', {
        method: 'POST',
        body: JSON.stringify(quote),
      })
    }

    // For possibly existing quotes, check then update or create
    let existingQuote = null
    if (quote.id) {
      existingQuote = await getQuoteById(quote.id)
    }

    if (existingQuote) {
      return await apiRequest(`/quotes/${quote.id}`, {
        method: 'PUT',
        body: JSON.stringify(quote),
      })
    }
    return await apiRequest('/quotes', {
      method: 'POST',
      body: JSON.stringify(quote),
    })
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
export async function getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    return await apiRequest<PurchaseOrder[]>('/purchase-orders') || []
  } catch (error) {
    console.error('Failed to get purchase orders:', error)
    return []
  }
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
  try {
    const url = `${API_BASE_URL}/purchase-orders/${id}`
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json' },
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

export async function savePurchaseOrder(po: PurchaseOrder): Promise<void> {
  try {
    // New POs (no createdAt) don't exist yet — POST directly to avoid 404 from getPurchaseOrderById
    const isNew = !po.createdAt
    if (isNew) {
      await apiRequest('/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(po),
      })
      return
    }

    // For possibly existing POs, check then update or create
    let existingPO = null
    if (po.id) {
      try {
        existingPO = await getPurchaseOrderById(po.id)
      } catch {
        existingPO = null
      }
    }

    if (existingPO) {
      await apiRequest(`/purchase-orders/${po.id}`, {
        method: 'PUT',
        body: JSON.stringify(po),
      })
    } else {
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
export async function getAllInvoices(): Promise<Invoice[]> {
  try {
    return await apiRequest<Invoice[]>('/invoices') || []
  } catch (error) {
    console.error('Failed to get invoices:', error)
    return []
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
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

export async function saveInvoice(invoice: Invoice): Promise<void> {
  try {
    // New invoices (no createdAt) don't exist yet — POST directly to avoid 404 from getInvoiceById
    const isNew = !invoice.createdAt
    if (isNew) {
      await apiRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoice),
      })
      return
    }

    // For possibly existing invoices, check then update or create
    if (invoice.id) {
      const existing = await getInvoiceById(invoice.id)
      if (existing) {
        await apiRequest(`/invoices/${invoice.id}`, {
          method: 'PUT',
          body: JSON.stringify(invoice),
        })
        return
      }
    }
    // No ID or not found — create
    await apiRequest('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    })
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
    const response = await fetchWithTimeout(`${API_BASE_URL}/uploads/branding/check`)
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

  const response = await fetchWithTimeout(`${API_BASE_URL}/uploads`, {
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

  const response = await fetchWithTimeout(`${API_BASE_URL}/uploads`, {
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
export async function getAllPayslips(): Promise<Payslip[]> {
  try {
    return await apiRequest<Payslip[]>('/payslips') || []
  } catch (error: any) {
    console.error('Failed to get payslips:', error)
    // Return empty array on error instead of throwing
    return []
  }
}

export async function getPayslipById(id: string): Promise<Payslip | null> {
  try {
    const url = `${API_BASE_URL}/payslips/${id}`
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json' },
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

export async function getPayslipsByMonth(month: string): Promise<Payslip[]> {
  try {
    return await apiRequest<Payslip[]>(`/payslips/month/${month}`) || []
  } catch (error) {
    console.error('Failed to get payslips by month:', error)
    return []
  }
}

export async function savePayslip(payslip: Payslip): Promise<void> {
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
export async function getAllVehicleTransactions(vehicleId?: string, month?: string): Promise<VehicleTransaction[]> {
  try {
    let url = '/vehicle-transactions'
    const params = new URLSearchParams()
    if (vehicleId) params.append('vehicleId', vehicleId)
    if (month) params.append('month', month)
    if (params.toString()) {
      url += `?${params.toString()}`
    }
    return await apiRequest<VehicleTransaction[]>(url) || []
  } catch (error) {
    console.error('Failed to get vehicle transactions:', error)
    return []
  }
}

export async function getVehicleTransactionById(id: string): Promise<VehicleTransaction | null> {
  try {
    return await apiRequest<VehicleTransaction>(`/vehicle-transactions/${id}`)
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

export async function saveVehicleTransaction(transaction: VehicleTransaction): Promise<void> {
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

export async function getVehicleProfitability(vehicleId: string): Promise<any | null> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/vehicles/${vehicleId}/profitability`,
      { headers: { 'Content-Type': 'application/json' } }
    )
    if (response.status === 404) return null
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const err = await response.json()
        errorMessage = err.error || err.message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    return await response.json()
  } catch (error: any) {
    if (error?.message === 'Request timeout' || error?.name === 'AbortError') throw error
    if (error?.status === 404 || error?.message?.includes('404') || error?.message?.toLowerCase().includes('not found')) {
      return null
    }
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
export async function getAllExpenseCategories(): Promise<ExpenseCategory[]> {
  try {
    return await apiRequest<ExpenseCategory[]>('/expense-categories') || []
  } catch (error) {
    console.error('Failed to get expense categories:', error)
    return []
  }
}

export async function getExpenseCategoryById(id: string): Promise<ExpenseCategory | null> {
  try {
    return await apiRequest<ExpenseCategory>(`/expense-categories/${id}`)
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

export async function saveExpenseCategory(category: ExpenseCategory): Promise<void> {
  try {
    // If no createdAt, this is a new category - POST directly without checking if it exists
    const isNew = !category.createdAt
    if (isNew) {
      await apiRequest('/expense-categories', {
        method: 'POST',
        body: JSON.stringify(category),
      })
      return
    }

    // Existing category - check if it exists and update, otherwise create
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

