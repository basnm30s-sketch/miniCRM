"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../adapters/sqlite");
const database_1 = require("../../lib/database");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    try {
        const vehicles = sqlite_1.vehiclesAdapter.getAll();
        res.json(vehicles);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id', (req, res) => {
    try {
        const vehicle = sqlite_1.vehiclesAdapter.getById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json(vehicle);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id/profitability', (req, res) => {
    try {
        const vehicle = sqlite_1.vehiclesAdapter.getById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        const profitability = sqlite_1.vehicleTransactionsAdapter.getProfitabilityByVehicle(req.params.id);
        res.json(profitability);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/', (req, res) => {
    try {
        const vehicle = sqlite_1.vehiclesAdapter.create(req.body);
        res.status(201).json(vehicle);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.put('/:id', (req, res) => {
    try {
        const vehicle = sqlite_1.vehiclesAdapter.update(req.params.id, req.body);
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json(vehicle);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete('/:id', (req, res) => {
    try {
        sqlite_1.vehiclesAdapter.delete(req.params.id);
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
                const quoteItems = db.prepare(`
          SELECT DISTINCT q.number 
          FROM quote_items qi
          JOIN quotes q ON qi.quoteId = q.id
          WHERE qi.vehicleTypeId = ?
        `).all(req.params.id);
                const references = quoteItems.map((qi) => ({ type: 'Quote', number: qi.number }));
                if (references.length > 0) {
                    res.status(409).json({ error: (0, sqlite_1.formatReferenceError)('Vehicle', references) });
                }
                else {
                    res.status(409).json({ error: 'Cannot delete Vehicle as it is referenced in other records' });
                }
            }
            catch {
                res.status(409).json({ error: 'Cannot delete Vehicle as it is referenced in other records' });
            }
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
exports.default = router;
