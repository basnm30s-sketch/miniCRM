"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../adapters/sqlite");
const router = (0, express_1.Router)();
// GET /api/admin/settings
router.get('/settings', (req, res) => {
    try {
        const settings = sqlite_1.adminAdapter.get();
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/admin/settings
router.post('/settings', (req, res) => {
    try {
        const settings = sqlite_1.adminAdapter.save(req.body);
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// PUT /api/admin/settings
router.put('/settings', (req, res) => {
    try {
        const settings = sqlite_1.adminAdapter.save(req.body);
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
