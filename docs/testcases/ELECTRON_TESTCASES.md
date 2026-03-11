# Electron E2E Test Cases – Functional Reference

This document lists and tracks all Electron E2E test cases in functional terms: what each test validates, which route or screen it covers, and the main checks or flows. Use it as a reference without reading the spec code.

**Purpose:** Document and track Electron test cases; single source for what each test does.

**Companion doc:** [ELECTRON_AUTOMATION_DESIGN.md](./ELECTRON_AUTOMATION_DESIGN.md) — automation design, patterns, and engineering decisions (for maintainers).

**How to run:**

```bash
npx playwright test e2e/electron/ --config=playwright.electron.config.ts --project=Electron
```

**Summary:**

| Spec | Tests | Description |
|------|-------|-------------|
| Launch | 1 | App lifecycle and initial window |
| Screen load (Phase 1) | 19 | Each route loads with expected content and no critical console errors |
| Interactions (Phase 2) | 13 | Field/button coverage per module; no critical errors or blockers |
| **Total** | **33** | |

---

## Launch (App lifecycle)

**Spec:** `e2e/electron/launch.spec.ts`  
**Describe block:** Electron App Lifecycle

| Test name | Function | Key checks |
|-----------|----------|------------|
| App should launch and display window | Ensures the Electron app starts, loads the window, and the dashboard is usable. | Window title contains app name (ALMSAR ALZAKI); no "Application Error" / "Could not connect to Express server" page; main content area visible; Home link in nav visible; dashboard content (Quotations & Invoices heading) visible; optional screenshot. |

---

## Screen load (Phase 1)

**Spec:** `e2e/electron/screen-load.spec.ts`  
**Describe block:** Electron – Screen load (Phase 1)

For each user-facing route, the test navigates to it and confirms the screen loads with expected content and no critical console errors. No "Application Error" or "Could not connect to Express server" page.

| # | Test name | Route | Functional check |
|---|-----------|--------|-------------------|
| 1 | Loads Home (/) | `/` | Heading "Quotations & Invoices" visible; main visible; no critical console errors. |
| 2 | Loads Quotations | `/quotations` | Heading "Quotations" visible; no critical console errors. |
| 3 | Loads Create Quote | `/quotes/create` | Quote Details card title visible; no critical console errors. |
| 4 | Loads Invoices | `/invoices` | Heading "Invoices" visible; no critical console errors. |
| 5 | Loads Create Invoice | `/invoices/create` | "Create invoice" or "New empty invoice" visible; no critical console errors. |
| 6 | Loads Purchase Orders | `/purchase-orders` | Heading "Purchase Orders" visible; no critical console errors. |
| 7 | Loads Create Purchase Order | `/purchase-orders/create` | Purchase Order Details card title visible; no critical console errors. |
| 8 | Loads Customers | `/customers` | Heading "Customers" visible; no critical console errors. |
| 9 | Loads Vendors | `/vendors` | Heading "Vendors" visible; no critical console errors. |
| 10 | Loads Vehicles (Fleet Management) | `/vehicles` | Heading "Fleet Management" visible; no critical console errors. |
| 11 | Loads Employees | `/employees` | Heading "Employees" visible; no critical console errors. |
| 12 | Loads Expense Categories | `/finances/expense-categories` | Heading "Expense Categories" visible; no critical console errors. |
| 13 | Loads Reports | `/reports` | Heading "Reports" and Reports Dashboard / Reports Coming Soon visible; no critical console errors. |
| 14 | Loads Settings (Admin) | `/admin` | Heading "Settings" and "Company Profile" visible; no critical console errors. |
| 15 | Loads Vehicle Dashboard | `/vehicle-dashboard` | Heading "Vehicle Dashboard" visible; no critical console errors. |
| 16 | Loads Vehicle Finances list | `/vehicle-finances` | Heading "Vehicle Finances" visible; no critical console errors. |
| 17 | Loads Vehicle Finances detail when a vehicle exists | `/vehicle-finances` then click first vehicle | If vehicles exist: Back to List or detail content visible; else: "No vehicles found" or "Select a vehicle" visible; no critical console errors. |
| 18 | Loads Payslips | `/payslips` | Heading "Payslips" visible; no critical console errors. |
| 19 | Loads Salary Calculation | `/salary-calculation` | Heading "Salary Calculation" and "Step N of N" visible; no critical console errors. |

---

## Interactions (Phase 2)

**Spec:** `e2e/electron/interactions.spec.ts`  
**Describe block:** Electron – Interactions (Phase 2)

For each major area, the test performs minimal flows (fill fields, click primary buttons) and asserts no critical console errors or blockers.

| # | Module / Test name | Screen(s) | Functional flow |
|---|--------------------|-----------|------------------|
| 1 | Masters – Customers | Customers | Add Customer → fill Company Name, Contact Person, Email → Create → verify row → Edit → Update → Delete → verify removed; assert no critical errors. |
| 2 | Masters – Vendors | Vendors | Add Vendor → fill Name, Contact Person, Email, Phone → Create → verify row → Edit → Update → Delete → verify removed; assert no critical errors. |
| 3 | Masters – Vehicles | Vehicles | Add Vehicle → fill vehicle number, type, make → Create Vehicle → verify row (or goto /vehicles and verify) → Delete → verify removed; assert no critical errors. |
| 4 | Masters – Employees | Employees | Add Employee → fill Name, Employee ID, Role, Hourly pay → Create → verify row → Edit → Update → Delete → verify removed; assert no critical errors. |
| 5 | Doc generator – Quotations | Customers, Quotations create | Create customer; goto /quotes/create → if form visible: select customer, Add Line Item, fill item/qty/price, Save Quote; assert no critical errors. |
| 6 | Doc generator – Invoices | Customers, Invoices create | Create customer; goto /invoices/create → if "New empty invoice" visible: click it → if customer combobox visible: select customer, Add Line Item, fill and Save Invoice; assert no critical errors. |
| 7 | Doc generator – Purchase Orders | Vendors, Purchase Orders create | Create vendor; goto /purchase-orders/create → if form visible: select vendor, Add Line Item, fill and Create; assert no critical errors. |
| 8 | Payslips | Payslips | Goto /payslips → if "Generate Payslip" visible, click it; assert no critical errors. |
| 9 | Salary Calculation | Salary Calculation | Goto /salary-calculation → if employee select visible, select first option; if Next visible, click Next; assert no critical errors. |
| 10 | Vehicle Finances | Vehicle Finances list, detail | Goto /vehicle-finances → if first vehicle card visible, click it → if Add Transaction visible, click it; assert no critical errors. |
| 11 | Vehicle Dashboard | Vehicle Dashboard | Goto /vehicle-dashboard → if Settings button visible, click it; assert no critical errors. |
| 12 | Expense Categories | Expense Categories | Add Category → fill name → Save; if row visible, optionally Edit and Delete; assert no critical errors. |
| 13 | Settings (Admin) | Settings | Goto /admin → fill Company Name → Save Settings → verify "Settings saved successfully" toast; assert no critical errors. |

---

## Tracking

- **Scope:** Electron E2E only (config: `playwright.electron.config.ts`, project: Electron).
- **Last doc update:** When this file was created or edited to reflect spec changes. For run status and history, use CI or local Playwright reports.
