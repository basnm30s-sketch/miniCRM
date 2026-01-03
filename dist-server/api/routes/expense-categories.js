"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../adapters/sqlite");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    try {
        const categories = sqlite_1.expenseCategoriesAdapter.getAll();
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id', (req, res) => {
    try {
        const category = sqlite_1.expenseCategoriesAdapter.getById(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/', (req, res) => {
    try {
        const category = sqlite_1.expenseCategoriesAdapter.create(req.body);
        res.status(201).json(category);
    }
    catch (error) {
        const statusCode = error.message && (error.message.includes('UNIQUE constraint') ||
            error.message.includes('required')) ? 400 : 500;
        res.status(statusCode).json({ error: error.message || 'Failed to create category' });
    }
});
router.put('/:id', (req, res) => {
    try {
        const category = sqlite_1.expenseCategoriesAdapter.update(req.params.id, req.body);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    }
    catch (error) {
        const statusCode = error.message && (error.message.includes('UNIQUE constraint') ||
            error.message.includes('required')) ? 400 : 500;
        res.status(statusCode).json({ error: error.message || 'Failed to update category' });
    }
});
router.delete('/:id', (req, res) => {
    try {
        sqlite_1.expenseCategoriesAdapter.delete(req.params.id);
        res.status(204).send();
    }
    catch (error) {
        const statusCode = error.message && (error.message.includes('Cannot delete')) ? 409 : 500;
        res.status(statusCode).json({ error: error.message });
    }
});
exports.default = router;
