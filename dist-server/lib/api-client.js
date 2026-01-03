"use strict";
/**
 * API Client for Frontend
 * Provides functions matching storage.ts API but calls backend API endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
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
async function apiRequest(endpoint, options) {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });
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
        const url = `${API_BASE_URL}/customers/${id}`;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
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
async function saveCustomer(customer) {
    try {
        // Check if customer exists by trying to get it
        let existingCustomer = null;
        if (customer.id) {
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
            await apiRequest(`/customers/${customer.id}`, {
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
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
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
        // Check if vendor exists by trying to get it
        let existingVendor = null;
        if (vendor.id) {
            try {
                existingVendor = await getVendorById(vendor.id);
            }
            catch (error) {
                // Vendor doesn't exist, will create new one
                existingVendor = null;
            }
        }
        if (existingVendor) {
            // Update existing vendor
            await apiRequest(`/vendors/${vendor.id}`, {
                method: 'PUT',
                body: JSON.stringify(vendor),
            });
        }
        else {
            // Create new vendor
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
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
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
        // Check if employee exists by trying to get it
        let existingEmployee = null;
        if (employee.id) {
            try {
                existingEmployee = await getEmployeeById(employee.id);
            }
            catch (error) {
                // Employee doesn't exist, will create new one
                existingEmployee = null;
            }
        }
        if (existingEmployee) {
            // Update existing employee
            await apiRequest(`/employees/${employee.id}`, {
                method: 'PUT',
                body: JSON.stringify(employee),
            });
        }
        else {
            // Create new employee
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
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
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
        // Check if vehicle exists by trying to get it
        let existingVehicle = null;
        if (vehicle.id) {
            try {
                existingVehicle = await getVehicleById(vehicle.id);
            }
            catch (error) {
                // Vehicle doesn't exist, will create new one
                existingVehicle = null;
            }
        }
        if (existingVehicle) {
            // Update existing vehicle
            await apiRequest(`/vehicles/${vehicle.id}`, {
                method: 'PUT',
                body: JSON.stringify(vehicle),
            });
        }
        else {
            // Create new vehicle
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
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
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
        // Check if quote exists by trying to get it
        let existingQuote = null;
        if (quote.id) {
            existingQuote = await getQuoteById(quote.id);
            // getQuoteById returns null if not found, doesn't throw
        }
        if (existingQuote) {
            // Update existing quote
            await apiRequest(`/quotes/${quote.id}`, {
                method: 'PUT',
                body: JSON.stringify(quote),
            });
        }
        else {
            // Create new quote
            await apiRequest('/quotes', {
                method: 'POST',
                body: JSON.stringify(quote),
            });
        }
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
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
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
        // Check if purchase order exists by trying to get it
        let existingPO = null;
        if (po.id) {
            try {
                existingPO = await getPurchaseOrderById(po.id);
            }
            catch (error) {
                // Purchase order doesn't exist, will create new one
                existingPO = null;
            }
        }
        if (existingPO) {
            // Update existing purchase order
            await apiRequest(`/purchase-orders/${po.id}`, {
                method: 'PUT',
                body: JSON.stringify(po),
            });
        }
        else {
            // Create new purchase order
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
        // If invoice has an ID, check if it exists first
        if (invoice.id) {
            const existing = await getInvoiceById(invoice.id);
            if (existing) {
                // Invoice exists, update it
                await apiRequest(`/invoices/${invoice.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(invoice),
                });
                return;
            }
            // Invoice doesn't exist, create it
            await apiRequest('/invoices', {
                method: 'POST',
                body: JSON.stringify(invoice),
            });
            return;
        }
        else {
            // No ID, always create new invoice
            await apiRequest('/invoices', {
                method: 'POST',
                body: JSON.stringify(invoice),
            });
        }
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
        const response = await fetch(`${API_BASE_URL}/uploads/branding/check`);
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
    const response = await fetch(`${API_BASE_URL}/uploads`, {
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
    const response = await fetch(`${API_BASE_URL}/uploads`, {
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
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
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
        return await apiRequest(`/vehicles/${vehicleId}/profitability`);
    }
    catch (error) {
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
