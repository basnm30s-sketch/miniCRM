import { Router, Request, Response } from 'express'
import { adminAdapter } from '../adapters/sqlite'

const router = Router()

// GET /api/admin/settings
router.get('/settings', (req: Request, res: Response) => {
  try {
    let settings = adminAdapter.get()

    // Seed defaults (only if missing). This ensures Settings page loads with sensible defaults
    // on first run, without requiring the client to call initializeAdminSettings().
    if (!settings) {
      const now = new Date().toISOString()
      const defaultTerms =
        `1. This quotation is valid for 30 days from the date of issue.\n` +
        `2. Goods remain the property of the company until full payment is received.\n` +
        `3. Any additional costs such as tolls, fines or damages are not included unless stated.\n` +
        `4. Payment terms: as agreed in the contract.`

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
      }

      settings = adminAdapter.save(defaults)
    }

    res.json(settings)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/admin/settings
router.post('/settings', (req: Request, res: Response) => {
  try {
    const settings = adminAdapter.save(req.body)
    res.json(settings)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/admin/settings
router.put('/settings', (req: Request, res: Response) => {
  try {
    const settings = adminAdapter.save(req.body)
    res.json(settings)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router

