"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../adapters/sqlite");
const database_1 = require("../../lib/database");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    try {
        const vendors = sqlite_1.vendorsAdapter.getAll();
        res.json(vendors);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id', (req, res) => {
    try {
        const vendor = sqlite_1.vendorsAdapter.getById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        res.json(vendor);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/', (req, res) => {
    try {
        const vendor = sqlite_1.vendorsAdapter.create(req.body);
        res.status(201).json(vendor);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.put('/:id', (req, res) => {
    try {
        const vendor = sqlite_1.vendorsAdapter.update(req.params.id, req.body);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        res.json(vendor);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete('/:id', (req, res) => {
    try {
        sqlite_1.vendorsAdapter.delete(req.params.id);
        res.status(204).send();
    }
    catch (error) {
        // Check if it's our formatted reference error
        if (error.message.includes('Cannot delete') && error.message.includes('referenced')) {
            res.status(409).json({ error: error.message });
        }
        // Check if it's a database foreign key constraint error
        else if (error.message && (error.message.includes('FOREIGN KEY') || error.message.includes('constraint'))) {
            try {
                const db = (0, database_1.getDatabase)();
                const purchaseOrders = db.prepare('SELECT number FROM purchase_orders WHERE vendorId = ?').all(req.params.id);
                const invoices = db.prepare('SELECT number FROM invoices WHERE vendorId = ?').all(req.params.id);
                const references = [
                    ...purchaseOrders.map((po) => ({ type: 'Purchase Order', number: po.number })),
                    ...invoices.map((i) => ({ type: 'Invoice', number: i.number }))
                ];
                if (references.length > 0) {
                    res.status(409).json({ error: (0, sqlite_1.formatReferenceError)('Vendor', references) });
                }
                else {
                    res.status(409).json({ error: 'Cannot delete Vendor as it is referenced in other records' });
                }
            }
            catch {
                res.status(409).json({ error: 'Cannot delete Vendor as it is referenced in other records' });
            }
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
exports.default = router;
