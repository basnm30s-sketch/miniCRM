"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../adapters/sqlite");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    try {
        const invoices = sqlite_1.invoicesAdapter.getAll();
        res.json(invoices);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id', (req, res) => {
    try {
        const invoice = sqlite_1.invoicesAdapter.getById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        res.json(invoice);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/', (req, res) => {
    try {
        const invoice = sqlite_1.invoicesAdapter.create(req.body);
        res.status(201).json(invoice);
    }
    catch (error) {
        console.error('Error creating invoice:', error);
        console.error('Request body:', JSON.stringify(req.body, null, 2));
        // Return appropriate status code based on error type
        const statusCode = error.message && (error.message.includes('does not exist') ||
            error.message.includes('required') ||
            error.message.includes('FOREIGN KEY')) ? 400 : 500;
        res.status(statusCode).json({ error: error.message || 'Failed to create invoice' });
    }
});
router.put('/:id', (req, res) => {
    try {
        const invoice = sqlite_1.invoicesAdapter.update(req.params.id, req.body);
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        res.json(invoice);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete('/:id', (req, res) => {
    try {
        sqlite_1.invoicesAdapter.delete(req.params.id);
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
