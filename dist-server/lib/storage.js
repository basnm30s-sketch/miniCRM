"use strict";
/**
 * Storage utility - API client wrapper
 * Provides same interface as before but uses backend API instead of localStorage
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.getNextQuoteNumber = getNextQuoteNumber;
exports.generateQuoteNumber = generateQuoteNumber;
exports.getAdminSettings = getAdminSettings;
exports.saveAdminSettings = saveAdminSettings;
exports.initializeAdminSettings = initializeAdminSettings;
exports.getAllQuotes = getAllQuotes;
exports.getQuoteById = getQuoteById;
exports.saveQuote = saveQuote;
exports.deleteQuote = deleteQuote;
exports.getAllCustomers = getAllCustomers;
exports.getCustomerById = getCustomerById;
exports.saveCustomer = saveCustomer;
exports.deleteCustomer = deleteCustomer;
exports.getAllVehicles = getAllVehicles;
exports.getVehicleById = getVehicleById;
exports.saveVehicle = saveVehicle;
exports.deleteVehicle = deleteVehicle;
exports.getAllVendors = getAllVendors;
exports.getVendorById = getVendorById;
exports.saveVendor = saveVendor;
exports.deleteVendor = deleteVendor;
exports.getAllEmployees = getAllEmployees;
exports.getEmployeeById = getEmployeeById;
exports.saveEmployee = saveEmployee;
exports.deleteEmployee = deleteEmployee;
exports.getAllPayslips = getAllPayslips;
exports.getPayslipById = getPayslipById;
exports.getPayslipsByMonth = getPayslipsByMonth;
exports.savePayslip = savePayslip;
exports.deletePayslip = deletePayslip;
exports.updatePayslipStatus = updatePayslipStatus;
exports.getAllPurchaseOrders = getAllPurchaseOrders;
exports.getPurchaseOrderById = getPurchaseOrderById;
exports.savePurchaseOrder = savePurchaseOrder;
exports.deletePurchaseOrder = deletePurchaseOrder;
exports.getAllInvoices = getAllInvoices;
exports.getInvoiceById = getInvoiceById;
exports.saveInvoice = saveInvoice;
exports.deleteInvoice = deleteInvoice;
exports.getNextInvoiceNumber = getNextInvoiceNumber;
exports.generateInvoiceNumber = generateInvoiceNumber;
exports.convertQuoteToInvoice = convertQuoteToInvoice;
exports.initializeSampleData = initializeSampleData;
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
const apiClient = __importStar(require("./api-client"));
// Helper to generate unique IDs
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
// Helper to get and increment quote counter
async function getNextQuoteNumber() {
    const settings = await getAdminSettings();
    const startingNumber = settings?.quoteStartingNumber || 1;
    // Get all existing quotes to find the highest number
    const allQuotes = await getAllQuotes();
    let maxNumber = startingNumber - 1;
    // Extract numbers from existing quote numbers (format: Quote-XXX)
    allQuotes.forEach(quote => {
        const match = quote.number.match(/^Quote-(\d+)$/i);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
                maxNumber = num;
            }
        }
    });
    const nextNumber = maxNumber + 1;
    return `Quote-${String(nextNumber).padStart(3, '0')}`;
}
// Legacy function for backward compatibility - now uses sequential counter
async function generateQuoteNumber(pattern) {
    return getNextQuoteNumber();
}
// --- AdminSettings ---
async function getAdminSettings() {
    return apiClient.getAdminSettings();
}
async function saveAdminSettings(settings) {
    await apiClient.saveAdminSettings(settings);
}
async function initializeAdminSettings() {
    const existing = await getAdminSettings();
    if (existing)
        return existing;
    const defaults = {
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
        // By default, keep all doc types aligned until user customizes.
        defaultInvoiceTerms: `1. This quotation is valid for 30 days from the date of issue.\n2. Goods remain the property of the company until full payment is received.\n3. Any additional costs such as tolls, fines or damages are not included unless stated.\n4. Payment terms: as agreed in the contract.`,
        defaultPurchaseOrderTerms: `1. This quotation is valid for 30 days from the date of issue.\n2. Goods remain the property of the company until full payment is received.\n3. Any additional costs such as tolls, fines or damages are not included unless stated.\n4. Payment terms: as agreed in the contract.`,
        showRevenueTrend: false,
        showQuickActions: false,
        showReports: false,
        showQuotationsTwoPane: true,
        showPurchaseOrdersTwoPane: true,
        showInvoicesTwoPane: true,
        createdAt: new Date().toISOString(),
    };
    await saveAdminSettings(defaults);
    return defaults;
}
// --- Quotes ---
async function getAllQuotes() {
    return apiClient.getAllQuotes();
}
async function getQuoteById(id) {
    return apiClient.getQuoteById(id);
}
async function saveQuote(quote) {
    return apiClient.saveQuote(quote);
}
async function deleteQuote(id) {
    await apiClient.deleteQuote(id);
}
// --- Customers ---
async function getAllCustomers() {
    return apiClient.getAllCustomers();
}
async function getCustomerById(id) {
    return apiClient.getCustomerById(id);
}
async function saveCustomer(customer, isUpdate) {
    await apiClient.saveCustomer(customer, isUpdate);
}
async function deleteCustomer(id) {
    await apiClient.deleteCustomer(id);
}
// --- Vehicles ---
async function getAllVehicles() {
    return apiClient.getAllVehicles();
}
async function getVehicleById(id) {
    return apiClient.getVehicleById(id);
}
async function saveVehicle(vehicle) {
    await apiClient.saveVehicle(vehicle);
}
async function deleteVehicle(id) {
    await apiClient.deleteVehicle(id);
}
// --- Vendors ---
async function getAllVendors() {
    return apiClient.getAllVendors();
}
async function getVendorById(id) {
    return apiClient.getVendorById(id);
}
async function saveVendor(vendor) {
    await apiClient.saveVendor(vendor);
}
async function deleteVendor(id) {
    await apiClient.deleteVendor(id);
}
// --- Employees ---
async function getAllEmployees() {
    return apiClient.getAllEmployees();
}
async function getEmployeeById(id) {
    return apiClient.getEmployeeById(id);
}
async function saveEmployee(employee) {
    await apiClient.saveEmployee(employee);
}
async function deleteEmployee(id) {
    await apiClient.deleteEmployee(id);
}
// --- Payslips ---
async function getAllPayslips() {
    return apiClient.getAllPayslips();
}
async function getPayslipById(id) {
    return apiClient.getPayslipById(id);
}
async function getPayslipsByMonth(month) {
    return apiClient.getPayslipsByMonth(month);
}
async function savePayslip(payslip) {
    await apiClient.savePayslip(payslip);
}
async function deletePayslip(id) {
    await apiClient.deletePayslip(id);
}
async function updatePayslipStatus(id, status) {
    await apiClient.updatePayslipStatus(id, status);
}
// --- Purchase Orders ---
async function getAllPurchaseOrders() {
    return apiClient.getAllPurchaseOrders();
}
async function getPurchaseOrderById(id) {
    return apiClient.getPurchaseOrderById(id);
}
async function savePurchaseOrder(po) {
    await apiClient.savePurchaseOrder(po);
}
async function deletePurchaseOrder(id) {
    await apiClient.deletePurchaseOrder(id);
}
// --- Invoices ---
// --- Invoices ---
// Invoice and InvoiceItem are imported from @/lib/types
async function getAllInvoices() {
    return apiClient.getAllInvoices();
}
async function getInvoiceById(id) {
    return apiClient.getInvoiceById(id);
}
async function saveInvoice(invoice) {
    await apiClient.saveInvoice(invoice);
}
async function deleteInvoice(id) {
    await apiClient.deleteInvoice(id);
}
// Helper to get and increment invoice counter
async function getNextInvoiceNumber() {
    const settings = await getAdminSettings();
    const startingNumber = settings?.invoiceStartingNumber || 1;
    // Get all existing invoices to find the highest number
    const allInvoices = await getAllInvoices();
    let maxNumber = startingNumber - 1;
    // Extract numbers from existing invoice numbers (format: Invoice-XXX)
    allInvoices.forEach(invoice => {
        const match = invoice.number.match(/^Invoice-(\d+)$/i);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
                maxNumber = num;
            }
        }
    });
    const nextNumber = maxNumber + 1;
    return `Invoice-${String(nextNumber).padStart(3, '0')}`;
}
// Legacy function for backward compatibility - now uses sequential counter
async function generateInvoiceNumber(pattern) {
    return getNextInvoiceNumber();
}
// Convert Quote to Invoice format
async function convertQuoteToInvoice(quote) {
    // Validate quote has required data
    if (!quote.customer || !quote.customer.id || quote.customer.id.trim() === '') {
        throw new Error('Quote must have a valid customer to convert to invoice. The customer may have been deleted from the database.');
    }
    if (!quote.items || quote.items.length === 0) {
        throw new Error('Quote must have at least one item to convert to invoice');
    }
    // Convert QuoteLineItems to InvoiceItems
    const invoiceItems = quote.items.map((quoteItem) => {
        const lineSubtotal = quoteItem.quantity * quoteItem.unitPrice;
        const lineTax = (lineSubtotal * quoteItem.taxPercent) / 100;
        const lineTotal = lineSubtotal + lineTax;
        return {
            id: generateId(),
            description: quoteItem.vehicleTypeLabel || '',
            quantity: quoteItem.quantity,
            unitPrice: quoteItem.unitPrice,
            tax: lineTax,
            total: lineTotal,
        };
    });
    // Calculate totals
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const tax = invoiceItems.reduce((sum, item) => sum + (item.tax || 0), 0);
    const total = subtotal + tax;
    // Create invoice
    const invoiceNumber = await getNextInvoiceNumber();
    const invoice = {
        id: generateId(),
        number: invoiceNumber,
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
    };
    return invoice;
}
// Initialize sample data on first load
async function initializeSampleData() {
    const vehicles = await getAllVehicles();
    if (vehicles.length === 0) {
        const sampleVehicles = [
            { id: generateId(), vehicleNumber: 'PKT-001', vehicleType: 'Pickup Truck', description: 'Standard pickup truck', basePrice: 500 },
            { id: generateId(), vehicleNumber: 'SED-001', vehicleType: 'Sedan', description: 'Sedan car', basePrice: 300 },
            { id: generateId(), vehicleNumber: 'SUV-001', vehicleType: 'SUV', description: 'Sport Utility Vehicle', basePrice: 400 },
            { id: generateId(), vehicleNumber: 'LOR-001', vehicleType: 'Lorry', description: 'Heavy duty truck', basePrice: 800 },
            { id: generateId(), vehicleNumber: 'VAN-001', vehicleType: 'Van', description: 'Commercial van', basePrice: 600 },
        ];
        for (const vehicle of sampleVehicles) {
            await saveVehicle(vehicle);
        }
    }
    const customers = await getAllCustomers();
    if (customers.length === 0) {
        const sampleCustomers = [
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
        ];
        for (const customer of sampleCustomers) {
            await saveCustomer(customer);
        }
    }
}
// --- Vehicle Transactions ---
async function getAllVehicleTransactions(vehicleId, month) {
    return apiClient.getAllVehicleTransactions(vehicleId, month);
}
async function getVehicleTransactionById(id) {
    return apiClient.getVehicleTransactionById(id);
}
async function saveVehicleTransaction(transaction) {
    await apiClient.saveVehicleTransaction(transaction);
}
async function deleteVehicleTransaction(id) {
    await apiClient.deleteVehicleTransaction(id);
}
async function getVehicleProfitability(vehicleId) {
    return apiClient.getVehicleProfitability(vehicleId);
}
async function getVehicleFinanceDashboard() {
    return apiClient.getVehicleFinanceDashboard();
}
// --- Expense Categories ---
async function getAllExpenseCategories() {
    return apiClient.getAllExpenseCategories();
}
async function getExpenseCategoryById(id) {
    return apiClient.getExpenseCategoryById(id);
}
async function saveExpenseCategory(category) {
    await apiClient.saveExpenseCategory(category);
}
async function deleteExpenseCategory(id) {
    await apiClient.deleteExpenseCategory(id);
}
