"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../adapters/sqlite");
const router = (0, express_1.Router)();
// Test route to verify router is loaded
router.get('/test', (req, res) => {
    res.json({ message: 'Payslips router is working' });
});
router.get('/', (req, res) => {
    try {
        const payslips = sqlite_1.payslipsAdapter.getAll();
        res.json(payslips || []);
    }
    catch (error) {
        console.error('Error getting all payslips:', error);
        // Return empty array instead of error to prevent frontend crashes
        res.json([]);
    }
});
// IMPORTANT: This route must come before /:id to avoid route conflicts
router.get('/month/:month', (req, res) => {
    try {
        const month = req.params.month;
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM' });
        }
        const payslips = sqlite_1.payslipsAdapter.getByMonth(month);
        res.json(payslips);
    }
    catch (error) {
        console.error('Error getting payslips by month:', error);
        res.status(500).json({ error: error.message || 'Failed to get payslips by month' });
    }
});
router.get('/:id', (req, res) => {
    try {
        const payslip = sqlite_1.payslipsAdapter.getById(req.params.id);
        if (!payslip) {
            return res.status(404).json({ error: 'Payslip not found' });
        }
        res.json(payslip);
    }
    catch (error) {
        console.error('Error getting payslip by id:', error);
        res.status(500).json({ error: error.message || 'Failed to get payslip' });
    }
});
router.post('/', (req, res) => {
    try {
        console.log('POST /payslips - Received request:', { body: req.body });
        // Validate required fields
        if (!req.body.employeeId || !req.body.month) {
            console.error('POST /payslips - Missing required fields:', { employeeId: req.body.employeeId, month: req.body.month });
            return res.status(400).json({ error: 'employeeId and month are required' });
        }
        console.log('POST /payslips - Creating payslip...');
        const payslip = sqlite_1.payslipsAdapter.create(req.body);
        console.log('POST /payslips - Payslip created successfully:', payslip.id);
        res.status(201).json(payslip);
    }
    catch (error) {
        console.error('Error creating payslip:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: error.message || 'Failed to create payslip' });
    }
});
router.put('/:id', (req, res) => {
    try {
        const payslip = sqlite_1.payslipsAdapter.update(req.params.id, req.body);
        if (!payslip) {
            return res.status(404).json({ error: 'Payslip not found' });
        }
        res.json(payslip);
    }
    catch (error) {
        console.error('Error updating payslip:', error);
        res.status(500).json({ error: error.message || 'Failed to update payslip' });
    }
});
router.delete('/:id', (req, res) => {
    try {
        sqlite_1.payslipsAdapter.delete(req.params.id);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting payslip:', error);
        res.status(500).json({ error: error.message || 'Failed to delete payslip' });
    }
});
exports.default = router;
