"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../adapters/sqlite");
const database_1 = require("../../lib/database");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    try {
        const employees = sqlite_1.employeesAdapter.getAll();
        res.json(employees);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id', (req, res) => {
    try {
        const employee = sqlite_1.employeesAdapter.getById(req.params.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(employee);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/', (req, res) => {
    try {
        const employee = sqlite_1.employeesAdapter.create(req.body);
        res.status(201).json(employee);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.put('/:id', (req, res) => {
    try {
        const employee = sqlite_1.employeesAdapter.update(req.params.id, req.body);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(employee);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete('/:id', (req, res) => {
    try {
        sqlite_1.employeesAdapter.delete(req.params.id);
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
                const payslips = db.prepare('SELECT id, month FROM payslips WHERE employeeId = ?').all(req.params.id);
                const references = payslips.map((ps) => ({ type: 'Payslip', number: ps.month || ps.id }));
                if (references.length > 0) {
                    res.status(409).json({ error: (0, sqlite_1.formatReferenceError)('Employee', references) });
                }
                else {
                    res.status(409).json({ error: 'Cannot delete Employee as it is referenced in other records' });
                }
            }
            catch {
                res.status(409).json({ error: 'Cannot delete Employee as it is referenced in other records' });
            }
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
exports.default = router;
