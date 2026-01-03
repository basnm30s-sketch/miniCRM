"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../adapters/sqlite");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    try {
        const vehicleId = req.query.vehicleId;
        const month = req.query.month;
        let transactions;
        if (vehicleId && month) {
            transactions = sqlite_1.vehicleTransactionsAdapter.getByVehicleIdAndMonth(vehicleId, month);
        }
        else if (vehicleId) {
            transactions = sqlite_1.vehicleTransactionsAdapter.getByVehicleId(vehicleId);
        }
        else {
            transactions = sqlite_1.vehicleTransactionsAdapter.getAll();
        }
        res.json(transactions);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id', (req, res) => {
    try {
        const transaction = sqlite_1.vehicleTransactionsAdapter.getById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json(transaction);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/', (req, res) => {
    try {
        const transaction = sqlite_1.vehicleTransactionsAdapter.create(req.body);
        res.status(201).json(transaction);
    }
    catch (error) {
        const statusCode = error.message && (error.message.includes('does not exist') ||
            error.message.includes('must be') ||
            error.message.includes('cannot be')) ? 400 : 500;
        res.status(statusCode).json({ error: error.message || 'Failed to create transaction' });
    }
});
router.put('/:id', (req, res) => {
    try {
        const transaction = sqlite_1.vehicleTransactionsAdapter.update(req.params.id, req.body);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json(transaction);
    }
    catch (error) {
        const statusCode = error.message && (error.message.includes('does not exist') ||
            error.message.includes('must be') ||
            error.message.includes('cannot be')) ? 400 : 500;
        res.status(statusCode).json({ error: error.message || 'Failed to update transaction' });
    }
});
router.delete('/:id', (req, res) => {
    try {
        sqlite_1.vehicleTransactionsAdapter.delete(req.params.id);
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
