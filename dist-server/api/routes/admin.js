"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite_1 = require("../adapters/sqlite");
const router = (0, express_1.Router)();
// Single-flight guard: serialize concurrent admin settings saves to avoid
// pile-ups that can saturate the (synchronous) better-sqlite3 main loop and
// surface as client-side timeouts on the second consecutive save.
let saveInFlight = null;
async function runSerializedSave(work) {
    if (saveInFlight) {
        try {
            await saveInFlight;
        }
        catch {
            // ignore prior failure; we still want to attempt this save
        }
    }
    let resolveDone;
    saveInFlight = new Promise((resolve) => {
        resolveDone = resolve;
    });
    try {
        return work();
    }
    finally {
        resolveDone();
        saveInFlight = null;
    }
}
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
router.post('/settings', async (req, res) => {
    const start = Date.now();
    try {
        const settings = await runSerializedSave(() => sqlite_1.adminAdapter.save(req.body));
        console.log('[AdminSettings] POST /settings success', {
            durationMs: Date.now() - start,
            payloadSizeBytes: Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8'),
        });
        res.json(settings);
    }
    catch (error) {
        console.error('[AdminSettings] POST /settings failed', {
            durationMs: Date.now() - start,
            message: error?.message,
        });
        res.status(500).json({ error: error.message });
    }
});
// PUT /api/admin/settings
router.put('/settings', async (req, res) => {
    const start = Date.now();
    try {
        const settings = await runSerializedSave(() => sqlite_1.adminAdapter.save(req.body));
        console.log('[AdminSettings] PUT /settings success', {
            durationMs: Date.now() - start,
            payloadSizeBytes: Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8'),
        });
        res.json(settings);
    }
    catch (error) {
        console.error('[AdminSettings] PUT /settings failed', {
            durationMs: Date.now() - start,
            message: error?.message,
        });
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
