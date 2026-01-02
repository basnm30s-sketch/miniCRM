# E2E Automation Test Scenarios (Playwright)

This document outlines the detailed test scenarios for the E2E Automation Suite (Phase 4). Each section corresponds to a spec file to be implemented.

## 1. Safety & Critical Paths

### `e2e/smoke.spec.ts`
**Goal:** Verify the application starts and main components are accessible.
- **Scenario:** **App Launch & Navigation**
    - **Step 1:** Launch application.
    - **Step 2:** Verify "Dashboard" is visible.
    - **Step 3:** Click through main navigation links (Quotes, Invoices, Customers, Vehicles, Employees).
    - **Step 4:** Verify each page loads without console errors.
    - **Step 5:** Verify Database Connection by checking if the "Stats" widgets on Dashboard load numbers (not error states).

### `e2e/flows/quote-to-invoice.spec.ts`
**Goal:** Verify the core revenue generation workflow.
- **Scenario:** **Quote to Paid Invoice Lifecycle**
    - **Step 1:** Create a new Customer "John Doe".
    - **Step 2:** Create a Quote for "John Doe" with 2 line items (Service A $100, Service B $200).
    - **Step 3:** Save Quote and verify Total is $300.
    - **Step 4:** Click "Convert to Invoice" button.
    - **Step 5:** Verify user is redirected to a new Invoice page.
    - **Step 6:** Verify Invoice has: Same Customer, Same Line Items, Same Total ($300).
    - **Step 7:** Change Invoice Status to "Paid".
    - **Step 8:** Verify Invoice appears in "Paid" list.

### `e2e/flows/payroll-cycle.spec.ts`
**Goal:** Verify the expense/salary workflow.
- **Scenario:** **Monthly Payroll Generation**
    - **Step 1:** Create new Employee "Jane Smith" (Role: Driver).
    - **Step 2:** Navigate to "Payslips".
    - **Step 3:** Click "Generate Payslip".
    - **Step 4:** Select "Jane Smith" and Month "October 2025".
    - **Step 5:** Enter Amount "$3000".
    - **Step 6:** Save.
    - **Step 7:** Verify Payslip appears in the list with correct details.
    - **Step 8:** Attempt to create a duplicate Payslip for "Jane Smith" in "October 2025" -> Verify Error Message (Constraint Check).

## 2. Core Entities Regression

### `e2e/modules/customers.spec.ts`
**Goal:** Verify Customer management.
- **Scenario:** **CRUD Operations**
    - **Create:** Add Customer "Acme Corp", Email "info@acme.com", Phone "555-0000". Verify in list.
    - **Edit:** Change name to "Acme Inc". Verify change in list.
    - **Delete Check:** Create a Quote for "Acme Inc". Try to Delete "Acme Inc" -> Verify "Cannot delete" error (Reference Constraint).
    - **Delete:** Delete a standard customer with no links -> Verify removal.

### `e2e/modules/invoices.spec.ts`
**Goal:** Verify Invoice specifics (Calculations, Status).
- **Scenario:** **Invoice Management**
    - **Create:** Manual Invoice creation (no quote). Add item with decimal price ($10.50 * 3). Verify Total ($31.50).
    - **Edit:** Open Invoice, Add new item. Verify Subtotal and Grand Total update dynamically.
    - **Delete:** Delete an invoice. Verify it disappears from list.

### `e2e/modules/quotes.spec.ts`
**Goal:** Verify Quote specifics.
- **Scenario:** **Quote Management**
    - **Create:** Create Quote. Verify default status is "Draft".
    - **Edit:** Change Customer. Verify update.
    - **Preview:** Click "Preview PDF" (if available in UI flow). Verify modal opens.

### `e2e/modules/vehicles.spec.ts`
**Goal:** Verify Fleet management and Financial Charting visibility.
- **Scenario:** **Vehicle Lifecycle & Stats**
    - **Create:** Add Vehicle "Toyota Camry", Reg "ABC-123".
    - **Dup Check:** Try to add another "ABC-123" -> Verify Unique Constraint error.
    - **Profitability:** Click "View Profitability". Verify Chart/Table container exists (Visual check).
    - **Delete:** Delete vehicle.

## 3. Operational Modules

### `e2e/modules/employees.spec.ts`
**Goal:** Verify Staff management.
- **Scenario:** **Staff Management**
    - **Create:** Add Employee "Bob", Role "Manager".
    - **Edit:** Change Role to "Admin".
    - **Delete:** Delete Employee.

### `e2e/modules/vendors.spec.ts`
**Goal:** Verify Supplier management.
- **Scenario:** **Vendor Management**
    - **Create:** Add Vendor "Parts Co".
    - **Ref Check:** Create Expense for "Parts Co" (via Transactions? or PO?).
    - **Delete:** Delete Vendor.

### `e2e/modules/vehicle-transactions.spec.ts`
**Goal:** Verify logging of expenses/income.
- **Scenario:** **Transaction Logging**
    - **Log Expense:** Add "Fuel" expense $50 for "Toyota Camry". Date: Today.
    - **Log Income:** Add "Service Income" $200 for "Toyota Camry".
    - **Verify:** Go to Vehicle Profitability page for "Toyota Camry". Verify "Net Profit" reflects these numbers (Income - Expense).

### `e2e/modules/payslips.spec.ts`
**Goal:** Verify Historical view/deletion.
- **Scenario:** **Payslip Management**
    - **List:** Verify list shows payslips sorted by month.
    - **Delete:** Delete a specific payslip. Verify it is removed from history.

## 4. Config & Artifacts

### `e2e/modules/admin.spec.ts`
**Goal:** Verify Global Settings & Branding.
- **Scenario:** **Settings & Branding**
    - **Update Info:** Change Company Name to "My CRM v2". Save. Reload page. Verify name persists.
    - **Upload Logo:** Upload "logo.png". Verify Success message. Verify Image `src` updates on Settings page.

### `e2e/modules/expense-categories.spec.ts`
**Goal:** Verify Customization of expenses.
- **Scenario:** **Category Management**
    - **Create:** Add custom category "Toll Fees".
    - **Usage:** Go to Vehicle Transactions -> Verify "Toll Fees" appears in dropdown.

### `e2e/modules/file-uploads.spec.ts`
**Goal:** Verify generic file attachments (if applicable feature exists).
- **Scenario:** **Attachment Handling**
    - Upload a PDF to a Quote/Customer (if feature exists).
    - Verify file appears in list.
    - Delete file.

### `e2e/artifacts/downloads.spec.ts`
**Goal:** Verify functionality of export buttons.
- **Scenario:** **PDF Generation**
    - Navigate to a Quote. Note Quote Number.
    - Click "Download PDF".
    - **Verify:** Intercept download event.
    - **Assert:** Filename contains Quote Number (e.g., `Quote-Q001.pdf`).
    - **Assert:** Content-Type is `application/pdf`.
