"use strict";
/**
 * SQLite Adapter
 * Provides CRUD operations for all entities using SQLite database
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehicleTransactionsAdapter = exports.expenseCategoriesAdapter = exports.invoicesAdapter = exports.purchaseOrdersAdapter = exports.quotesAdapter = exports.adminAdapter = exports.vehiclesAdapter = exports.payslipsAdapter = exports.employeesAdapter = exports.vendorsAdapter = exports.customersAdapter = void 0;
exports.formatReferenceError = formatReferenceError;
const database_1 = require("../../lib/database");
// Helper to get database instance
// Returns null if database is unavailable, allowing graceful fallback
function getDb() {
    return (0, database_1.getDatabase)();
}
// Helper to check if database is available before operations
function ensureDb() {
    const db = getDb();
    if (!db) {
        throw new Error('Database is not available. App is using client-side storage.');
    }
    return db;
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
        if (!db)
            return [];
        try {
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
        }
        catch (error) {
            console.error('Error in customersAdapter.getAll:', error);
            return [];
        }
    },
    getById: (id) => {
        const db = getDb();
        if (!db)
            return null;
        try {
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
        }
        catch (error) {
            console.error('Error in customersAdapter.getById:', error);
            return null;
        }
    },
    create: (data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        // Validate ID before inserting
        if (!data.id || typeof data.id !== 'string' || data.id.trim() === '') {
            throw new Error('Employee ID is required and must be a non-empty string');
        }
        try {
            const now = new Date().toISOString();
            const stmt = db.prepare(`
        INSERT INTO employees (id, name, employeeId, role, paymentType, hourlyRate, salary, bankDetails, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(data.id, data.name, data.employeeId || '', data.role || '', data.paymentType != null ? data.paymentType : null, data.hourlyRate || 0, data.salary || 0, data.bankDetails || '', now);
            return exports.employeesAdapter.getById(data.id);
        }
        catch (error) {
            console.error('Error in employeesAdapter.create:', error);
            throw error;
        }
    },
    update: (id, data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            const now = new Date().toISOString();
            const stmt = db.prepare(`
        UPDATE customers 
        SET name = ?, company = ?, email = ?, phone = ?, address = ?, updatedAt = ?
        WHERE id = ?
      `);
            stmt.run(data.name, data.company || '', data.email || '', data.phone || '', data.address || '', now, id);
            return exports.customersAdapter.getById(id);
        }
        catch (error) {
            console.error('Error in customersAdapter.update:', error);
            throw error;
        }
    },
    delete: (id) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
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
        }
        catch (error) {
            console.error('Error in customersAdapter.delete:', error);
            throw error;
        }
    },
};
// ==================== VENDORS ====================
exports.vendorsAdapter = {
    getAll: () => {
        const db = getDb();
        if (!db)
            return [];
        try {
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
        }
        catch (error) {
            console.error('Error in vendorsAdapter.getAll:', error);
            return [];
        }
    },
    getById: (id) => {
        const db = getDb();
        if (!db)
            return null;
        try {
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
        }
        catch (error) {
            console.error('Error in vendorsAdapter.getById:', error);
            return null;
        }
    },
    create: (data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            const now = new Date().toISOString();
            const stmt = db.prepare(`
        INSERT INTO vendors (id, name, contactPerson, email, phone, address, bankDetails, paymentTerms, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(data.id, data.name, data.contactPerson || '', data.email || '', data.phone || '', data.address || '', data.bankDetails || '', data.paymentTerms || '', now);
            return exports.vendorsAdapter.getById(data.id);
        }
        catch (error) {
            console.error('Error in vendorsAdapter.create:', error);
            throw error;
        }
    },
    update: (id, data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            const stmt = db.prepare(`
        UPDATE vendors 
        SET name = ?, contactPerson = ?, email = ?, phone = ?, address = ?, bankDetails = ?, paymentTerms = ?
        WHERE id = ?
      `);
            stmt.run(data.name, data.contactPerson || '', data.email || '', data.phone || '', data.address || '', data.bankDetails || '', data.paymentTerms || '', id);
            return exports.vendorsAdapter.getById(id);
        }
        catch (error) {
            console.error('Error in vendorsAdapter.update:', error);
            throw error;
        }
    },
    delete: (id) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
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
        }
        catch (error) {
            console.error('Error in vendorsAdapter.delete:', error);
            throw error;
        }
    },
};
// ==================== EMPLOYEES ====================
exports.employeesAdapter = {
    getAll: () => {
        const db = getDb();
        if (!db)
            return [];
        try {
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
        }
        catch (error) {
            console.error('Error in employeesAdapter.getAll:', error);
            return [];
        }
    },
    getById: (id) => {
        const db = getDb();
        if (!db)
            return null;
        try {
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
        }
        catch (error) {
            console.error('Error in employeesAdapter.getById:', error);
            return null;
        }
    },
    create: (data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            const now = new Date().toISOString();
            const stmt = db.prepare(`
        INSERT INTO employees (id, name, employeeId, role, paymentType, hourlyRate, salary, bankDetails, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(data.id, data.name, data.employeeId || '', data.role || '', data.paymentType != null ? data.paymentType : null, data.hourlyRate || 0, data.salary || 0, data.bankDetails || '', now);
            return exports.employeesAdapter.getById(data.id);
        }
        catch (error) {
            console.error('Error in employeesAdapter.create:', error);
            throw error;
        }
    },
    update: (id, data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            const stmt = db.prepare(`
        UPDATE employees 
        SET name = ?, employeeId = ?, role = ?, paymentType = ?, hourlyRate = ?, salary = ?, bankDetails = ?
        WHERE id = ?
      `);
            stmt.run(data.name, data.employeeId || '', data.role || '', data.paymentType != null ? data.paymentType : null, data.hourlyRate || 0, data.salary || 0, data.bankDetails || '', id);
            return exports.employeesAdapter.getById(id);
        }
        catch (error) {
            console.error('Error in employeesAdapter.update:', error);
            throw error;
        }
    },
    delete: (id) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
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
        }
        catch (error) {
            console.error('Error in employeesAdapter.delete:', error);
            throw error;
        }
    },
};
// ==================== PAYSLIPS ====================
exports.payslipsAdapter = {
    getAll: () => {
        const db = getDb();
        if (!db)
            return [];
        try {
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
            if (!db)
                return null;
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
            if (!db)
                return [];
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
            if (!db) {
                throw new Error('Database is not available. App is using client-side storage.');
            }
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
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
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
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        db.prepare('DELETE FROM payslips WHERE id = ?').run(id);
    },
};
// ==================== VEHICLES ====================
exports.vehiclesAdapter = {
    getAll: () => {
        const db = getDb();
        if (!db)
            return [];
        try {
            const rows = db.prepare('SELECT * FROM vehicles ORDER BY createdAt DESC').all();
            return rows.map(row => ({
                id: row.id,
                vehicleNumber: row.vehicleNumber || row.type || '', // Fallback to type for migration
                vehicleType: row.vehicleType || '',
                make: row.make || '',
                model: row.model || '',
                year: row.year || undefined,
                color: row.color || '',
                purchasePrice: row.purchasePrice || undefined,
                purchaseDate: row.purchaseDate || '',
                currentValue: row.currentValue || undefined,
                insuranceCostMonthly: row.insuranceCostMonthly || undefined,
                financingCostMonthly: row.financingCostMonthly || undefined,
                odometerReading: row.odometerReading || undefined,
                lastServiceDate: row.lastServiceDate || '',
                nextServiceDue: row.nextServiceDue || '',
                fuelType: row.fuelType || undefined,
                status: row.status || 'active',
                registrationExpiry: row.registrationExpiry || '',
                insuranceExpiry: row.insuranceExpiry || '',
                description: row.description || '',
                basePrice: row.basePrice || 0,
                notes: row.notes || '',
                createdAt: row.createdAt,
            }));
        }
        catch (error) {
            console.error('Error in vehiclesAdapter.getAll:', error);
            return [];
        }
    },
    getById: (id) => {
        const db = getDb();
        if (!db)
            return null;
        try {
            const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
            if (!row)
                return null;
            return {
                id: row.id,
                vehicleNumber: row.vehicleNumber || row.type || '',
                vehicleType: row.vehicleType || '',
                make: row.make || '',
                model: row.model || '',
                year: row.year || undefined,
                color: row.color || '',
                purchasePrice: row.purchasePrice || undefined,
                purchaseDate: row.purchaseDate || '',
                currentValue: row.currentValue || undefined,
                insuranceCostMonthly: row.insuranceCostMonthly || undefined,
                financingCostMonthly: row.financingCostMonthly || undefined,
                odometerReading: row.odometerReading || undefined,
                lastServiceDate: row.lastServiceDate || '',
                nextServiceDue: row.nextServiceDue || '',
                fuelType: row.fuelType || undefined,
                status: row.status || 'active',
                registrationExpiry: row.registrationExpiry || '',
                insuranceExpiry: row.insuranceExpiry || '',
                description: row.description || '',
                basePrice: row.basePrice || 0,
                notes: row.notes || '',
                createdAt: row.createdAt,
            };
        }
        catch (error) {
            console.error('Error in vehiclesAdapter.getById:', error);
            return null;
        }
    },
    create: (data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            const now = new Date().toISOString();
            // Validate vehicle number is provided
            if (!data.vehicleNumber || data.vehicleNumber.trim() === '') {
                throw new Error('Vehicle Number is required');
            }
            // Check uniqueness of vehicle number
            const existing = db.prepare('SELECT id FROM vehicles WHERE vehicleNumber = ?').get(data.vehicleNumber.trim());
            if (existing) {
                throw new Error(`Vehicle Number "${data.vehicleNumber}" already exists`);
            }
            const stmt = db.prepare(`
      INSERT INTO vehicles (
        id, vehicleNumber, vehicleType, make, model, year, color,
        purchasePrice, purchaseDate, currentValue, insuranceCostMonthly, financingCostMonthly,
        odometerReading, lastServiceDate, nextServiceDue, fuelType, status,
        registrationExpiry, insuranceExpiry, description, basePrice, notes, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
            stmt.run(data.id, data.vehicleNumber.trim(), data.vehicleType || '', data.make || '', data.model || '', data.year || null, data.color || '', data.purchasePrice || null, data.purchaseDate || '', data.currentValue || null, data.insuranceCostMonthly || null, data.financingCostMonthly || null, data.odometerReading || null, data.lastServiceDate || '', data.nextServiceDue || '', data.fuelType || null, data.status || 'active', data.registrationExpiry || '', data.insuranceExpiry || '', data.description || '', data.basePrice || 0, data.notes || '', now);
            return exports.vehiclesAdapter.getById(data.id);
        }
        catch (error) {
            console.error('Error in vehiclesAdapter.create:', error);
            throw error;
        }
    },
    update: (id, data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            // Validate vehicle number is provided
            if (!data.vehicleNumber || data.vehicleNumber.trim() === '') {
                throw new Error('Vehicle Number is required');
            }
            // Check uniqueness of vehicle number (excluding current vehicle)
            const existing = db.prepare('SELECT id FROM vehicles WHERE vehicleNumber = ? AND id != ?').get(data.vehicleNumber.trim(), id);
            if (existing) {
                throw new Error(`Vehicle Number "${data.vehicleNumber}" already exists`);
            }
            const stmt = db.prepare(`
      UPDATE vehicles 
      SET vehicleNumber = ?, vehicleType = ?, make = ?, model = ?, year = ?, color = ?,
          purchasePrice = ?, purchaseDate = ?, currentValue = ?, insuranceCostMonthly = ?, financingCostMonthly = ?,
          odometerReading = ?, lastServiceDate = ?, nextServiceDue = ?, fuelType = ?, status = ?,
          registrationExpiry = ?, insuranceExpiry = ?, description = ?, basePrice = ?, notes = ?
      WHERE id = ?
    `);
            stmt.run(data.vehicleNumber.trim(), data.vehicleType || '', data.make || '', data.model || '', data.year || null, data.color || '', data.purchasePrice || null, data.purchaseDate || '', data.currentValue || null, data.insuranceCostMonthly || null, data.financingCostMonthly || null, data.odometerReading || null, data.lastServiceDate || '', data.nextServiceDue || '', data.fuelType || null, data.status || 'active', data.registrationExpiry || '', data.insuranceExpiry || '', data.description || '', data.basePrice || 0, data.notes || '', id);
            return exports.vehiclesAdapter.getById(id);
        }
        catch (error) {
            console.error('Error in vehiclesAdapter.update:', error);
            throw error;
        }
    },
    delete: (id) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
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
        }
        catch (error) {
            console.error('Error in vehiclesAdapter.delete:', error);
            throw error;
        }
    },
};
// ==================== ADMIN SETTINGS ====================
exports.adminAdapter = {
    get: () => {
        const db = getDb();
        if (!db)
            return null;
        // Ensure migration runs - check and add columns if needed
        try {
            const tableInfo = db.prepare("PRAGMA table_info(admin_settings)").all();
            const columnNames = tableInfo.map((col) => col.name);
            if (!columnNames.includes('showRevenueTrend')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showRevenueTrend INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showQuickActions')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showQuickActions INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showVehicleFinances')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showVehicleFinances INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showQuotationsInvoicesCard')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showQuotationsInvoicesCard INTEGER DEFAULT 1');
            }
            if (!columnNames.includes('showEmployeeSalariesCard')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showEmployeeSalariesCard INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showVehicleRevenueExpensesCard')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showVehicleRevenueExpensesCard INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showActivityThisMonth')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showActivityThisMonth INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showFinancialHealth')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showFinancialHealth INTEGER DEFAULT 1');
            }
            if (!columnNames.includes('showBusinessOverview')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showBusinessOverview INTEGER DEFAULT 1');
            }
            if (!columnNames.includes('showTopCustomers')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showTopCustomers INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showActivitySummary')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showActivitySummary INTEGER DEFAULT 0');
            }
        }
        catch (error) {
            console.log('Migration check:', error.message);
        }
        const row = db.prepare('SELECT * FROM admin_settings LIMIT 1').get();
        if (!row)
            return null;
        // Convert integer (0/1) to boolean, default to false if undefined
        // Explicitly check: 0 -> false, 1 -> true, null/undefined -> false
        const showRevenueTrend = (row.showRevenueTrend === 0)
            ? false
            : (row.showRevenueTrend === 1)
                ? true
                : false; // default to false if null/undefined
        const showQuickActions = (row.showQuickActions === 0)
            ? false
            : (row.showQuickActions === 1)
                ? true
                : false; // default to false if null/undefined
        const showReports = (row.showReports === 0)
            ? false
            : (row.showReports === 1)
                ? true
                : false; // default to false if null/undefined
        const showVehicleFinances = (row.showVehicleFinances === 0)
            ? false
            : (row.showVehicleFinances === 1)
                ? true
                : false; // default to false if null/undefined
        const showQuotationsInvoicesCard = (row.showQuotationsInvoicesCard === 0)
            ? false
            : (row.showQuotationsInvoicesCard === 1)
                ? true
                : true; // default to true if null/undefined
        const showEmployeeSalariesCard = (row.showEmployeeSalariesCard === 0)
            ? false
            : (row.showEmployeeSalariesCard === 1)
                ? true
                : false; // default to false if null/undefined
        const showVehicleRevenueExpensesCard = (row.showVehicleRevenueExpensesCard === 0)
            ? false
            : (row.showVehicleRevenueExpensesCard === 1)
                ? true
                : false; // default to false if null/undefined
        const showActivityThisMonth = (row.showActivityThisMonth === 0)
            ? false
            : (row.showActivityThisMonth === 1)
                ? true
                : false; // default to false if null/undefined
        const showFinancialHealth = (row.showFinancialHealth === 0)
            ? false
            : (row.showFinancialHealth === 1)
                ? true
                : true; // default to true if null/undefined
        const showBusinessOverview = (row.showBusinessOverview === 0)
            ? false
            : (row.showBusinessOverview === 1)
                ? true
                : true; // default to true if null/undefined
        const showTopCustomers = (row.showTopCustomers === 0)
            ? false
            : (row.showTopCustomers === 1)
                ? true
                : false; // default to false if null/undefined
        const showActivitySummary = (row.showActivitySummary === 0)
            ? false
            : (row.showActivitySummary === 1)
                ? true
                : false; // default to false if null/undefined
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
            showVehicleFinances,
            showQuotationsInvoicesCard,
            showEmployeeSalariesCard,
            showVehicleRevenueExpensesCard,
            showActivityThisMonth,
            showFinancialHealth,
            showBusinessOverview,
            showTopCustomers,
            showActivitySummary,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    },
    save: (data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        // Ensure migration runs before save
        try {
            const tableInfo = db.prepare("PRAGMA table_info(admin_settings)").all();
            const columnNames = tableInfo.map((col) => col.name);
            if (!columnNames.includes('showRevenueTrend')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showRevenueTrend INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showQuickActions')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showQuickActions INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showReports')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showReports INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showVehicleFinances')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showVehicleFinances INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showQuotationsInvoicesCard')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showQuotationsInvoicesCard INTEGER DEFAULT 1');
            }
            if (!columnNames.includes('showEmployeeSalariesCard')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showEmployeeSalariesCard INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showVehicleRevenueExpensesCard')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showVehicleRevenueExpensesCard INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showActivityThisMonth')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showActivityThisMonth INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showFinancialHealth')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showFinancialHealth INTEGER DEFAULT 1');
            }
            if (!columnNames.includes('showBusinessOverview')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showBusinessOverview INTEGER DEFAULT 1');
            }
            if (!columnNames.includes('showTopCustomers')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showTopCustomers INTEGER DEFAULT 0');
            }
            if (!columnNames.includes('showActivitySummary')) {
                db.exec('ALTER TABLE admin_settings ADD COLUMN showActivitySummary INTEGER DEFAULT 0');
            }
        }
        catch (error) {
            console.log('Migration check in save:', error.message);
        }
        const now = new Date().toISOString();
        // Get existing record (but don't use its boolean values - use the data being saved)
        const existing = db.prepare('SELECT id FROM admin_settings LIMIT 1').get();
        // Convert boolean to integer (SQLite doesn't have native boolean)
        // Explicitly handle: false -> 0, true -> 1, undefined/null -> 0 (default)
        const showRevenueTrend = (data.showRevenueTrend === true) ? 1 : 0;
        const showQuickActions = (data.showQuickActions === true) ? 1 : 0;
        const showReports = (data.showReports === true) ? 1 : 0;
        const showVehicleFinances = (data.showVehicleFinances === true) ? 1 : 0;
        const showQuotationsInvoicesCard = (data.showQuotationsInvoicesCard === true) ? 1 : 0;
        const showEmployeeSalariesCard = (data.showEmployeeSalariesCard === true) ? 1 : 0;
        const showVehicleRevenueExpensesCard = (data.showVehicleRevenueExpensesCard === true) ? 1 : 0;
        const showActivityThisMonth = (data.showActivityThisMonth === true) ? 1 : 0;
        const showFinancialHealth = (data.showFinancialHealth === true) ? 1 : 0;
        const showBusinessOverview = (data.showBusinessOverview === true) ? 1 : 0;
        const showTopCustomers = (data.showTopCustomers === true) ? 1 : 0;
        const showActivitySummary = (data.showActivitySummary === true) ? 1 : 0;
        console.log('Adapter save - converting:', {
            showRevenueTrend: { input: data.showRevenueTrend, output: showRevenueTrend },
            showQuickActions: { input: data.showQuickActions, output: showQuickActions },
            showReports: { input: data.showReports, output: showReports },
            showVehicleFinances: { input: data.showVehicleFinances, output: showVehicleFinances },
            showQuotationsInvoicesCard: { input: data.showQuotationsInvoicesCard, output: showQuotationsInvoicesCard },
            showEmployeeSalariesCard: { input: data.showEmployeeSalariesCard, output: showEmployeeSalariesCard },
            showVehicleRevenueExpensesCard: { input: data.showVehicleRevenueExpensesCard, output: showVehicleRevenueExpensesCard },
            showActivityThisMonth: { input: data.showActivityThisMonth, output: showActivityThisMonth },
            showFinancialHealth: { input: data.showFinancialHealth, output: showFinancialHealth },
            showBusinessOverview: { input: data.showBusinessOverview, output: showBusinessOverview },
            showTopCustomers: { input: data.showTopCustomers, output: showTopCustomers },
            showActivitySummary: { input: data.showActivitySummary, output: showActivitySummary },
        });
        if (existing) {
            const stmt = db.prepare(`
        UPDATE admin_settings 
        SET companyName = ?, address = ?, vatNumber = ?, logoUrl = ?, sealUrl = ?, 
            signatureUrl = ?, quoteNumberPattern = ?, currency = ?, defaultTerms = ?, 
            showRevenueTrend = ?, showQuickActions = ?, showReports = ?, showVehicleFinances = ?, 
            showQuotationsInvoicesCard = ?, showEmployeeSalariesCard = ?, showVehicleRevenueExpensesCard = ?, 
            showActivityThisMonth = ?, showFinancialHealth = ?, showBusinessOverview = ?, 
            showTopCustomers = ?, showActivitySummary = ?, updatedAt = ?
        WHERE id = ?
      `);
            const result = stmt.run(data.companyName || '', data.address || '', data.vatNumber || '', data.logoUrl || null, data.sealUrl || null, data.signatureUrl || null, data.quoteNumberPattern || 'AAT-YYYYMMDD-NNNN', data.currency || 'AED', data.defaultTerms || '', showRevenueTrend, showQuickActions, showReports, showVehicleFinances, showQuotationsInvoicesCard, showEmployeeSalariesCard, showVehicleRevenueExpensesCard, showActivityThisMonth, showFinancialHealth, showBusinessOverview, showTopCustomers, showActivitySummary, now, existing.id);
        }
        else {
            const stmt = db.prepare(`
        INSERT INTO admin_settings (id, companyName, address, vatNumber, logoUrl, sealUrl, 
                                    signatureUrl, quoteNumberPattern, currency, defaultTerms, 
                                    showRevenueTrend, showQuickActions, showReports, showVehicleFinances, 
                                    showQuotationsInvoicesCard, showEmployeeSalariesCard, showVehicleRevenueExpensesCard, 
                                    showActivityThisMonth, showFinancialHealth, showBusinessOverview, 
                                    showTopCustomers, showActivitySummary, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(data.id || 'settings_1', data.companyName || '', data.address || '', data.vatNumber || '', data.logoUrl || null, data.sealUrl || null, data.signatureUrl || null, data.quoteNumberPattern || 'AAT-YYYYMMDD-NNNN', data.currency || 'AED', data.defaultTerms || '', showRevenueTrend, showQuickActions, showReports, showVehicleFinances, showQuotationsInvoicesCard, showEmployeeSalariesCard, showVehicleRevenueExpensesCard, showActivityThisMonth, showFinancialHealth, showBusinessOverview, showTopCustomers, showActivitySummary, now, now);
        }
        return exports.adminAdapter.get();
    },
};
// ==================== QUOTES ====================
exports.quotesAdapter = {
    getAll: () => {
        const db = getDb();
        if (!db)
            return [];
        try {
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
        }
        catch (error) {
            console.error('Error in quotesAdapter.getAll:', error);
            return [];
        }
    },
    getById: (id) => {
        const db = getDb();
        if (!db)
            return null;
        try {
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
        }
        catch (error) {
            console.error('Error in quotesAdapter.getById:', error);
            return null;
        }
    },
    create: (data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
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
        }
        catch (error) {
            console.error('Error in quotesAdapter.create:', error);
            throw error;
        }
    },
    update: (id, data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
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
        }
        catch (error) {
            console.error('Error in quotesAdapter.update:', error);
            throw error;
        }
    },
    delete: (id) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
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
        }
        catch (error) {
            console.error('Error in quotesAdapter.delete:', error);
            throw error;
        }
    },
};
// ==================== PURCHASE ORDERS ====================
exports.purchaseOrdersAdapter = {
    getAll: () => {
        const db = getDb();
        if (!db)
            return [];
        try {
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
                        serialNumber: item.serialNumber || undefined,
                        vehicleTypeId: item.vehicleTypeId || undefined,
                        vehicleTypeLabel: item.vehicleTypeLabel || undefined,
                        vehicleNumber: item.vehicleNumber || undefined,
                        description: item.description || undefined,
                        rentalBasis: item.rentalBasis || undefined,
                        quantity: item.quantity || 0,
                        unitPrice: item.unitPrice || 0,
                        taxPercent: item.taxPercent || undefined,
                        tax: item.tax || undefined,
                        grossAmount: item.grossAmount || undefined,
                        lineTaxAmount: item.lineTaxAmount || undefined,
                        lineTotal: item.lineTotal || undefined,
                        total: item.total || 0,
                        amountReceived: item.amountReceived || undefined,
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
        }
        catch (error) {
            console.error('Error in purchaseOrdersAdapter.getAll:', error);
            return [];
        }
    },
    getById: (id) => {
        const db = getDb();
        if (!db)
            return null;
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
                serialNumber: item.serialNumber || undefined,
                vehicleTypeId: item.vehicleTypeId || undefined,
                vehicleTypeLabel: item.vehicleTypeLabel || undefined,
                vehicleNumber: item.vehicleNumber || undefined,
                description: item.description || undefined,
                rentalBasis: item.rentalBasis || undefined,
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                taxPercent: item.taxPercent || undefined,
                tax: item.tax || undefined,
                grossAmount: item.grossAmount || undefined,
                lineTaxAmount: item.lineTaxAmount || undefined,
                lineTotal: item.lineTotal || undefined,
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
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
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
        INSERT INTO po_items (id, purchaseOrderId, serialNumber, vehicleTypeId, vehicleTypeLabel, vehicleNumber, 
                              description, rentalBasis, quantity, unitPrice, taxPercent, tax, 
                              grossAmount, lineTaxAmount, lineTotal, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const insertItems = db.transaction((items) => {
                for (const item of items) {
                    itemStmt.run(item.id, data.id, item.serialNumber || null, item.vehicleTypeId || null, item.vehicleTypeLabel || null, item.vehicleNumber || null, item.description || null, item.rentalBasis || null, item.quantity || 0, item.unitPrice || 0, item.taxPercent || null, item.tax || null, item.grossAmount || null, item.lineTaxAmount || null, item.lineTotal || null, item.total || 0);
                }
            });
            insertItems(data.items);
        }
        return exports.purchaseOrdersAdapter.getById(data.id);
    },
    update: (id, data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
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
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
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
        if (!db)
            return [];
        try {
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
                        serialNumber: item.serialNumber || undefined,
                        vehicleTypeId: item.vehicleTypeId || undefined,
                        vehicleTypeLabel: item.vehicleTypeLabel || undefined,
                        vehicleNumber: item.vehicleNumber || undefined,
                        description: item.description || undefined,
                        rentalBasis: item.rentalBasis || undefined,
                        quantity: item.quantity || 0,
                        unitPrice: item.unitPrice || 0,
                        taxPercent: item.taxPercent || undefined,
                        tax: item.tax || undefined,
                        grossAmount: item.grossAmount || undefined,
                        lineTaxAmount: item.lineTaxAmount || undefined,
                        lineTotal: item.lineTotal || undefined,
                        total: item.total || 0,
                        amountReceived: item.amountReceived || undefined,
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
        }
        catch (error) {
            console.error('Error in invoicesAdapter.getAll:', error);
            return [];
        }
    },
    getById: (id) => {
        const db = getDb();
        if (!db)
            return null;
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
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
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
        INSERT INTO invoice_items (id, invoiceId, serialNumber, vehicleTypeId, vehicleTypeLabel, vehicleNumber, 
                                   description, rentalBasis, quantity, unitPrice, taxPercent, tax, 
                                   grossAmount, lineTaxAmount, lineTotal, total, amountReceived)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            try {
                const insertItems = db.transaction((items) => {
                    for (const item of items) {
                        itemStmt.run(item.id, data.id, item.serialNumber || null, item.vehicleTypeId || null, item.vehicleTypeLabel || null, item.vehicleNumber || null, item.description || null, item.rentalBasis || null, item.quantity || 0, item.unitPrice || 0, item.taxPercent || null, item.tax || null, item.grossAmount || null, item.lineTaxAmount || null, item.lineTotal || null, item.total || 0, item.amountReceived || null);
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
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
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
        INSERT INTO invoice_items (id, invoiceId, serialNumber, vehicleTypeId, vehicleTypeLabel, vehicleNumber, 
                                   description, rentalBasis, quantity, unitPrice, taxPercent, tax, 
                                   grossAmount, lineTaxAmount, lineTotal, total, amountReceived)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const insertItems = db.transaction((items) => {
                for (const item of items) {
                    itemStmt.run(item.id, id, item.serialNumber || null, item.vehicleTypeId || null, item.vehicleTypeLabel || null, item.vehicleNumber || null, item.description || null, item.rentalBasis || null, item.quantity || 0, item.unitPrice || 0, item.taxPercent || null, item.tax || null, item.grossAmount || null, item.lineTaxAmount || null, item.lineTotal || null, item.total || 0, item.amountReceived || null);
                }
            });
            insertItems(data.items);
        }
        return exports.invoicesAdapter.getById(id);
    },
    delete: (id) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            // Items will be deleted automatically due to CASCADE
            db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
        }
        catch (error) {
            console.error('Error in invoicesAdapter.delete:', error);
            throw error;
        }
    },
};
// ==================== EXPENSE CATEGORIES ====================
exports.expenseCategoriesAdapter = {
    getAll: () => {
        const db = getDb();
        if (!db)
            return [];
        try {
            const rows = db.prepare('SELECT * FROM expense_categories ORDER BY isCustom ASC, name ASC').all();
            return rows.map(row => ({
                id: row.id,
                name: row.name,
                isCustom: row.isCustom === 1,
                createdAt: row.createdAt,
            }));
        }
        catch (error) {
            console.error('Error in expenseCategoriesAdapter.getAll:', error);
            return [];
        }
    },
    getById: (id) => {
        const db = getDb();
        if (!db)
            return null;
        try {
            const row = db.prepare('SELECT * FROM expense_categories WHERE id = ?').get(id);
            if (!row)
                return null;
            return {
                id: row.id,
                name: row.name,
                isCustom: row.isCustom === 1,
                createdAt: row.createdAt,
            };
        }
        catch (error) {
            console.error('Error in expenseCategoriesAdapter.getById:', error);
            return null;
        }
    },
    create: (data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            // Validate required fields
            if (!data.name || !data.name.trim()) {
                throw new Error('Category name is required');
            }
            // Generate ID if not provided
            const id = data.id || `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Check for duplicate name
            const existing = db.prepare('SELECT id FROM expense_categories WHERE LOWER(name) = LOWER(?)').get(data.name.trim());
            if (existing) {
                throw new Error('Category with this name already exists');
            }
            const now = new Date().toISOString();
            const stmt = db.prepare(`
        INSERT INTO expense_categories (id, name, isCustom, createdAt)
        VALUES (?, ?, ?, ?)
      `);
            stmt.run(id, data.name.trim(), data.isCustom ? 1 : 0, now);
            return exports.expenseCategoriesAdapter.getById(id);
        }
        catch (error) {
            if (error.message && error.message.includes('UNIQUE constraint')) {
                throw new Error('Category with this ID or name already exists');
            }
            console.error('Error in expenseCategoriesAdapter.create:', error);
            throw error;
        }
    },
    update: (id, data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            const stmt = db.prepare(`
        UPDATE expense_categories 
        SET name = ?, isCustom = ?
        WHERE id = ?
      `);
            stmt.run(data.name, data.isCustom ? 1 : 0, id);
            return exports.expenseCategoriesAdapter.getById(id);
        }
        catch (error) {
            console.error('Error in expenseCategoriesAdapter.update:', error);
            throw error;
        }
    },
    delete: (id) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            // Check if category is predefined
            const category = db.prepare('SELECT isCustom FROM expense_categories WHERE id = ?').get(id);
            if (category && category.isCustom === 0) {
                throw new Error('Cannot delete predefined expense category');
            }
            // Check if category is used in transactions
            const transactions = db.prepare('SELECT COUNT(*) as count FROM vehicle_transactions WHERE category = (SELECT name FROM expense_categories WHERE id = ?)').get(id);
            if (transactions && transactions.count > 0) {
                throw new Error('Cannot delete expense category that is used in transactions');
            }
            db.prepare('DELETE FROM expense_categories WHERE id = ?').run(id);
        }
        catch (error) {
            console.error('Error in expenseCategoriesAdapter.delete:', error);
            throw error;
        }
    },
};
// ==================== VEHICLE TRANSACTIONS ====================
exports.vehicleTransactionsAdapter = {
    getAll: () => {
        const db = getDb();
        if (!db)
            return [];
        try {
            const rows = db.prepare('SELECT * FROM vehicle_transactions ORDER BY date DESC, createdAt DESC').all();
            return rows.map(row => ({
                id: row.id,
                vehicleId: row.vehicleId,
                transactionType: row.transactionType,
                category: row.category || undefined,
                amount: row.amount,
                date: row.date,
                month: row.month,
                description: row.description || undefined,
                employeeId: row.employeeId || undefined,
                invoiceId: row.invoiceId || undefined,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            }));
        }
        catch (error) {
            console.error('Error in vehicleTransactionsAdapter.getAll:', error);
            return [];
        }
    },
    getById: (id) => {
        const db = getDb();
        if (!db)
            return null;
        try {
            const row = db.prepare('SELECT * FROM vehicle_transactions WHERE id = ?').get(id);
            if (!row)
                return null;
            return {
                id: row.id,
                vehicleId: row.vehicleId,
                transactionType: row.transactionType,
                category: row.category || undefined,
                amount: row.amount,
                date: row.date,
                month: row.month,
                description: row.description || undefined,
                employeeId: row.employeeId || undefined,
                invoiceId: row.invoiceId || undefined,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            };
        }
        catch (error) {
            console.error('Error in vehicleTransactionsAdapter.getById:', error);
            return null;
        }
    },
    getByVehicleId: (vehicleId) => {
        const db = getDb();
        if (!db)
            return [];
        try {
            const rows = db.prepare('SELECT * FROM vehicle_transactions WHERE vehicleId = ? ORDER BY date DESC, createdAt DESC').all(vehicleId);
            return rows.map(row => ({
                id: row.id,
                vehicleId: row.vehicleId,
                transactionType: row.transactionType,
                category: row.category || undefined,
                amount: row.amount,
                date: row.date,
                month: row.month,
                description: row.description || undefined,
                employeeId: row.employeeId || undefined,
                invoiceId: row.invoiceId || undefined,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            }));
        }
        catch (error) {
            console.error('Error in vehicleTransactionsAdapter.getByVehicleId:', error);
            return [];
        }
    },
    getByVehicleIdAndMonth: (vehicleId, month) => {
        const db = getDb();
        if (!db)
            return [];
        try {
            const rows = db.prepare('SELECT * FROM vehicle_transactions WHERE vehicleId = ? AND month = ? ORDER BY date DESC, createdAt DESC').all(vehicleId, month);
            return rows.map(row => ({
                id: row.id,
                vehicleId: row.vehicleId,
                transactionType: row.transactionType,
                category: row.category || undefined,
                amount: row.amount,
                date: row.date,
                month: row.month,
                description: row.description || undefined,
                employeeId: row.employeeId || undefined,
                invoiceId: row.invoiceId || undefined,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            }));
        }
        catch (error) {
            console.error('Error in vehicleTransactionsAdapter.getByVehicleIdAndMonth:', error);
            return [];
        }
    },
    getProfitabilityByVehicle: (vehicleId) => {
        const db = getDb();
        if (!db)
            return null;
        try {
            const transactions = exports.vehicleTransactionsAdapter.getByVehicleId(vehicleId);
            // Debug logging
            if (process.env.NODE_ENV === 'development') {
                console.log(`[getProfitabilityByVehicle] Vehicle ID: ${vehicleId}, Transactions: ${transactions.length}`);
                if (transactions.length > 0) {
                    console.log('[getProfitabilityByVehicle] Sample transactions:', transactions.slice(0, 5).map(t => ({
                        id: t.id,
                        month: t.month,
                        normalizedMonth: t.month ? (t.month.includes('-') && t.month.split('-')[1].length === 1 ? `${t.month.split('-')[0]}-${t.month.split('-')[1].padStart(2, '0')}` : t.month) : 'N/A',
                        type: t.transactionType,
                        amount: t.amount,
                        date: t.date
                    })));
                    // Show unique months in transactions
                    const uniqueMonths = [...new Set(transactions.map(t => t.month).filter(Boolean))];
                    console.log('[getProfitabilityByVehicle] Unique months in transactions:', uniqueMonths.sort());
                }
            }
            // Group by month
            const monthlyData = {};
            // Normalize month format to YYYY-MM
            const normalizeMonth = (month, date) => {
                if (month) {
                    // Normalize month format (e.g., "2025-1" -> "2025-01")
                    const parts = month.split('-');
                    if (parts.length === 2) {
                        const year = parts[0];
                        const monthNum = parts[1].padStart(2, '0');
                        return `${year}-${monthNum}`;
                    }
                    return month;
                }
                if (date) {
                    // Extract month from date (YYYY-MM-DD -> YYYY-MM)
                    return date.substring(0, 7);
                }
                return '';
            };
            transactions.forEach(tx => {
                // Ensure month is in YYYY-MM format
                const monthKey = normalizeMonth(tx.month, tx.date);
                if (!monthKey) {
                    console.warn(`[getProfitabilityByVehicle] Transaction ${tx.id} has no month or date`);
                    return;
                }
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { revenue: 0, expenses: 0, count: 0 };
                }
                if (tx.transactionType === 'revenue') {
                    monthlyData[monthKey].revenue += tx.amount;
                }
                else {
                    monthlyData[monthKey].expenses += tx.amount;
                }
                monthlyData[monthKey].count++;
            });
            // Debug logging
            if (process.env.NODE_ENV === 'development') {
                console.log('[getProfitabilityByVehicle] Monthly data:', monthlyData);
                console.log('[getProfitabilityByVehicle] Monthly data keys:', Object.keys(monthlyData));
            }
            // Convert to array and calculate profit
            // monthlyData keys are already normalized, so we can use them directly
            const months = Object.keys(monthlyData).sort();
            const profitability = months.map(month => ({
                vehicleId,
                month, // Already normalized from monthlyData keys
                totalRevenue: monthlyData[month].revenue,
                totalExpenses: monthlyData[month].expenses,
                profit: monthlyData[month].revenue - monthlyData[month].expenses,
                transactionCount: monthlyData[month].count,
            }));
            // Debug logging
            if (process.env.NODE_ENV === 'development') {
                console.log('[getProfitabilityByVehicle] Profitability array:', profitability.map(p => ({
                    month: p.month,
                    revenue: p.totalRevenue,
                    expenses: p.totalExpenses,
                    profit: p.profit
                })));
            }
            // Calculate all-time totals
            const allTimeRevenue = transactions.filter(t => t.transactionType === 'revenue').reduce((sum, t) => sum + t.amount, 0);
            const allTimeExpenses = transactions.filter(t => t.transactionType === 'expense').reduce((sum, t) => sum + t.amount, 0);
            // Get current month and last month
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonthNum = now.getMonth() + 1;
            const currentMonth = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
            // Ensure we have data for current month and last month (even if zeros)
            const currentMonthData = profitability.find(p => p.month === currentMonth) || {
                vehicleId,
                month: currentMonth,
                totalRevenue: 0,
                totalExpenses: 0,
                profit: 0,
                transactionCount: 0,
            };
            const lastMonthData = profitability.find(p => p.month === lastMonth) || {
                vehicleId,
                month: lastMonth,
                totalRevenue: 0,
                totalExpenses: 0,
                profit: 0,
                transactionCount: 0,
            };
            // Generate last 12 months from current month (rolling 12 months)
            const allMonths = [];
            for (let i = 11; i >= 0; i--) {
                const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const year = monthDate.getFullYear();
                const month = monthDate.getMonth() + 1;
                allMonths.push(`${year}-${String(month).padStart(2, '0')}`);
            }
            // Normalize month for matching (ensure YYYY-MM format)
            const normalizeMonthForMatch = (monthStr) => {
                const parts = monthStr.split('-');
                if (parts.length === 2) {
                    const year = parts[0];
                    const monthNum = parts[1].padStart(2, '0');
                    return `${year}-${monthNum}`;
                }
                return monthStr;
            };
            // Create a complete months array with all 12 months
            const completeMonths = allMonths.map(month => {
                // Normalize both the target month and profitability months for matching
                const normalizedTargetMonth = normalizeMonthForMatch(month);
                const existing = profitability.find(p => {
                    const normalizedPMonth = normalizeMonthForMatch(p.month);
                    return normalizedPMonth === normalizedTargetMonth;
                });
                const result = existing || {
                    vehicleId,
                    month: normalizedTargetMonth,
                    totalRevenue: 0,
                    totalExpenses: 0,
                    profit: 0,
                    transactionCount: 0,
                };
                // Debug logging for matching
                if (process.env.NODE_ENV === 'development' && existing) {
                    console.log(`[getProfitabilityByVehicle] Matched month ${normalizedTargetMonth}:`, {
                        revenue: existing.totalRevenue,
                        expenses: existing.totalExpenses,
                        profit: existing.profit
                    });
                }
                return result;
            });
            // Debug logging
            if (process.env.NODE_ENV === 'development') {
                console.log('[getProfitabilityByVehicle] Complete months:', completeMonths.map(m => ({
                    month: m.month,
                    revenue: m.totalRevenue,
                    expenses: m.totalExpenses,
                    profit: m.profit
                })));
            }
            return {
                vehicleId,
                currentMonth: currentMonthData,
                lastMonth: lastMonthData,
                allTimeRevenue,
                allTimeExpenses,
                allTimeProfit: allTimeRevenue - allTimeExpenses,
                months: completeMonths,
            };
        }
        catch (error) {
            console.error('Error in vehicleTransactionsAdapter.getProfitabilityByVehicle:', error);
            return null;
        }
    },
    getDashboardMetrics: () => {
        const db = getDb();
        if (!db)
            return null;
        try {
            const allTransactions = exports.vehicleTransactionsAdapter.getAll();
            const allVehicles = exports.vehiclesAdapter.getAll();
            // Overall metrics
            const totalRevenue = allTransactions
                .filter(t => t.transactionType === 'revenue')
                .reduce((sum, t) => sum + t.amount, 0);
            const totalExpenses = allTransactions
                .filter(t => t.transactionType === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            const netProfit = totalRevenue - totalExpenses;
            const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
            const vehiclesWithData = allVehicles.filter(v => {
                const vehicleTransactions = allTransactions.filter(t => t.vehicleId === v.id);
                return vehicleTransactions.length > 0;
            });
            const avgRevenuePerVehicle = vehiclesWithData.length > 0 ? totalRevenue / vehiclesWithData.length : 0;
            const avgProfitPerVehicle = vehiclesWithData.length > 0 ? netProfit / vehiclesWithData.length : 0;
            const totalTransactions = allTransactions.length;
            const avgTransactionValue = totalTransactions > 0 ? (totalRevenue + totalExpenses) / totalTransactions : 0;
            // Time-based metrics
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
            const currentMonthTransactions = allTransactions.filter(t => t.month === currentMonth);
            const currentMonthRevenue = currentMonthTransactions.filter(t => t.transactionType === 'revenue').reduce((sum, t) => sum + t.amount, 0);
            const currentMonthExpenses = currentMonthTransactions.filter(t => t.transactionType === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const currentMonthProfit = currentMonthRevenue - currentMonthExpenses;
            const lastMonthTransactions = allTransactions.filter(t => t.month === lastMonth);
            const lastMonthRevenue = lastMonthTransactions.filter(t => t.transactionType === 'revenue').reduce((sum, t) => sum + t.amount, 0);
            const lastMonthExpenses = lastMonthTransactions.filter(t => t.transactionType === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const lastMonthProfit = lastMonthRevenue - lastMonthExpenses;
            const momRevenueGrowth = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
            const momExpensesGrowth = lastMonthExpenses > 0 ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;
            const momProfitGrowth = lastMonthProfit !== 0 ? ((currentMonthProfit - lastMonthProfit) / Math.abs(lastMonthProfit)) * 100 : 0;
            // Year-to-date (current year)
            const currentYear = now.getFullYear();
            const ytdTransactions = allTransactions.filter(t => {
                const txYear = parseInt(t.month.split('-')[0]);
                return txYear === currentYear;
            });
            const ytdRevenue = ytdTransactions.filter(t => t.transactionType === 'revenue').reduce((sum, t) => sum + t.amount, 0);
            const ytdExpenses = ytdTransactions.filter(t => t.transactionType === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const ytdProfit = ytdRevenue - ytdExpenses;
            // Monthly trend (last 12 months)
            const monthlyTrend = [];
            for (let i = 11; i >= 0; i--) {
                const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
                const monthTransactions = allTransactions.filter(t => t.month === monthStr);
                const monthRevenue = monthTransactions.filter(t => t.transactionType === 'revenue').reduce((sum, t) => sum + t.amount, 0);
                const monthExpenses = monthTransactions.filter(t => t.transactionType === 'expense').reduce((sum, t) => sum + t.amount, 0);
                monthlyTrend.push({
                    month: monthStr,
                    revenue: monthRevenue,
                    expenses: monthExpenses,
                    profit: monthRevenue - monthExpenses,
                });
            }
            // Vehicle-based metrics
            const vehicleMetrics = {};
            allVehicles.forEach(vehicle => {
                const vehicleTransactions = allTransactions.filter(t => t.vehicleId === vehicle.id);
                const revenue = vehicleTransactions.filter(t => t.transactionType === 'revenue').reduce((sum, t) => sum + t.amount, 0);
                const expenses = vehicleTransactions.filter(t => t.transactionType === 'expense').reduce((sum, t) => sum + t.amount, 0);
                vehicleMetrics[vehicle.id] = {
                    revenue,
                    expenses,
                    profit: revenue - expenses,
                    transactionCount: vehicleTransactions.length,
                };
            });
            const profitableVehicles = Object.values(vehicleMetrics).filter(v => v.profit > 0).length;
            const lossMakingVehicles = Object.values(vehicleMetrics).filter(v => v.profit < 0).length;
            const noDataVehicles = allVehicles.length - vehiclesWithData.length;
            const topByRevenue = Object.entries(vehicleMetrics)
                .map(([vehicleId, metrics]) => {
                const vehicle = allVehicles.find(v => v.id === vehicleId);
                return {
                    vehicleId,
                    vehicleNumber: vehicle?.vehicleNumber || 'Unknown',
                    revenue: metrics.revenue,
                };
            })
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);
            const topByProfit = Object.entries(vehicleMetrics)
                .map(([vehicleId, metrics]) => {
                const vehicle = allVehicles.find(v => v.id === vehicleId);
                return {
                    vehicleId,
                    vehicleNumber: vehicle?.vehicleNumber || 'Unknown',
                    profit: metrics.profit,
                };
            })
                .sort((a, b) => b.profit - a.profit)
                .slice(0, 5);
            const bottomByProfit = Object.entries(vehicleMetrics)
                .map(([vehicleId, metrics]) => {
                const vehicle = allVehicles.find(v => v.id === vehicleId);
                return {
                    vehicleId,
                    vehicleNumber: vehicle?.vehicleNumber || 'Unknown',
                    profit: metrics.profit,
                };
            })
                .sort((a, b) => a.profit - b.profit)
                .slice(0, 5);
            // Customer-based metrics (via invoiceId)
            const revenueTransactionsWithInvoice = allTransactions.filter(t => t.transactionType === 'revenue' && t.invoiceId);
            const customerRevenueMap = {};
            const invoiceIds = [...new Set(revenueTransactionsWithInvoice.map(t => t.invoiceId))];
            invoiceIds.forEach(invoiceId => {
                if (!invoiceId)
                    return;
                try {
                    const invoice = exports.invoicesAdapter.getById(invoiceId);
                    if (invoice && invoice.customerId) {
                        const customerRevenue = revenueTransactionsWithInvoice
                            .filter(t => t.invoiceId === invoiceId)
                            .reduce((sum, t) => sum + t.amount, 0);
                        customerRevenueMap[invoice.customerId] = (customerRevenueMap[invoice.customerId] || 0) + customerRevenue;
                    }
                }
                catch (e) {
                    // Skip if invoice doesn't exist
                }
            });
            const totalUniqueCustomers = Object.keys(customerRevenueMap).length;
            const topCustomersByRevenue = Object.entries(customerRevenueMap)
                .map(([customerId, revenue]) => {
                const customer = exports.customersAdapter.getById(customerId);
                return {
                    customerId,
                    customerName: customer?.name || 'Unknown',
                    revenue,
                };
            })
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);
            const avgRevenuePerCustomer = totalUniqueCustomers > 0 ? Object.values(customerRevenueMap).reduce((sum, rev) => sum + rev, 0) / totalUniqueCustomers : 0;
            // Category-based metrics
            const revenueByCategory = {};
            const expensesByCategory = {};
            allTransactions.forEach(t => {
                const category = t.category || (t.transactionType === 'revenue' ? 'Rental Income' : 'Other');
                if (t.transactionType === 'revenue') {
                    revenueByCategory[category] = (revenueByCategory[category] || 0) + t.amount;
                }
                else {
                    expensesByCategory[category] = (expensesByCategory[category] || 0) + t.amount;
                }
            });
            const topExpenseCategory = Object.entries(expensesByCategory)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
            // Operational metrics
            const revenuePerVehiclePerMonth = vehiclesWithData.length > 0 && monthlyTrend.length > 0
                ? monthlyTrend.reduce((sum, m) => sum + m.revenue, 0) / (vehiclesWithData.length * monthlyTrend.length)
                : 0;
            const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
            const mostActiveVehicle = Object.entries(vehicleMetrics)
                .map(([vehicleId, metrics]) => {
                const vehicle = allVehicles.find(v => v.id === vehicleId);
                return {
                    vehicleId,
                    vehicleNumber: vehicle?.vehicleNumber || 'Unknown',
                    transactionCount: metrics.transactionCount,
                };
            })
                .sort((a, b) => b.transactionCount - a.transactionCount)[0] || { vehicleId: '', vehicleNumber: 'N/A', transactionCount: 0 };
            const avgTransactionsPerVehicle = vehiclesWithData.length > 0 ? totalTransactions / vehiclesWithData.length : 0;
            return {
                overall: {
                    totalRevenue,
                    totalExpenses,
                    netProfit,
                    profitMargin,
                    avgRevenuePerVehicle,
                    avgProfitPerVehicle,
                    totalTransactions,
                    avgTransactionValue,
                },
                timeBased: {
                    currentMonth: { revenue: currentMonthRevenue, expenses: currentMonthExpenses, profit: currentMonthProfit },
                    lastMonth: { revenue: lastMonthRevenue, expenses: lastMonthExpenses, profit: lastMonthProfit },
                    momGrowth: { revenue: momRevenueGrowth, expenses: momExpensesGrowth, profit: momProfitGrowth },
                    ytd: { revenue: ytdRevenue, expenses: ytdExpenses, profit: ytdProfit },
                    monthlyTrend,
                },
                vehicleBased: {
                    totalActive: vehiclesWithData.length,
                    profitable: profitableVehicles,
                    lossMaking: lossMakingVehicles,
                    noData: noDataVehicles,
                    topByRevenue,
                    topByProfit,
                    bottomByProfit,
                },
                customerBased: {
                    totalUnique: totalUniqueCustomers,
                    topByRevenue: topCustomersByRevenue,
                    avgRevenuePerCustomer,
                },
                categoryBased: {
                    revenueByCategory,
                    expensesByCategory,
                    topExpenseCategory,
                },
                operational: {
                    revenuePerVehiclePerMonth,
                    expenseRatio,
                    mostActiveVehicle,
                    avgTransactionsPerVehicle,
                },
            };
        }
        catch (error) {
            console.error('Error in vehicleTransactionsAdapter.getDashboardMetrics:', error);
            return null;
        }
    },
    create: (data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            const now = new Date().toISOString();
            // Validate date is within 12 months and not future
            const txDate = new Date(data.date);
            const today = new Date();
            today.setHours(23, 59, 59, 999); // End of today
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
            twelveMonthsAgo.setHours(0, 0, 0, 0);
            if (txDate > today) {
                throw new Error('Transaction date cannot be in the future');
            }
            if (txDate < twelveMonthsAgo) {
                throw new Error('Transaction date cannot be more than 12 months in the past');
            }
            // Validate amount is positive
            if (!data.amount || data.amount <= 0) {
                throw new Error('Transaction amount must be greater than 0');
            }
            // Validate vehicle exists
            const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(data.vehicleId);
            if (!vehicle) {
                throw new Error(`Vehicle with ID "${data.vehicleId}" does not exist`);
            }
            // Validate employee if provided
            if (data.employeeId) {
                const employee = db.prepare('SELECT id FROM employees WHERE id = ?').get(data.employeeId);
                if (!employee) {
                    throw new Error(`Employee with ID "${data.employeeId}" does not exist`);
                }
            }
            // Extract month from date (YYYY-MM-DD -> YYYY-MM)
            const month = data.date.substring(0, 7);
            const stmt = db.prepare(`
      INSERT INTO vehicle_transactions (id, vehicleId, transactionType, category, amount, date, month, description, employeeId, invoiceId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
            stmt.run(data.id, data.vehicleId, data.transactionType, data.category || null, data.amount, data.date, month, data.description || null, data.employeeId || null, data.invoiceId || null, now, now);
            return exports.vehicleTransactionsAdapter.getById(data.id);
        }
        catch (error) {
            console.error('Error in vehicleTransactionsAdapter.create:', error);
            throw error;
        }
    },
    update: (id, data) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            const now = new Date().toISOString();
            // Validate date if provided
            if (data.date) {
                const txDate = new Date(data.date);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                const twelveMonthsAgo = new Date();
                twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
                twelveMonthsAgo.setHours(0, 0, 0, 0);
                if (txDate > today) {
                    throw new Error('Transaction date cannot be in the future');
                }
                if (txDate < twelveMonthsAgo) {
                    throw new Error('Transaction date cannot be more than 12 months in the past');
                }
            }
            // Validate amount if provided
            if (data.amount !== undefined && data.amount <= 0) {
                throw new Error('Transaction amount must be greater than 0');
            }
            // Get existing transaction to merge updates
            const existing = exports.vehicleTransactionsAdapter.getById(id);
            if (!existing) {
                throw new Error(`Transaction with ID "${id}" does not exist`);
            }
            // Merge data
            const updated = {
                ...existing,
                ...data,
                updatedAt: now,
            };
            // Recalculate month if date changed
            if (data.date) {
                updated.month = data.date.substring(0, 7);
            }
            // Validate employee if provided
            if (updated.employeeId) {
                const employee = db.prepare('SELECT id FROM employees WHERE id = ?').get(updated.employeeId);
                if (!employee) {
                    throw new Error(`Employee with ID "${updated.employeeId}" does not exist`);
                }
            }
            const stmt = db.prepare(`
      UPDATE vehicle_transactions 
      SET vehicleId = ?, transactionType = ?, category = ?, amount = ?, date = ?, month = ?, description = ?, employeeId = ?, invoiceId = ?, updatedAt = ?
      WHERE id = ?
    `);
            stmt.run(updated.vehicleId, updated.transactionType, updated.category || null, updated.amount, updated.date, updated.month, updated.description || null, updated.employeeId || null, updated.invoiceId || null, updated.updatedAt, id);
            return exports.vehicleTransactionsAdapter.getById(id);
        }
        catch (error) {
            console.error('Error in vehicleTransactionsAdapter.update:', error);
            throw error;
        }
    },
    delete: (id) => {
        const db = getDb();
        if (!db) {
            throw new Error('Database is not available. App is using client-side storage.');
        }
        try {
            db.prepare('DELETE FROM vehicle_transactions WHERE id = ?').run(id);
        }
        catch (error) {
            console.error('Error in vehicleTransactionsAdapter.delete:', error);
            throw error;
        }
    },
};
