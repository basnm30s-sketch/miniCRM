"use strict";
/**
 * SQLite Adapter
 * Provides CRUD operations for all entities using SQLite database
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoicesAdapter = exports.purchaseOrdersAdapter = exports.quotesAdapter = exports.adminAdapter = exports.vehiclesAdapter = exports.payslipsAdapter = exports.employeesAdapter = exports.vendorsAdapter = exports.customersAdapter = void 0;
exports.formatReferenceError = formatReferenceError;
const database_1 = require("../../lib/database");
// Helper to get database instance
function getDb() {
    return (0, database_1.getDatabase)();
}
// Helper function to format reference error messages
function formatReferenceError(entityName, references) {
    if (references.length === 0)
        return '';
    if (references.length === 1) {
        return `Cannot delete ${entityName} as it is referenced in ${references[0].type} ${references[0].number}`;
    }
    const refList = references.map(r => `- ${r.type} ${r.number}`).join('\n');
    return `Cannot delete ${entityName} as it is referenced in:\n${refList}`;
}
// ==================== CUSTOMERS ====================
exports.customersAdapter = {
    getAll: () => {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM customers ORDER BY createdAt DESC').all();
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            company: row.company || '',
            email: row.email || '',
            phone: row.phone || '',
            address: row.address || '',
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }));
    },
    getById: (id) => {
        const db = getDb();
        const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
        if (!row)
            return null;
        return {
            id: row.id,
            name: row.name,
            company: row.company || '',
            email: row.email || '',
            phone: row.phone || '',
            address: row.address || '',
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    },
    create: (data) => {
        const db = getDb();
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      INSERT INTO customers (id, name, company, email, phone, address, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(data.id, data.name, data.company || '', data.email || '', data.phone || '', data.address || '', now, now);
        return exports.customersAdapter.getById(data.id);
    },
    update: (id, data) => {
        const db = getDb();
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      UPDATE customers 
      SET name = ?, company = ?, email = ?, phone = ?, address = ?, updatedAt = ?
      WHERE id = ?
    `);
        stmt.run(data.name, data.company || '', data.email || '', data.phone || '', data.address || '', now, id);
        return exports.customersAdapter.getById(id);
    },
    delete: (id) => {
        const db = getDb();
        // Check for related quotes
        const quotes = db.prepare('SELECT number FROM quotes WHERE customerId = ?').all(id);
        // Check for related invoices
        const invoices = db.prepare('SELECT number FROM invoices WHERE customerId = ?').all(id);
        // Build references array
        const references = [
            ...quotes.map(q => ({ type: 'Quote', number: q.number })),
            ...invoices.map(i => ({ type: 'Invoice', number: i.number }))
        ];
        if (references.length > 0) {
            throw new Error(formatReferenceError('Customer', references));
        }
        // If no related records, proceed with deletion
        // Wrap in try-catch to handle any database constraint errors as fallback
        try {
            db.prepare('DELETE FROM customers WHERE id = ?').run(id);
        }
        catch (dbError) {
            // If database throws foreign key error, query again to get references
            if (dbError.message && (dbError.message.includes('FOREIGN KEY') || dbError.message.includes('constraint'))) {
                // Re-query to get references (in case they were missed in initial check)
                const quotesRetry = db.prepare('SELECT number FROM quotes WHERE customerId = ?').all(id);
                const invoicesRetry = db.prepare('SELECT number FROM invoices WHERE customerId = ?').all(id);
                const referencesRetry = [
                    ...quotesRetry.map(q => ({ type: 'Quote', number: q.number })),
                    ...invoicesRetry.map(i => ({ type: 'Invoice', number: i.number }))
                ];
                if (referencesRetry.length > 0) {
                    throw new Error(formatReferenceError('Customer', referencesRetry));
                }
                // If still no references found, throw generic error
                throw new Error('Cannot delete Customer as it is referenced in other records');
            }
            // Re-throw other errors
            throw dbError;
        }
    },
};
// ==================== VENDORS ====================
exports.vendorsAdapter = {
    getAll: () => {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM vendors ORDER BY createdAt DESC').all();
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            contactPerson: row.contactPerson || '',
            email: row.email || '',
            phone: row.phone || '',
            address: row.address || '',
            bankDetails: row.bankDetails || '',
            paymentTerms: row.paymentTerms || '',
            createdAt: row.createdAt,
        }));
    },
    getById: (id) => {
        const db = getDb();
        const row = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
        if (!row)
            return null;
        return {
            id: row.id,
            name: row.name,
            contactPerson: row.contactPerson || '',
            email: row.email || '',
            phone: row.phone || '',
            address: row.address || '',
            bankDetails: row.bankDetails || '',
            paymentTerms: row.paymentTerms || '',
            createdAt: row.createdAt,
        };
    },
    create: (data) => {
        const db = getDb();
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      INSERT INTO vendors (id, name, contactPerson, email, phone, address, bankDetails, paymentTerms, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(data.id, data.name, data.contactPerson || '', data.email || '', data.phone || '', data.address || '', data.bankDetails || '', data.paymentTerms || '', now);
        return exports.vendorsAdapter.getById(data.id);
    },
    update: (id, data) => {
        const db = getDb();
        const stmt = db.prepare(`
      UPDATE vendors 
      SET name = ?, contactPerson = ?, email = ?, phone = ?, address = ?, bankDetails = ?, paymentTerms = ?
      WHERE id = ?
    `);
        stmt.run(data.name, data.contactPerson || '', data.email || '', data.phone || '', data.address || '', data.bankDetails || '', data.paymentTerms || '', id);
        return exports.vendorsAdapter.getById(id);
    },
    delete: (id) => {
        const db = getDb();
        // Check for related purchase orders
        const purchaseOrders = db.prepare('SELECT number FROM purchase_orders WHERE vendorId = ?').all(id);
        // Check for related invoices
        const invoices = db.prepare('SELECT number FROM invoices WHERE vendorId = ?').all(id);
        // Build references array
        const references = [
            ...purchaseOrders.map(po => ({ type: 'Purchase Order', number: po.number })),
            ...invoices.map(i => ({ type: 'Invoice', number: i.number }))
        ];
        if (references.length > 0) {
            throw new Error(formatReferenceError('Vendor', references));
        }
        // If no related records, proceed with deletion
        db.prepare('DELETE FROM vendors WHERE id = ?').run(id);
    },
};
// ==================== EMPLOYEES ====================
exports.employeesAdapter = {
    getAll: () => {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM employees ORDER BY createdAt DESC').all();
        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            employeeId: row.employeeId || '',
            role: row.role || '',
            paymentType: (row.paymentType != null && row.paymentType !== '') ? String(row.paymentType) : undefined,
            hourlyRate: row.hourlyRate || 0,
            salary: row.salary || 0,
            bankDetails: row.bankDetails || '',
            createdAt: row.createdAt,
        }));
    },
    getById: (id) => {
        const db = getDb();
        const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
        if (!row)
            return null;
        return {
            id: row.id,
            name: row.name,
            employeeId: row.employeeId || '',
            role: row.role || '',
            paymentType: (row.paymentType != null && row.paymentType !== '') ? String(row.paymentType) : undefined,
            hourlyRate: row.hourlyRate || 0,
            salary: row.salary || 0,
            bankDetails: row.bankDetails || '',
            createdAt: row.createdAt,
        };
    },
    create: (data) => {
        const db = getDb();
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      INSERT INTO employees (id, name, employeeId, role, paymentType, hourlyRate, salary, bankDetails, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(data.id, data.name, data.employeeId || '', data.role || '', data.paymentType != null ? data.paymentType : null, data.hourlyRate || 0, data.salary || 0, data.bankDetails || '', now);
        return exports.employeesAdapter.getById(data.id);
    },
    update: (id, data) => {
        const db = getDb();
        const stmt = db.prepare(`
      UPDATE employees 
      SET name = ?, employeeId = ?, role = ?, paymentType = ?, hourlyRate = ?, salary = ?, bankDetails = ?
      WHERE id = ?
    `);
        stmt.run(data.name, data.employeeId || '', data.role || '', data.paymentType != null ? data.paymentType : null, data.hourlyRate || 0, data.salary || 0, data.bankDetails || '', id);
        return exports.employeesAdapter.getById(id);
    },
    delete: (id) => {
        const db = getDb();
        // Check for related payslips
        const payslips = db.prepare('SELECT id, month FROM payslips WHERE employeeId = ?').all(id);
        // Build references array
        const references = payslips.map(ps => ({
            type: 'Payslip',
            number: ps.month || ps.id
        }));
        if (references.length > 0) {
            throw new Error(formatReferenceError('Employee', references));
        }
        // If no related records, proceed with deletion
        db.prepare('DELETE FROM employees WHERE id = ?').run(id);
    },
};
// ==================== PAYSLIPS ====================
exports.payslipsAdapter = {
    getAll: () => {
        try {
            const db = getDb();
            const rows = db.prepare('SELECT * FROM payslips ORDER BY year DESC, month DESC, createdAt DESC').all();
            return rows.map((row) => ({
                id: row.id,
                employeeId: row.employeeId || '',
                month: row.month || '',
                year: row.year || new Date().getFullYear(),
                baseSalary: row.baseSalary || 0,
                overtimeHours: row.overtimeHours != null ? row.overtimeHours : undefined,
                overtimeRate: row.overtimeRate != null ? row.overtimeRate : undefined,
                overtimePay: row.overtimePay != null ? row.overtimePay : undefined,
                deductions: row.deductions || 0,
                netPay: row.netPay || 0,
                status: row.status || 'draft',
                notes: row.notes || undefined,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            }));
        }
        catch (error) {
            console.error('Error in payslipsAdapter.getAll:', error);
            // Return empty array if table doesn't exist or query fails
            return [];
        }
    },
    getById: (id) => {
        try {
            const db = getDb();
            const row = db.prepare('SELECT * FROM payslips WHERE id = ?').get(id);
            if (!row)
                return null;
            return {
                id: row.id,
                employeeId: row.employeeId || '',
                month: row.month || '',
                year: row.year || new Date().getFullYear(),
                baseSalary: row.baseSalary || 0,
                overtimeHours: row.overtimeHours != null ? row.overtimeHours : undefined,
                overtimeRate: row.overtimeRate != null ? row.overtimeRate : undefined,
                overtimePay: row.overtimePay != null ? row.overtimePay : undefined,
                deductions: row.deductions || 0,
                netPay: row.netPay || 0,
                status: row.status || 'draft',
                notes: row.notes || undefined,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            };
        }
        catch (error) {
            console.error('Error in payslipsAdapter.getById:', error);
            return null;
        }
    },
    getByMonth: (month) => {
        try {
            const db = getDb();
            const rows = db.prepare('SELECT * FROM payslips WHERE month = ? ORDER BY createdAt DESC').all(month);
            return rows.map((row) => ({
                id: row.id,
                employeeId: row.employeeId || '',
                month: row.month || '',
                year: row.year || new Date().getFullYear(),
                baseSalary: row.baseSalary || 0,
                overtimeHours: row.overtimeHours != null ? row.overtimeHours : undefined,
                overtimeRate: row.overtimeRate != null ? row.overtimeRate : undefined,
                overtimePay: row.overtimePay != null ? row.overtimePay : undefined,
                deductions: row.deductions || 0,
                netPay: row.netPay || 0,
                status: row.status || 'draft',
                notes: row.notes || undefined,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            }));
        }
        catch (error) {
            console.error('Error in payslipsAdapter.getByMonth:', error);
            return [];
        }
    },
    create: (data) => {
        try {
            const db = getDb();
            const now = new Date().toISOString();
            // Validate required fields
            if (!data.id) {
                throw new Error('Payslip id is required');
            }
            if (!data.employeeId) {
                throw new Error('Employee ID is required');
            }
            if (!data.month) {
                throw new Error('Month is required');
            }
            const stmt = db.prepare(`
        INSERT INTO payslips (id, employeeId, month, year, baseSalary, overtimeHours, overtimeRate, overtimePay, deductions, netPay, status, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(data.id, data.employeeId || '', data.month || '', data.year || new Date().getFullYear(), data.baseSalary || 0, data.overtimeHours != null ? data.overtimeHours : null, data.overtimeRate != null ? data.overtimeRate : null, data.overtimePay != null ? data.overtimePay : null, data.deductions || 0, data.netPay || 0, data.status || 'processed', data.notes != null ? data.notes : null, now, now);
            return exports.payslipsAdapter.getById(data.id);
        }
        catch (error) {
            console.error('Error in payslipsAdapter.create:', error);
            console.error('Data being inserted:', JSON.stringify(data, null, 2));
            throw error;
        }
    },
    update: (id, data) => {
        const db = getDb();
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      UPDATE payslips 
      SET employeeId = ?, month = ?, year = ?, baseSalary = ?, overtimeHours = ?, overtimeRate = ?, overtimePay = ?, deductions = ?, netPay = ?, status = ?, notes = ?, updatedAt = ?
      WHERE id = ?
    `);
        stmt.run(data.employeeId || '', data.month || '', data.year || new Date().getFullYear(), data.baseSalary || 0, data.overtimeHours != null ? data.overtimeHours : null, data.overtimeRate != null ? data.overtimeRate : null, data.overtimePay != null ? data.overtimePay : null, data.deductions || 0, data.netPay || 0, data.status || 'processed', data.notes != null ? data.notes : null, now, id);
        return exports.payslipsAdapter.getById(id);
    },
    delete: (id) => {
        const db = getDb();
        db.prepare('DELETE FROM payslips WHERE id = ?').run(id);
    },
};
// ==================== VEHICLES ====================
exports.vehiclesAdapter = {
    getAll: () => {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM vehicles ORDER BY createdAt DESC').all();
        return rows.map(row => ({
            id: row.id,
            type: row.type,
            description: row.description || '',
            basePrice: row.basePrice || 0,
            createdAt: row.createdAt,
        }));
    },
    getById: (id) => {
        const db = getDb();
        const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
        if (!row)
            return null;
        return {
            id: row.id,
            type: row.type,
            description: row.description || '',
            basePrice: row.basePrice || 0,
            createdAt: row.createdAt,
        };
    },
    create: (data) => {
        const db = getDb();
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      INSERT INTO vehicles (id, type, description, basePrice, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
        stmt.run(data.id, data.type, data.description || '', data.basePrice || 0, now);
        return exports.vehiclesAdapter.getById(data.id);
    },
    update: (id, data) => {
        const db = getDb();
        const stmt = db.prepare(`
      UPDATE vehicles 
      SET type = ?, description = ?, basePrice = ?
      WHERE id = ?
    `);
        stmt.run(data.type, data.description || '', data.basePrice || 0, id);
        return exports.vehiclesAdapter.getById(id);
    },
    delete: (id) => {
        const db = getDb();
        // Check for related quote items (vehicleTypeId references this vehicle)
        const quoteItems = db.prepare(`
      SELECT DISTINCT q.number 
      FROM quote_items qi
      JOIN quotes q ON qi.quoteId = q.id
      WHERE qi.vehicleTypeId = ?
    `).all(id);
        // Build references array
        const references = quoteItems.map(qi => ({
            type: 'Quote',
            number: qi.number
        }));
        if (references.length > 0) {
            throw new Error(formatReferenceError('Vehicle', references));
        }
        // If no related records, proceed with deletion
        db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
    },
};
// ==================== ADMIN SETTINGS ====================
exports.adminAdapter = {
    get: () => {
        const db = getDb();
        // Ensure migration runs - check and add columns if needed
        try {
            const tableInfo = db.prepare("PRAGMA table_info(admin_settings)").all();
            const columnNames = tableInfo.map((col) => col.name);
            if (!columnNames.includes('showRevenueTrend')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showRevenueTrend INTEGER DEFAULT 1');
            }
            if (!columnNames.includes('showQuickActions')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showQuickActions INTEGER DEFAULT 1');
            }
        }
        catch (error) {
            console.log('Migration check:', error.message);
        }
        const row = db.prepare('SELECT * FROM admin_settings LIMIT 1').get();
        if (!row)
            return null;
        // Convert integer (0/1) to boolean, default to true if undefined
        // Explicitly check: 0 -> false, 1 -> true, null/undefined -> true
        const showRevenueTrend = (row.showRevenueTrend === 0)
            ? false
            : (row.showRevenueTrend === 1)
                ? true
                : true; // default to true if null/undefined
        const showQuickActions = (row.showQuickActions === 0)
            ? false
            : (row.showQuickActions === 1)
                ? true
                : true; // default to true if null/undefined
        const showReports = (row.showReports === 0)
            ? false
            : (row.showReports === 1)
                ? true
                : true; // default to true if null/undefined
        return {
            id: row.id,
            companyName: row.companyName || '',
            address: row.address || '',
            vatNumber: row.vatNumber || '',
            logoUrl: row.logoUrl || null,
            sealUrl: row.sealUrl || null,
            signatureUrl: row.signatureUrl || null,
            quoteNumberPattern: row.quoteNumberPattern || 'AAT-YYYYMMDD-NNNN',
            currency: row.currency || 'AED',
            defaultTerms: row.defaultTerms || '',
            showRevenueTrend,
            showQuickActions,
            showReports,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    },
    save: (data) => {
        const db = getDb();
        // Ensure migration runs before save
        try {
            const tableInfo = db.prepare("PRAGMA table_info(admin_settings)").all();
            const columnNames = tableInfo.map((col) => col.name);
            if (!columnNames.includes('showRevenueTrend')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showRevenueTrend INTEGER DEFAULT 1');
            }
            if (!columnNames.includes('showQuickActions')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showQuickActions INTEGER DEFAULT 1');
            }
            if (!columnNames.includes('showReports')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showReports INTEGER DEFAULT 1');
            }
        }
        catch (error) {
            console.log('Migration check in save:', error.message);
        }
        const now = new Date().toISOString();
        // Get existing record (but don't use its boolean values - use the data being saved)
        const existing = db.prepare('SELECT id FROM admin_settings LIMIT 1').get();
        // Convert boolean to integer (SQLite doesn't have native boolean)
        // Explicitly handle: false -> 0, true -> 1, undefined/null -> 1 (default)
        const showRevenueTrend = (data.showRevenueTrend === false) ? 0 : 1;
        const showQuickActions = (data.showQuickActions === false) ? 0 : 1;
        const showReports = (data.showReports === false) ? 0 : 1;
        console.log('Adapter save - converting:', {
            showRevenueTrend: { input: data.showRevenueTrend, output: showRevenueTrend },
            showQuickActions: { input: data.showQuickActions, output: showQuickActions },
            showReports: { input: data.showReports, output: showReports },
        });
        if (existing) {
            const stmt = db.prepare(`
        UPDATE admin_settings 
        SET companyName = ?, address = ?, vatNumber = ?, logoUrl = ?, sealUrl = ?, 
            signatureUrl = ?, quoteNumberPattern = ?, currency = ?, defaultTerms = ?, 
            showRevenueTrend = ?, showQuickActions = ?, showReports = ?, updatedAt = ?
        WHERE id = ?
      `);
            const result = stmt.run(data.companyName || '', data.address || '', data.vatNumber || '', data.logoUrl || null, data.sealUrl || null, data.signatureUrl || null, data.quoteNumberPattern || 'AAT-YYYYMMDD-NNNN', data.currency || 'AED', data.defaultTerms || '', showRevenueTrend, showQuickActions, showReports, now, existing.id);
        }
        else {
            const stmt = db.prepare(`
        INSERT INTO admin_settings (id, companyName, address, vatNumber, logoUrl, sealUrl, 
                                    signatureUrl, quoteNumberPattern, currency, defaultTerms, 
                                    showRevenueTrend, showQuickActions, showReports, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(data.id || 'settings_1', data.companyName || '', data.address || '', data.vatNumber || '', data.logoUrl || null, data.sealUrl || null, data.signatureUrl || null, data.quoteNumberPattern || 'AAT-YYYYMMDD-NNNN', data.currency || 'AED', data.defaultTerms || '', showRevenueTrend, showQuickActions, showReports, now, now);
        }
        return exports.adminAdapter.get();
    },
};
// ==================== QUOTES ====================
exports.quotesAdapter = {
    getAll: () => {
        const db = getDb();
        const quotes = db.prepare('SELECT * FROM quotes ORDER BY createdAt DESC').all();
        return quotes.map(quote => {
            const items = db.prepare('SELECT * FROM quote_items WHERE quoteId = ?').all(quote.id);
            // Get customer object
            const customer = quote.customerId ? exports.customersAdapter.getById(quote.customerId) : null;
            return {
                id: quote.id,
                number: quote.number,
                date: quote.date,
                validUntil: quote.validUntil || '',
                currency: quote.currency || 'AED',
                customer: customer || { id: '', name: '', company: '', email: '', phone: '', address: '' },
                items: items.map(item => ({
                    id: item.id,
                    vehicleTypeId: item.vehicleTypeId || '',
                    vehicleTypeLabel: item.vehicleTypeLabel || '',
                    quantity: item.quantity || 0,
                    unitPrice: item.unitPrice || 0,
                    taxPercent: item.taxPercent || 0,
                    lineTaxAmount: item.lineTaxAmount || 0,
                    lineTotal: item.lineTotal || 0,
                })),
                subTotal: quote.subTotal || 0,
                totalTax: quote.totalTax || 0,
                total: quote.total || 0,
                terms: quote.terms || '',
                notes: quote.notes || '',
                createdAt: quote.createdAt,
                updatedAt: quote.updatedAt,
            };
        });
    },
    getById: (id) => {
        const db = getDb();
        const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
        if (!quote)
            return null;
        const items = db.prepare('SELECT * FROM quote_items WHERE quoteId = ?').all(id);
        // Get customer object
        const customer = quote.customerId ? exports.customersAdapter.getById(quote.customerId) : null;
        // If customer doesn't exist, return null instead of empty object to prevent FK issues
        if (quote.customerId && !customer) {
            console.warn(`Quote ${quote.number} references non-existent customer ${quote.customerId}`);
        }
        return {
            id: quote.id,
            number: quote.number,
            date: quote.date,
            validUntil: quote.validUntil || '',
            currency: quote.currency || 'AED',
            customer: customer || null,
            items: items.map(item => ({
                id: item.id,
                vehicleTypeId: item.vehicleTypeId || '',
                vehicleTypeLabel: item.vehicleTypeLabel || '',
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                taxPercent: item.taxPercent || 0,
                lineTaxAmount: item.lineTaxAmount || 0,
                lineTotal: item.lineTotal || 0,
            })),
            subTotal: quote.subTotal || 0,
            totalTax: quote.totalTax || 0,
            total: quote.total || 0,
            terms: quote.terms || '',
            notes: quote.notes || '',
            createdAt: quote.createdAt,
            updatedAt: quote.updatedAt,
        };
    },
    create: (data) => {
        const db = getDb();
        const now = new Date().toISOString();
        // Validate required fields
        if (!data.number || data.number.trim() === '') {
            throw new Error('Quote number is required');
        }
        // Check uniqueness of quote number
        const existingQuote = db.prepare('SELECT id FROM quotes WHERE number = ?').get(data.number);
        if (existingQuote) {
            throw new Error(`Quote number "${data.number}" already exists`);
        }
        // Extract customerId from customer object if present
        const customerId = data.customerId || (data.customer?.id || '');
        // Validate customer exists
        if (customerId) {
            const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
            if (!customer) {
                throw new Error(`Customer with ID "${customerId}" does not exist`);
            }
        }
        // Insert quote
        const quoteStmt = db.prepare(`
      INSERT INTO quotes (id, number, date, validUntil, currency, customerId, subTotal, totalTax, total, terms, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        quoteStmt.run(data.id, data.number, data.date, data.validUntil || '', data.currency || 'AED', customerId, data.subTotal || 0, data.totalTax || 0, data.total || 0, data.terms || '', data.notes || '', now, now);
        // Insert items
        if (data.items && data.items.length > 0) {
            const itemStmt = db.prepare(`
        INSERT INTO quote_items (id, quoteId, vehicleTypeId, vehicleTypeLabel, quantity, unitPrice, taxPercent, lineTaxAmount, lineTotal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const insertItems = db.transaction((items) => {
                for (const item of items) {
                    itemStmt.run(item.id, data.id, item.vehicleTypeId || '', item.vehicleTypeLabel || '', item.quantity || 0, item.unitPrice || 0, item.taxPercent || 0, item.lineTaxAmount || 0, item.lineTotal || 0);
                }
            });
            insertItems(data.items);
        }
        return exports.quotesAdapter.getById(data.id);
    },
    update: (id, data) => {
        const db = getDb();
        const now = new Date().toISOString();
        // Validate required fields
        if (!data.number || data.number.trim() === '') {
            throw new Error('Quote number is required');
        }
        // Check uniqueness of quote number (excluding current quote)
        const existingQuote = db.prepare('SELECT id FROM quotes WHERE number = ? AND id != ?').get(data.number, id);
        if (existingQuote) {
            throw new Error(`Quote number "${data.number}" already exists`);
        }
        // Extract customerId from customer object if present
        const customerId = data.customerId || (data.customer?.id || '');
        // Validate customer exists
        if (customerId) {
            const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
            if (!customer) {
                throw new Error(`Customer with ID "${customerId}" does not exist`);
            }
        }
        // Update quote
        const quoteStmt = db.prepare(`
      UPDATE quotes 
      SET number = ?, date = ?, validUntil = ?, currency = ?, customerId = ?, 
          subTotal = ?, totalTax = ?, total = ?, terms = ?, notes = ?, updatedAt = ?
      WHERE id = ?
    `);
        quoteStmt.run(data.number, data.date, data.validUntil || '', data.currency || 'AED', customerId, data.subTotal || 0, data.totalTax || 0, data.total || 0, data.terms || '', data.notes || '', now, id);
        // Delete existing items and insert new ones
        db.prepare('DELETE FROM quote_items WHERE quoteId = ?').run(id);
        if (data.items && data.items.length > 0) {
            const itemStmt = db.prepare(`
        INSERT INTO quote_items (id, quoteId, vehicleTypeId, vehicleTypeLabel, quantity, unitPrice, taxPercent, lineTaxAmount, lineTotal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const insertItems = db.transaction((items) => {
                for (const item of items) {
                    itemStmt.run(item.id, id, item.vehicleTypeId || '', item.vehicleTypeLabel || '', item.quantity || 0, item.unitPrice || 0, item.taxPercent || 0, item.lineTaxAmount || 0, item.lineTotal || 0);
                }
            });
            insertItems(data.items);
        }
        return exports.quotesAdapter.getById(id);
    },
    delete: (id) => {
        const db = getDb();
        // Check for related invoices
        const invoices = db.prepare('SELECT number FROM invoices WHERE quoteId = ?').all(id);
        // Build references array
        const references = invoices.map(i => ({
            type: 'Invoice',
            number: i.number
        }));
        if (references.length > 0) {
            throw new Error(formatReferenceError('Quote', references));
        }
        // If no related records, proceed with deletion
        // Items will be deleted automatically due to CASCADE
        db.prepare('DELETE FROM quotes WHERE id = ?').run(id);
    },
};
// ==================== PURCHASE ORDERS ====================
exports.purchaseOrdersAdapter = {
    getAll: () => {
        const db = getDb();
        const pos = db.prepare('SELECT * FROM purchase_orders ORDER BY createdAt DESC').all();
        return pos.map(po => {
            const items = db.prepare('SELECT * FROM po_items WHERE purchaseOrderId = ?').all(po.id);
            return {
                id: po.id,
                number: po.number,
                date: po.date,
                vendorId: po.vendorId,
                items: items.map(item => ({
                    id: item.id,
                    description: item.description || '',
                    quantity: item.quantity || 0,
                    unitPrice: item.unitPrice || 0,
                    tax: item.tax || 0,
                    total: item.total || 0,
                })),
                subtotal: po.subtotal || 0,
                tax: po.tax || 0,
                amount: po.amount || 0,
                currency: po.currency || 'AED',
                status: po.status || 'draft',
                notes: po.notes || '',
                createdAt: po.createdAt,
            };
        });
    },
    getById: (id) => {
        const db = getDb();
        const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
        if (!po)
            return null;
        const items = db.prepare('SELECT * FROM po_items WHERE purchaseOrderId = ?').all(id);
        return {
            id: po.id,
            number: po.number,
            date: po.date,
            vendorId: po.vendorId,
            items: items.map(item => ({
                id: item.id,
                description: item.description || '',
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                tax: item.tax || 0,
                total: item.total || 0,
            })),
            subtotal: po.subtotal || 0,
            tax: po.tax || 0,
            amount: po.amount || 0,
            currency: po.currency || 'AED',
            status: po.status || 'draft',
            notes: po.notes || '',
            createdAt: po.createdAt,
        };
    },
    create: (data) => {
        const db = getDb();
        const now = new Date().toISOString();
        // Insert purchase order
        const poStmt = db.prepare(`
      INSERT INTO purchase_orders (id, number, date, vendorId, subtotal, tax, amount, currency, status, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        poStmt.run(data.id, data.number, data.date, data.vendorId, data.subtotal || 0, data.tax || 0, data.amount || 0, data.currency || 'AED', data.status || 'draft', data.notes || '', now);
        // Insert items
        if (data.items && data.items.length > 0) {
            const itemStmt = db.prepare(`
        INSERT INTO po_items (id, purchaseOrderId, description, quantity, unitPrice, tax, total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            const insertItems = db.transaction((items) => {
                for (const item of items) {
                    itemStmt.run(item.id, data.id, item.description || '', item.quantity || 0, item.unitPrice || 0, item.tax || 0, item.total || 0);
                }
            });
            insertItems(data.items);
        }
        return exports.purchaseOrdersAdapter.getById(data.id);
    },
    update: (id, data) => {
        const db = getDb();
        // Update purchase order
        const poStmt = db.prepare(`
      UPDATE purchase_orders 
      SET number = ?, date = ?, vendorId = ?, subtotal = ?, tax = ?, amount = ?, 
          currency = ?, status = ?, notes = ?
      WHERE id = ?
    `);
        poStmt.run(data.number, data.date, data.vendorId, data.subtotal || 0, data.tax || 0, data.amount || 0, data.currency || 'AED', data.status || 'draft', data.notes || '', id);
        // Delete existing items and insert new ones
        db.prepare('DELETE FROM po_items WHERE purchaseOrderId = ?').run(id);
        if (data.items && data.items.length > 0) {
            const itemStmt = db.prepare(`
        INSERT INTO po_items (id, purchaseOrderId, description, quantity, unitPrice, tax, total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            const insertItems = db.transaction((items) => {
                for (const item of items) {
                    itemStmt.run(item.id, id, item.description || '', item.quantity || 0, item.unitPrice || 0, item.tax || 0, item.total || 0);
                }
            });
            insertItems(data.items);
        }
        return exports.purchaseOrdersAdapter.getById(id);
    },
    delete: (id) => {
        const db = getDb();
        // Check for related invoices
        const invoices = db.prepare('SELECT number FROM invoices WHERE purchaseOrderId = ?').all(id);
        // Build references array
        const references = invoices.map(i => ({
            type: 'Invoice',
            number: i.number
        }));
        if (references.length > 0) {
            throw new Error(formatReferenceError('Purchase Order', references));
        }
        // If no related records, proceed with deletion
        // Items will be deleted automatically due to CASCADE
        db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(id);
    },
};
// ==================== INVOICES ====================
exports.invoicesAdapter = {
    getAll: () => {
        const db = getDb();
        const invoices = db.prepare('SELECT * FROM invoices ORDER BY createdAt DESC').all();
        return invoices.map(invoice => {
            const items = db.prepare('SELECT * FROM invoice_items WHERE invoiceId = ?').all(invoice.id);
            return {
                id: invoice.id,
                number: invoice.number,
                date: invoice.date,
                dueDate: invoice.dueDate || '',
                customerId: invoice.customerId || '',
                vendorId: invoice.vendorId || '',
                purchaseOrderId: invoice.purchaseOrderId || '',
                quoteId: invoice.quoteId || '',
                items: items.map(item => ({
                    id: item.id,
                    description: item.description || '',
                    quantity: item.quantity || 0,
                    unitPrice: item.unitPrice || 0,
                    tax: item.tax || 0,
                    total: item.total || 0,
                })),
                subtotal: invoice.subtotal || 0,
                tax: invoice.tax || 0,
                total: invoice.total || 0,
                amountReceived: invoice.amountReceived || 0,
                status: invoice.status || 'draft',
                notes: invoice.notes || '',
                createdAt: invoice.createdAt,
            };
        });
    },
    getById: (id) => {
        const db = getDb();
        const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
        if (!invoice)
            return null;
        const items = db.prepare('SELECT * FROM invoice_items WHERE invoiceId = ?').all(id);
        return {
            id: invoice.id,
            number: invoice.number,
            date: invoice.date,
            dueDate: invoice.dueDate || '',
            customerId: invoice.customerId || '',
            vendorId: invoice.vendorId || '',
            purchaseOrderId: invoice.purchaseOrderId || '',
            quoteId: invoice.quoteId || '',
            items: items.map(item => ({
                id: item.id,
                description: item.description || '',
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                tax: item.tax || 0,
                total: item.total || 0,
            })),
            subtotal: invoice.subtotal || 0,
            tax: invoice.tax || 0,
            total: invoice.total || 0,
            amountReceived: invoice.amountReceived || 0,
            status: invoice.status || 'draft',
            notes: invoice.notes || '',
            createdAt: invoice.createdAt,
        };
    },
    create: (data) => {
        const db = getDb();
        const now = new Date().toISOString();
        // Validate required fields
        if (!data.number || data.number.trim() === '') {
            throw new Error('Invoice number is required');
        }
        // Check uniqueness of invoice number
        const existingInvoice = db.prepare('SELECT id FROM invoices WHERE number = ?').get(data.number);
        if (existingInvoice) {
            throw new Error(`Invoice number "${data.number}" already exists`);
        }
        if (!data.customerId || data.customerId.trim() === '') {
            throw new Error('Customer is required for invoice');
        }
        // Validate foreign keys exist in database
        const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(data.customerId);
        if (!customer) {
            throw new Error(`Customer with ID "${data.customerId}" does not exist`);
        }
        // Validate optional foreign keys if provided
        if (data.vendorId && data.vendorId.trim() !== '') {
            const vendor = db.prepare('SELECT id FROM vendors WHERE id = ?').get(data.vendorId);
            if (!vendor) {
                throw new Error(`Vendor with ID "${data.vendorId}" does not exist`);
            }
        }
        if (data.purchaseOrderId && data.purchaseOrderId.trim() !== '') {
            const po = db.prepare('SELECT id FROM purchase_orders WHERE id = ?').get(data.purchaseOrderId);
            if (!po) {
                throw new Error(`Purchase Order with ID "${data.purchaseOrderId}" does not exist`);
            }
        }
        if (data.quoteId && data.quoteId.trim() !== '') {
            const quote = db.prepare('SELECT id FROM quotes WHERE id = ?').get(data.quoteId);
            if (!quote) {
                throw new Error(`Quote with ID "${data.quoteId}" does not exist`);
            }
        }
        // Insert invoice
        // Use NULL instead of empty strings for optional foreign keys to satisfy FK constraints
        const invoiceStmt = db.prepare(`
      INSERT INTO invoices (id, number, date, dueDate, customerId, vendorId, purchaseOrderId, quoteId, 
                            subtotal, tax, total, amountReceived, status, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        try {
            invoiceStmt.run(data.id, data.number, data.date, data.dueDate || null, data.customerId, // Required, validated above
            (data.vendorId && data.vendorId.trim() !== '') ? data.vendorId : null, (data.purchaseOrderId && data.purchaseOrderId.trim() !== '') ? data.purchaseOrderId : null, (data.quoteId && data.quoteId.trim() !== '') ? data.quoteId : null, data.subtotal || 0, data.tax || 0, data.total || 0, data.amountReceived || 0, data.status || 'draft', data.notes || '', now);
        }
        catch (error) {
            // Log the actual error for debugging
            console.error('Invoice insert error:', error);
            console.error('Invoice data:', {
                id: data.id,
                customerId: data.customerId,
                vendorId: data.vendorId,
                purchaseOrderId: data.purchaseOrderId,
                quoteId: data.quoteId
            });
            // Provide more specific error message for foreign key constraint failures
            const errorMsg = error.message || String(error);
            if (errorMsg.includes('FOREIGN KEY') || errorMsg.includes('constraint failed')) {
                throw new Error(`Foreign key constraint failed: ${errorMsg}. Please ensure all referenced records (customer, vendor, purchase order, quote) exist in the database.`);
            }
            throw error;
        }
        // Insert items
        if (data.items && data.items.length > 0) {
            const itemStmt = db.prepare(`
        INSERT INTO invoice_items (id, invoiceId, description, quantity, unitPrice, tax, total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            try {
                const insertItems = db.transaction((items) => {
                    for (const item of items) {
                        itemStmt.run(item.id, data.id, item.description || '', item.quantity || 0, item.unitPrice || 0, item.tax || 0, item.total || 0);
                    }
                });
                insertItems(data.items);
            }
            catch (error) {
                // If items insertion fails, provide specific error
                if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
                    throw new Error(`Failed to insert invoice items. The invoice may not have been created properly.`);
                }
                throw error;
            }
        }
        return exports.invoicesAdapter.getById(data.id);
    },
    update: (id, data) => {
        const db = getDb();
        // Check if invoice exists first
        const existing = exports.invoicesAdapter.getById(id);
        if (!existing) {
            return null; // Invoice doesn't exist
        }
        // Validate required fields
        if (!data.number || data.number.trim() === '') {
            throw new Error('Invoice number is required');
        }
        // Check uniqueness of invoice number (excluding current invoice)
        const existingInvoice = db.prepare('SELECT id FROM invoices WHERE number = ? AND id != ?').get(data.number, id);
        if (existingInvoice) {
            throw new Error(`Invoice number "${data.number}" already exists`);
        }
        if (!data.customerId || data.customerId.trim() === '') {
            throw new Error('Customer is required for invoice');
        }
        // Validate foreign keys exist in database
        const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(data.customerId);
        if (!customer) {
            throw new Error(`Customer with ID "${data.customerId}" does not exist`);
        }
        // Validate optional foreign keys if provided
        if (data.vendorId && data.vendorId.trim() !== '') {
            const vendor = db.prepare('SELECT id FROM vendors WHERE id = ?').get(data.vendorId);
            if (!vendor) {
                throw new Error(`Vendor with ID "${data.vendorId}" does not exist`);
            }
        }
        if (data.purchaseOrderId && data.purchaseOrderId.trim() !== '') {
            const po = db.prepare('SELECT id FROM purchase_orders WHERE id = ?').get(data.purchaseOrderId);
            if (!po) {
                throw new Error(`Purchase Order with ID "${data.purchaseOrderId}" does not exist`);
            }
        }
        if (data.quoteId && data.quoteId.trim() !== '') {
            const quote = db.prepare('SELECT id FROM quotes WHERE id = ?').get(data.quoteId);
            if (!quote) {
                throw new Error(`Quote with ID "${data.quoteId}" does not exist`);
            }
        }
        // Update invoice
        // Use NULL instead of empty strings for optional foreign keys to satisfy FK constraints
        const invoiceStmt = db.prepare(`
      UPDATE invoices 
      SET number = ?, date = ?, dueDate = ?, customerId = ?, vendorId = ?, purchaseOrderId = ?, quoteId = ?,
          subtotal = ?, tax = ?, total = ?, amountReceived = ?, status = ?, notes = ?
      WHERE id = ?
    `);
        try {
            invoiceStmt.run(data.number, data.date, data.dueDate || null, data.customerId, // Required, validated above
            (data.vendorId && data.vendorId.trim() !== '') ? data.vendorId : null, (data.purchaseOrderId && data.purchaseOrderId.trim() !== '') ? data.purchaseOrderId : null, (data.quoteId && data.quoteId.trim() !== '') ? data.quoteId : null, data.subtotal || 0, data.tax || 0, data.total || 0, data.amountReceived || 0, data.status || 'draft', data.notes || '', id);
        }
        catch (error) {
            // Log the actual error for debugging
            console.error('Invoice update error:', error);
            console.error('Invoice data:', {
                id: id,
                customerId: data.customerId,
                vendorId: data.vendorId,
                purchaseOrderId: data.purchaseOrderId,
                quoteId: data.quoteId
            });
            // Provide more specific error message for foreign key constraint failures
            const errorMsg = error.message || String(error);
            if (errorMsg.includes('FOREIGN KEY') || errorMsg.includes('constraint failed')) {
                throw new Error(`Foreign key constraint failed: ${errorMsg}. Please ensure all referenced records (customer, vendor, purchase order, quote) exist in the database.`);
            }
            throw error;
        }
        // Delete existing items and insert new ones
        db.prepare('DELETE FROM invoice_items WHERE invoiceId = ?').run(id);
        if (data.items && data.items.length > 0) {
            const itemStmt = db.prepare(`
        INSERT INTO invoice_items (id, invoiceId, description, quantity, unitPrice, tax, total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            const insertItems = db.transaction((items) => {
                for (const item of items) {
                    itemStmt.run(item.id, id, item.description || '', item.quantity || 0, item.unitPrice || 0, item.tax || 0, item.total || 0);
                }
            });
            insertItems(data.items);
        }
        return exports.invoicesAdapter.getById(id);
    },
    delete: (id) => {
        const db = getDb();
        // Items will be deleted automatically due to CASCADE
        db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    },
};
