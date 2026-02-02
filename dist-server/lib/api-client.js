"use strict";
/**
 * API Client for Frontend
 * Provides functions matching storage.ts API but calls backend API endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkApiHealth = checkApiHealth;
exports.waitForApiServer = waitForApiServer;
exports.getAdminSettings = getAdminSettings;
exports.saveAdminSettings = saveAdminSettings;
exports.getAllCustomers = getAllCustomers;
exports.getCustomerById = getCustomerById;
exports.saveCustomer = saveCustomer;
exports.deleteCustomer = deleteCustomer;
exports.getAllVendors = getAllVendors;
exports.getVendorById = getVendorById;
exports.saveVendor = saveVendor;
exports.deleteVendor = deleteVendor;
exports.getAllEmployees = getAllEmployees;
exports.getEmployeeById = getEmployeeById;
exports.saveEmployee = saveEmployee;
exports.deleteEmployee = deleteEmployee;
exports.getAllVehicles = getAllVehicles;
exports.getVehicleById = getVehicleById;
exports.saveVehicle = saveVehicle;
exports.deleteVehicle = deleteVehicle;
exports.getAllQuotes = getAllQuotes;
exports.getQuoteById = getQuoteById;
exports.saveQuote = saveQuote;
exports.deleteQuote = deleteQuote;
exports.getAllPurchaseOrders = getAllPurchaseOrders;
exports.getPurchaseOrderById = getPurchaseOrderById;
exports.savePurchaseOrder = savePurchaseOrder;
exports.deletePurchaseOrder = deletePurchaseOrder;
exports.getAllInvoices = getAllInvoices;
exports.getInvoiceById = getInvoiceById;
exports.saveInvoice = saveInvoice;
exports.deleteInvoice = deleteInvoice;
exports.checkBrandingFiles = checkBrandingFiles;
exports.getBrandingUrl = getBrandingUrl;
exports.loadBrandingUrls = loadBrandingUrls;
exports.uploadBrandingFile = uploadBrandingFile;
exports.uploadFile = uploadFile;
exports.getFileUrl = getFileUrl;
exports.getAllPayslips = getAllPayslips;
exports.getPayslipById = getPayslipById;
exports.getPayslipsByMonth = getPayslipsByMonth;
exports.savePayslip = savePayslip;
exports.deletePayslip = deletePayslip;
exports.updatePayslipStatus = updatePayslipStatus;
exports.getAllVehicleTransactions = getAllVehicleTransactions;
exports.getVehicleTransactionById = getVehicleTransactionById;
exports.saveVehicleTransaction = saveVehicleTransaction;
exports.deleteVehicleTransaction = deleteVehicleTransaction;
exports.getVehicleProfitability = getVehicleProfitability;
exports.getVehicleFinanceDashboard = getVehicleFinanceDashboard;
exports.getAllExpenseCategories = getAllExpenseCategories;
exports.getExpenseCategoryById = getExpenseCategoryById;
exports.saveExpenseCategory = saveExpenseCategory;
exports.deleteExpenseCategory = deleteExpenseCategory;
// Use relative paths for Vercel/Next.js API routes, or explicit URL for Express server
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api' : 'http://localhost:3001/api');
// Connection status tracking
let lastHealthCheck = 0;
let isServerHealthy = null;
const HEALTH_CHECK_CACHE_MS = 2000; // Cache health check for 2 seconds
/**
 * Check if API server is healthy
 * Uses cached result for 2 seconds to avoid excessive requests
 */
async function checkApiHealth() {
    const now = Date.now();
    // Return cached result if recent
    if (isServerHealthy !== null && (now - lastHealthCheck) < HEALTH_CHECK_CACHE_MS) {
        return isServerHealthy;
    }
    try {
        const url = `${API_BASE_URL}/health`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        clearTimeout(timeoutId);
        const isHealthy = response.ok;
        isServerHealthy = isHealthy;
        lastHealthCheck = now;
        return isHealthy;
    }
    catch (error) {
        isServerHealthy = false;
        lastHealthCheck = now;
        return false;
    }
}
/**
 * Wait for API server to be ready with retry logic
 * @param maxRetries Maximum number of retry attempts
 * @param retryDelayMs Delay between retries in milliseconds
 */
async function waitForApiServer(maxRetries = 5, retryDelayMs = 500) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const isHealthy = await checkApiHealth();
        if (isHealthy) {
            return true;
        }
        if (attempt < maxRetries) {
            // Exponential backoff: delay increases with each attempt
            const delay = retryDelayMs * Math.pow(1.5, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    return false;
}
const DEFAULT_REQUEST_TIMEOUT_MS = 8000;
/**
 * fetch with AbortController-based timeout to avoid hanging when server is unresponsive.
 * @param url URL to fetch
 * @param init Optional RequestInit (method, headers, body, etc.)
 * @param timeoutMs Timeout in ms (default 8000). Set to 0 to disable.
 */
async function fetchWithTimeout(url, init, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
    const controller = timeoutMs > 0 ? new AbortController() : null;
    const timeoutId = controller && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        const response = await fetch(url, {
            ...init,
            signal: init?.signal ?? controller?.signal,
        });
        if (timeoutId)
            clearTimeout(timeoutId);
        return response;
    }
    catch (error) {
        if (timeoutId)
            clearTimeout(timeoutId);
        if (error?.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}
async function apiRequest(endpoint, options) {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
        // Avoid requests hanging forever (common when local backend is stuck).
        // Use existing signal if provided; otherwise attach a timeout signal.
        const controller = options?.signal ? null : new AbortController();
        const timeoutMs = typeof options?.signal === 'undefined'
            ? 8000
            : 0;
        const timeoutId = controller && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
        const response = await fetch(url, {
            ...options,
            signal: options?.signal ?? controller?.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });
        if (timeoutId)
            clearTimeout(timeoutId);
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            }
            catch {
                // If response is not JSON, use status text
                errorMessage = response.statusText || errorMessage;
            }
            // Don't log 404 errors as they're expected in some cases (checking if resource exists)
            if (response.status !== 404) {
                console.error(`API Request failed: ${options?.method || 'GET'} ${url} - ${errorMessage}`);
            }
            const error = new Error(errorMessage);
            error.status = response.status;
            throw error;
        }
        if (response.status === 204) {
            return undefined;
        }
        return response.json();
    }
    catch (error) {
        if (error?.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        // Re-throw with more context
        if (error.message && !error.message.includes('Network error')) {
            // Don't log 404 errors as they're expected in some cases
            if (error.status !== 404) {
                console.error(`API Request error for ${url}:`, error.message);
            }
            throw error;
        }
        throw new Error(`Network error: ${error.message || 'Failed to connect to server'}`);
    }
}
// ==================== ADMIN SETTINGS ====================
async function getAdminSettings() {
    try {
        return await apiRequest('/admin/settings');
    }
    catch (error) {
        console.error('Failed to get admin settings:', error);
        return null;
    }
}
async function saveAdminSettings(settings) {
    try {
        await apiRequest('/admin/settings', {
            method: 'POST',
            body: JSON.stringify(settings),
        });
    }
    catch (error) {
        console.error('Failed to save admin settings:', error);
        throw error;
    }
}
// ==================== CUSTOMERS ====================
async function getAllCustomers() {
    try {
        return await apiRequest('/customers') || [];
    }
    catch (error) {
        console.error('Failed to get customers:', error);
        return [];
    }
}
async function getCustomerById(id) {
    try {
        // Remove trailing slash if present and ensure no double slashes
        const cleanId = id.replace(/\/$/, '');
        const url = `${API_BASE_URL}/customers/${cleanId}`;
        const response = await fetchWithTimeout(url, {
            headers: { 'Content-Type': 'application/json' },
        });
        // Handle 404 as expected - return null instead of throwing
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            }
            catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        return await response.json();
    }
    catch (error) {
        // Only log unexpected errors (not 404s)
        if (error.message && !error.message.includes('404') && !error.message.includes('Not Found') && !error.message.includes('not found')) {
            console.error('Failed to get customer:', error);
        }
        // Return null for any error (including 404)
        return null;
    }
}
async function saveCustomer(customer, isUpdate) {
    try {
        // If isUpdate flag is provided, use it directly
        // Otherwise, check if customer exists by trying to get it
        let existingCustomer = null;
        if (isUpdate === true) {
            // Explicitly an update
            existingCustomer = { id: customer.id }; // Dummy object to trigger update path
        }
        else if (isUpdate === false) {
            // Explicitly a create - skip existence check
            existingCustomer = null;
        }
        else if (customer.id) {
            // Auto-detect: silently check if customer exists (don't log 404 errors)
            try {
                existingCustomer = await getCustomerById(customer.id);
            }
            catch (error) {
                // Customer doesn't exist, will create new one
                existingCustomer = null;
            }
        }
        if (existingCustomer) {
            // Update existing customer
            const cleanId = customer.id.replace(/\/$/, '');
            await apiRequest(`/customers/${cleanId}`, {
                method: 'PUT',
                body: JSON.stringify(customer),
            });
        }
        else {
            // Create new customer
            await apiRequest('/customers', {
                method: 'POST',
                body: JSON.stringify(customer),
            });
        }
    }
    catch (error) {
        console.error('Failed to save customer:', error);
        throw error;
    }
}
async function deleteCustomer(id) {
    try {
        await apiRequest(`/customers/${id}`, {
            method: 'DELETE',
        });
    }
    catch (error) {
        console.error('Failed to delete customer:', error);
        throw error;
    }
}
// ==================== VENDORS ====================
async function getAllVendors() {
    try {
        return await apiRequest('/vendors') || [];
    }
    catch (error) {
        console.error('Failed to get vendors:', error);
        return [];
    }
}
async function getVendorById(id) {
    try {
        const url = `${API_BASE_URL}/vendors/${id}`;
        const response = await fetchWithTimeout(url, {
            headers: { 'Content-Type': 'application/json' },
        });
        // Handle 404 as expected - return null instead of throwing
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            }
            catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        return await response.json();
    }
    catch (error) {
        // Only log unexpected errors (not 404s)
        if (error.message && !error.message.includes('404') && !error.message.includes('Not Found') && !error.message.includes('not found')) {
            console.error('Failed to get vendor:', error);
        }
        // Return null for any error (including 404)
        return null;
    }
}
async function saveVendor(vendor) {
    try {
        // New vendors (no createdAt) don't exist yet — POST directly to avoid 404 from getVendorById
        const isNew = !vendor.createdAt;
        if (isNew) {
            await apiRequest('/vendors', {
                method: 'POST',
                body: JSON.stringify(vendor),
            });
            return;
        }
        // For possibly existing vendors, check then update or create
        let existingVendor = null;
        if (vendor.id) {
            try {
                existingVendor = await getVendorById(vendor.id);
            }
            catch {
                existingVendor = null;
            }
        }
        if (existingVendor) {
            await apiRequest(`/vendors/${vendor.id}`, {
                method: 'PUT',
                body: JSON.stringify(vendor),
            });
        }
        else {
            await apiRequest('/vendors', {
                method: 'POST',
                body: JSON.stringify(vendor),
            });
        }
    }
    catch (error) {
        console.error('Failed to save vendor:', error);
        throw error;
    }
}
async function deleteVendor(id) {
    try {
        await apiRequest(`/vendors/${id}`, {
            method: 'DELETE',
        });
    }
    catch (error) {
        console.error('Failed to delete vendor:', error);
        throw error;
    }
}
// ==================== EMPLOYEES ====================
async function getAllEmployees() {
    try {
        return await apiRequest('/employees') || [];
    }
    catch (error) {
        console.error('Failed to get employees:', error);
        return [];
    }
}
async function getEmployeeById(id) {
    try {
        const url = `${API_BASE_URL}/employees/${id}`;
        const response = await fetchWithTimeout(url, {
            headers: { 'Content-Type': 'application/json' },
        });
        // Handle 404 as expected - return null instead of throwing
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            }
            catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        return await response.json();
    }
    catch (error) {
        // Only log unexpected errors (not 404s)
        if (error.message && !error.message.includes('404') && !error.message.includes('Not Found')) {
            console.error('Failed to get employee:', error);
        }
        // Return null for any error (including 404)
        return null;
    }
}
async function saveEmployee(employee) {
    try {
        // New employees (no createdAt) don't exist yet — POST directly to avoid 404 from getEmployeeById
        const isNew = !employee.createdAt;
        if (isNew) {
            await apiRequest('/employees', {
                method: 'POST',
                body: JSON.stringify(employee),
            });
            return;
        }
        // For possibly existing employees, check then update or create
        let existingEmployee = null;
        if (employee.id) {
            try {
                existingEmployee = await getEmployeeById(employee.id);
            }
            catch {
                existingEmployee = null;
            }
        }
        if (existingEmployee) {
            await apiRequest(`/employees/${employee.id}`, {
                method: 'PUT',
                body: JSON.stringify(employee),
            });
        }
        else {
            await apiRequest('/employees', {
                method: 'POST',
                body: JSON.stringify(employee),
            });
        }
    }
    catch (error) {
        console.error('Failed to save employee:', error);
        throw error;
    }
}
async function deleteEmployee(id) {
    try {
        await apiRequest(`/employees/${id}`, {
            method: 'DELETE',
        });
    }
    catch (error) {
        console.error('Failed to delete employee:', error);
        throw error;
    }
}
// ==================== VEHICLES ====================
async function getAllVehicles() {
    try {
        return await apiRequest('/vehicles') || [];
    }
    catch (error) {
        console.error('Failed to get vehicles:', error);
        return [];
    }
}
async function getVehicleById(id) {
    try {
        const url = `${API_BASE_URL}/vehicles/${id}`;
        const response = await fetchWithTimeout(url, {
            headers: { 'Content-Type': 'application/json' },
        });
        // Handle 404 as expected - return null instead of throwing
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            }
            catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        return await response.json();
    }
    catch (error) {
        // Only log unexpected errors (not 404s)
        if (error.message && !error.message.includes('404') && !error.message.includes('Not Found') && !error.message.includes('not found')) {
            console.error('Failed to get vehicle:', error);
        }
        // Return null for any error (including 404)
        return null;
    }
}
async function saveVehicle(vehicle) {
    try {
        // New vehicles (no createdAt) don't exist yet — POST directly to avoid 404 from getVehicleById
        const isNew = !vehicle.createdAt;
        if (isNew) {
            await apiRequest('/vehicles', {
                method: 'POST',
                body: JSON.stringify(vehicle),
            });
            return;
        }
        // For possibly existing vehicles, check then update or create
        let existingVehicle = null;
        if (vehicle.id) {
            try {
                existingVehicle = await getVehicleById(vehicle.id);
            }
            catch {
                existingVehicle = null;
            }
        }
        if (existingVehicle) {
            await apiRequest(`/vehicles/${vehicle.id}`, {
                method: 'PUT',
                body: JSON.stringify(vehicle),
            });
        }
        else {
            await apiRequest('/vehicles', {
                method: 'POST',
                body: JSON.stringify(vehicle),
            });
        }
    }
    catch (error) {
        console.error('Failed to save vehicle:', error);
        throw error;
    }
}
async function deleteVehicle(id) {
    try {
        await apiRequest(`/vehicles/${id}`, {
            method: 'DELETE',
        });
    }
    catch (error) {
        console.error('Failed to delete vehicle:', error);
        throw error;
    }
}
// ==================== QUOTES ====================
async function getAllQuotes() {
    try {
        return await apiRequest('/quotes') || [];
    }
    catch (error) {
        console.error('Failed to get quotes:', error);
        return [];
    }
}
async function getQuoteById(id) {
    try {
        const url = `${API_BASE_URL}/quotes/${id}`;
        const response = await fetchWithTimeout(url, {
            headers: { 'Content-Type': 'application/json' },
        });
        // Handle 404 as expected - return null instead of throwing
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            }
            catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        return await response.json();
    }
    catch (error) {
        // Only log unexpected errors (not 404s)
        if (error.message && !error.message.includes('404') && !error.message.includes('Not Found') && !error.message.includes('not found')) {
            console.error('Failed to get quote:', error);
        }
        // Return null for any error (including 404)
        return null;
    }
}
async function saveQuote(quote) {
    try {
        // New quotes (no createdAt) don't exist yet — POST directly to avoid 404 from getQuoteById
        const isNew = !quote.createdAt;
        if (isNew) {
            return await apiRequest('/quotes', {
                method: 'POST',
                body: JSON.stringify(quote),
            });
        }
        // For possibly existing quotes, check then update or create
        let existingQuote = null;
        if (quote.id) {
            existingQuote = await getQuoteById(quote.id);
        }
        if (existingQuote) {
            return await apiRequest(`/quotes/${quote.id}`, {
                method: 'PUT',
                body: JSON.stringify(quote),
            });
        }
        return await apiRequest('/quotes', {
            method: 'POST',
            body: JSON.stringify(quote),
        });
    }
    catch (error) {
        console.error('Failed to save quote:', error);
        throw error;
    }
}
async function deleteQuote(id) {
    try {
        await apiRequest(`/quotes/${id}`, {
            method: 'DELETE',
        });
    }
    catch (error) {
        console.error('Failed to delete quote:', error);
        throw error;
    }
}
// ==================== PURCHASE ORDERS ====================
async function getAllPurchaseOrders() {
    try {
        return await apiRequest('/purchase-orders') || [];
    }
    catch (error) {
        console.error('Failed to get purchase orders:', error);
        return [];
    }
}
async function getPurchaseOrderById(id) {
    try {
        const url = `${API_BASE_URL}/purchase-orders/${id}`;
        const response = await fetchWithTimeout(url, {
            headers: { 'Content-Type': 'application/json' },
        });
        // Handle 404 as expected - return null instead of throwing
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            }
            catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        return await response.json();
    }
    catch (error) {
        // Only log unexpected errors (not 404s)
        if (error.message && !error.message.includes('404') && !error.message.includes('Not Found') && !error.message.includes('not found')) {
            console.error('Failed to get purchase order:', error);
        }
        // Return null for any error (including 404)
        return null;
    }
}
async function savePurchaseOrder(po) {
    try {
        // New POs (no createdAt) don't exist yet — POST directly to avoid 404 from getPurchaseOrderById
        const isNew = !po.createdAt;
        if (isNew) {
            await apiRequest('/purchase-orders', {
                method: 'POST',
                body: JSON.stringify(po),
            });
            return;
        }
        // For possibly existing POs, check then update or create
        let existingPO = null;
        if (po.id) {
            try {
                existingPO = await getPurchaseOrderById(po.id);
            }
            catch {
                existingPO = null;
            }
        }
        if (existingPO) {
            await apiRequest(`/purchase-orders/${po.id}`, {
                method: 'PUT',
                body: JSON.stringify(po),
            });
        }
        else {
            await apiRequest('/purchase-orders', {
                method: 'POST',
                body: JSON.stringify(po),
            });
        }
    }
    catch (error) {
        console.error('Failed to save purchase order:', error);
        throw error;
    }
}
async function deletePurchaseOrder(id) {
    try {
        await apiRequest(`/purchase-orders/${id}`, {
            method: 'DELETE',
        });
    }
    catch (error) {
        console.error('Failed to delete purchase order:', error);
        throw error;
    }
}
// ==================== INVOICES ====================
async function getAllInvoices() {
    try {
        return await apiRequest('/invoices') || [];
    }
    catch (error) {
        console.error('Failed to get invoices:', error);
        return [];
    }
}
async function getInvoiceById(id) {
    try {
        return await apiRequest(`/invoices/${id}`);
    }
    catch (error) {
        // Silently handle "not found" errors - this is expected when checking if invoice exists
        if (error.message && (error.message.includes('not found') || error.message.includes('404'))) {
            return null;
        }
        // Only log unexpected errors
        console.error('Failed to get invoice:', error);
        return null;
    }
}
async function saveInvoice(invoice) {
    try {
        // New invoices (no createdAt) don't exist yet — POST directly to avoid 404 from getInvoiceById
        const isNew = !invoice.createdAt;
        if (isNew) {
            await apiRequest('/invoices', {
                method: 'POST',
                body: JSON.stringify(invoice),
            });
            return;
        }
        // For possibly existing invoices, check then update or create
        if (invoice.id) {
            const existing = await getInvoiceById(invoice.id);
            if (existing) {
                await apiRequest(`/invoices/${invoice.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(invoice),
                });
                return;
            }
        }
        // No ID or not found — create
        await apiRequest('/invoices', {
            method: 'POST',
            body: JSON.stringify(invoice),
        });
    }
    catch (error) {
        console.error('Failed to save invoice:', error);
        throw error;
    }
}
async function deleteInvoice(id) {
    try {
        await apiRequest(`/invoices/${id}`, {
            method: 'DELETE',
        });
    }
    catch (error) {
        console.error('Failed to delete invoice:', error);
        throw error;
    }
}
// ==================== FILE UPLOADS ====================
// ==================== BRANDING FILES (SIMPLIFIED) ====================
/**
 * Check which branding files exist
 */
async function checkBrandingFiles() {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/uploads/branding/check`);
        if (!response.ok) {
            console.error('Failed to check branding files:', response.statusText);
            return { logo: false, seal: false, signature: false, extensions: { logo: null, seal: null, signature: null } };
        }
        return await response.json();
    }
    catch (error) {
        console.error('Error checking branding files:', error);
        return { logo: false, seal: false, signature: false, extensions: { logo: null, seal: null, signature: null } };
    }
}
/**
 * Get branding image URL (fixed location)
 */
function getBrandingUrl(type, extension) {
    if (!extension)
        return null;
    return `${API_BASE_URL}/uploads/branding/${type}.${extension}`;
}
/**
 * Load branding URLs for document generation
 * Returns URLs for all branding images that exist
 */
async function loadBrandingUrls() {
    const branding = await checkBrandingFiles();
    return {
        logoUrl: getBrandingUrl('logo', branding.extensions.logo),
        sealUrl: getBrandingUrl('seal', branding.extensions.seal),
        signatureUrl: getBrandingUrl('signature', branding.extensions.signature),
    };
}
/**
 * Upload branding file (logo, seal, or signature)
 * Files are saved to fixed locations - no path returned
 */
async function uploadBrandingFile(file, brandingType) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'branding');
    formData.append('brandingType', brandingType);
    const response = await fetchWithTimeout(`${API_BASE_URL}/uploads`, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) {
        let errorMessage = `Upload failed with status ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        }
        catch {
            // Ignore JSON parse errors
        }
        throw new Error(errorMessage);
    }
    // Success - no need to parse response, files are at fixed locations
}
// ==================== REGULAR FILE UPLOADS ====================
async function uploadFile(file, type) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const response = await fetchWithTimeout(`${API_BASE_URL}/uploads`, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) {
        let errorMessage = `Upload failed with status ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        }
        catch {
            // Ignore JSON parse errors
        }
        throw new Error(errorMessage);
    }
    const result = await response.json();
    if (!result || !result.path) {
        throw new Error('Invalid response from server: missing path');
    }
    return result.path;
}
function getFileUrl(relativePath) {
    if (!relativePath)
        return null;
    // Remove ./ prefix if present and extract type and filename
    const cleanPath = relativePath.startsWith('./') ? relativePath.substring(2) : relativePath;
    const parts = cleanPath.split('/');
    // Handle branding paths: data/branding/logo.png -> /api/uploads/branding/logo.png
    if (parts.length >= 2 && parts[0] === 'data' && parts[1] === 'branding') {
        const filename = parts[parts.length - 1]; // filename (e.g., logo.png)
        return `${API_BASE_URL}/uploads/branding/${filename}`;
    }
    // Handle regular upload paths: data/uploads/type/filename
    if (parts.length >= 3 && parts[0] === 'data' && parts[1] === 'uploads') {
        const type = parts[parts.length - 2]; // type (logos, documents, signatures)
        const filename = parts[parts.length - 1]; // filename
        return `${API_BASE_URL}/uploads/${type}/${filename}`;
    }
    return null;
}
// ==================== PAYSLIPS ====================
async function getAllPayslips() {
    try {
        return await apiRequest('/payslips') || [];
    }
    catch (error) {
        console.error('Failed to get payslips:', error);
        // Return empty array on error instead of throwing
        return [];
    }
}
async function getPayslipById(id) {
    try {
        const url = `${API_BASE_URL}/payslips/${id}`;
        const response = await fetchWithTimeout(url, {
            headers: { 'Content-Type': 'application/json' },
        });
        // Handle 404 as expected - return null instead of throwing
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            }
            catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        return await response.json();
    }
    catch (error) {
        // Only log unexpected errors (not 404s)
        if (error.message && !error.message.includes('404') && !error.message.includes('Not Found')) {
            console.error('Failed to get payslip:', error);
        }
        // Return null for any error (including 404)
        return null;
    }
}
async function getPayslipsByMonth(month) {
    try {
        return await apiRequest(`/payslips/month/${month}`) || [];
    }
    catch (error) {
        console.error('Failed to get payslips by month:', error);
        return [];
    }
}
async function savePayslip(payslip) {
    try {
        // Validate required fields
        if (!payslip.employeeId || !payslip.month) {
            throw new Error('employeeId and month are required fields');
        }
        // For salary calculation workflow, we always create new payslips
        // If payslip has an ID, check if it exists first to decide between PUT and POST
        if (payslip.id) {
            const existingPayslip = await getPayslipById(payslip.id);
            if (existingPayslip) {
                // Update existing payslip
                await apiRequest(`/payslips/${payslip.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payslip),
                });
                return;
            }
            // If not found (null), fall through to create new payslip
        }
        // Create new payslip
        await apiRequest('/payslips', {
            method: 'POST',
            body: JSON.stringify(payslip),
        });
    }
    catch (error) {
        console.error('Failed to save payslip:', error);
        console.error('Payslip data:', JSON.stringify(payslip, null, 2));
        const errorMessage = error?.message || 'Failed to save payslip';
        throw new Error(errorMessage);
    }
}
async function deletePayslip(id) {
    try {
        await apiRequest(`/payslips/${id}`, {
            method: 'DELETE',
        });
    }
    catch (error) {
        console.error('Failed to delete payslip:', error);
        throw error;
    }
}
async function updatePayslipStatus(id, status) {
    try {
        // Get existing payslip first
        const existingPayslip = await getPayslipById(id);
        if (!existingPayslip) {
            throw new Error('Payslip not found');
        }
        // Update only the status field
        await apiRequest(`/payslips/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...existingPayslip,
                status,
            }),
        });
    }
    catch (error) {
        console.error('Failed to update payslip status:', error);
        throw error;
    }
}
// ==================== VEHICLE TRANSACTIONS ====================
async function getAllVehicleTransactions(vehicleId, month) {
    try {
        let url = '/vehicle-transactions';
        const params = new URLSearchParams();
        if (vehicleId)
            params.append('vehicleId', vehicleId);
        if (month)
            params.append('month', month);
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        return await apiRequest(url) || [];
    }
    catch (error) {
        console.error('Failed to get vehicle transactions:', error);
        return [];
    }
}
async function getVehicleTransactionById(id) {
    try {
        return await apiRequest(`/vehicle-transactions/${id}`);
    }
    catch (error) {
        // Handle 404 as expected - transaction doesn't exist
        if (error?.status === 404 ||
            error?.message?.includes('404') ||
            error?.message?.toLowerCase().includes('not found')) {
            return null;
        }
        console.error('Failed to get vehicle transaction:', error);
        throw error;
    }
}
async function saveVehicleTransaction(transaction) {
    try {
        // If transaction has an ID, check if it exists to decide between update and create
        if (transaction.id) {
            const existing = await getVehicleTransactionById(transaction.id);
            if (existing) {
                // Update existing transaction
                await apiRequest(`/vehicle-transactions/${transaction.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(transaction),
                });
                return;
            }
            // If ID exists but transaction doesn't, create it with that ID
        }
        // Create new transaction - POST returns the created transaction
        await apiRequest('/vehicle-transactions', {
            method: 'POST',
            body: JSON.stringify(transaction),
        });
        return;
    }
    catch (error) {
        console.error('Failed to save vehicle transaction:', error);
        throw error;
    }
}
async function deleteVehicleTransaction(id) {
    try {
        await apiRequest(`/vehicle-transactions/${id}`, {
            method: 'DELETE',
        });
    }
    catch (error) {
        console.error('Failed to delete vehicle transaction:', error);
        throw error;
    }
}
async function getVehicleProfitability(vehicleId) {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/vehicles/${vehicleId}/profitability`, { headers: { 'Content-Type': 'application/json' } });
        if (response.status === 404)
            return null;
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const err = await response.json();
                errorMessage = err.error || err.message || errorMessage;
            }
            catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        return await response.json();
    }
    catch (error) {
        if (error?.message === 'Request timeout' || error?.name === 'AbortError')
            throw error;
        if (error?.status === 404 || error?.message?.includes('404') || error?.message?.toLowerCase().includes('not found')) {
            return null;
        }
        console.error('Failed to get vehicle profitability:', error);
        throw error;
    }
}
async function getVehicleFinanceDashboard() {
    try {
        return await apiRequest('/vehicle-finances/dashboard');
    }
    catch (error) {
        // Don't throw for 404, return null instead
        if (error?.status === 404 || error?.message?.includes('404') || error?.message?.toLowerCase().includes('not found')) {
            console.warn('Dashboard endpoint not found, returning empty data');
            return null;
        }
        console.error('Failed to get vehicle finance dashboard:', error);
        throw error;
    }
}
// ==================== EXPENSE CATEGORIES ====================
async function getAllExpenseCategories() {
    try {
        return await apiRequest('/expense-categories') || [];
    }
    catch (error) {
        console.error('Failed to get expense categories:', error);
        return [];
    }
}
async function getExpenseCategoryById(id) {
    try {
        return await apiRequest(`/expense-categories/${id}`);
    }
    catch (error) {
        // Handle 404 as expected - category doesn't exist
        if (error?.status === 404 ||
            error?.message?.includes('404') ||
            error?.message?.toLowerCase().includes('not found')) {
            return null;
        }
        console.error('Failed to get expense category:', error);
        throw error;
    }
}
async function saveExpenseCategory(category) {
    try {
        // If no createdAt, this is a new category - POST directly without checking if it exists
        const isNew = !category.createdAt;
        if (isNew) {
            await apiRequest('/expense-categories', {
                method: 'POST',
                body: JSON.stringify(category),
            });
            return;
        }
        // Existing category - check if it exists and update, otherwise create
        if (category.id) {
            const existing = await getExpenseCategoryById(category.id);
            if (existing) {
                await apiRequest(`/expense-categories/${category.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(category),
                });
                return;
            }
        }
        await apiRequest('/expense-categories', {
            method: 'POST',
            body: JSON.stringify(category),
        });
    }
    catch (error) {
        console.error('Failed to save expense category:', error);
        throw error;
    }
}
async function deleteExpenseCategory(id) {
    try {
        await apiRequest(`/expense-categories/${id}`, {
            method: 'DELETE',
        });
    }
    catch (error) {
        console.error('Failed to delete expense category:', error);
        throw error;
    }
}
