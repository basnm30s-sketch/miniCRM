"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../adapters/sqlite");
const router = (0, express_1.Router)();
// GET /api/admin/settings
router.get('/settings', (req, res) => {
    try {
        let settings = sqlite_1.adminAdapter.get();
        // Seed defaults (only if missing). This ensures Settings page loads with sensible defaults
        // on first run, without requiring the client to call initializeAdminSettings().
        if (!settings) {
            const now = new Date().toISOString();
            const defaultTerms = `1. This quotation is valid for 30 days from the date of issue.\n` +
                `2. Goods remain the property of the company until full payment is received.\n` +
                `3. Any additional costs such as tolls, fines or damages are not included unless stated.\n` +
                `4. Payment terms: as agreed in the contract.`;
            const defaults = {
                id: 'settings_1',
                companyName: 'ALMSAR ALZAKI TRANSPORT AND MAINTENANCE',
                address: '',
                vatNumber: '',
                logoUrl: null,
                sealUrl: null,
                signatureUrl: null,
                quoteNumberPattern: 'AAT-YYYYMMDD-NNNN',
                currency: 'AED',
                defaultTerms,
                defaultInvoiceTerms: defaultTerms,
                defaultPurchaseOrderTerms: defaultTerms,
                // Sidebar / home defaults (safe defaults; user can toggle later)
                showRevenueTrend: false,
                showQuickActions: false,
                showReports: false,
                showVehicleDashboard: false,
                showQuotationsInvoicesCard: false,
                showEmployeeSalariesCard: false,
                showVehicleRevenueExpensesCard: false,
                showActivityThisMonth: false,
                showFinancialHealth: true,
                showBusinessOverview: true,
                showTopCustomers: false,
                showActivitySummary: false,
                showQuotationsTwoPane: true,
                showPurchaseOrdersTwoPane: true,
                showInvoicesTwoPane: true,
                createdAt: now,
                updatedAt: now,
            };
            settings = sqlite_1.adminAdapter.save(defaults);
        }
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
