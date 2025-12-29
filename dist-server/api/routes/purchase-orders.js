"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../adapters/sqlite");
const database_1 = require("../../lib/database");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    try {
        const pos = sqlite_1.purchaseOrdersAdapter.getAll();
        res.json(pos);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id', (req, res) => {
    try {
        const po = sqlite_1.purchaseOrdersAdapter.getById(req.params.id);
        if (!po) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        res.json(po);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/', (req, res) => {
    try {
        const po = sqlite_1.purchaseOrdersAdapter.create(req.body);
        res.status(201).json(po);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.put('/:id', (req, res) => {
    try {
        const po = sqlite_1.purchaseOrdersAdapter.update(req.params.id, req.body);
        if (!po) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        res.json(po);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete('/:id', (req, res) => {
    try {
        sqlite_1.purchaseOrdersAdapter.delete(req.params.id);
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
                const invoices = db.prepare('SELECT number FROM invoices WHERE purchaseOrderId = ?').all(req.params.id);
                const references = invoices.map((i) => ({ type: 'Invoice', number: i.number }));
                if (references.length > 0) {
                    res.status(409).json({ error: (0, sqlite_1.formatReferenceError)('Purchase Order', references) });
                }
                else {
                    res.status(409).json({ error: 'Cannot delete Purchase Order as it is referenced in other records' });
                }
            }
            catch {
                res.status(409).json({ error: 'Cannot delete Purchase Order as it is referenced in other records' });
            }
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
exports.default = router;
