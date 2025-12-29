"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../adapters/sqlite");
const database_1 = require("../../lib/database");
const router = (0, express_1.Router)();
// GET /api/customers
router.get('/', (req, res) => {
    try {
        const customers = sqlite_1.customersAdapter.getAll();
        res.json(customers);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/customers/:id
router.get('/:id', (req, res) => {
    try {
        const customer = sqlite_1.customersAdapter.getById(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/customers
router.post('/', (req, res) => {
    try {
        const customer = sqlite_1.customersAdapter.create(req.body);
        res.status(201).json(customer);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// PUT /api/customers/:id
router.put('/:id', (req, res) => {
    try {
        const customer = sqlite_1.customersAdapter.update(req.params.id, req.body);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// DELETE /api/customers/:id
router.delete('/:id', (req, res) => {
    try {
        sqlite_1.customersAdapter.delete(req.params.id);
        res.status(204).send();
    }
    catch (error) {
        // Check if it's our formatted reference error
        if (error.message.includes('Cannot delete') && error.message.includes('referenced')) {
            res.status(409).json({ error: error.message });
        }
        // Check if it's a database foreign key constraint error
        else if (error.message && (error.message.includes('FOREIGN KEY') || error.message.includes('constraint'))) {
            // Try to get references and format error
            try {
                const db = (0, database_1.getDatabase)();
                const quotes = db.prepare('SELECT number FROM quotes WHERE customerId = ?').all(req.params.id);
                const invoices = db.prepare('SELECT number FROM invoices WHERE customerId = ?').all(req.params.id);
                const references = [
                    ...quotes.map((q) => ({ type: 'Quote', number: q.number })),
                    ...invoices.map((i) => ({ type: 'Invoice', number: i.number }))
                ];
                if (references.length > 0) {
                    res.status(409).json({ error: (0, sqlite_1.formatReferenceError)('Customer', references) });
                }
                else {
                    res.status(409).json({ error: 'Cannot delete Customer as it is referenced in other records' });
                }
            }
            catch {
                res.status(409).json({ error: 'Cannot delete Customer as it is referenced in other records' });
            }
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
exports.default = router;
