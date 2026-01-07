# Changelog - iManage CRM

All notable changes to the iManage CRM application are documented in this file.

## [1.0.0] - December 2024

### Added

#### Vehicle Financial Management Module
- **Vehicle Transactions
  - Create, read, update, delete vehicle transactions
  - Transaction types: expense and revenue
  - Category assignment for transactions
  - Date validation (no future dates, max 12 months back)
  - Month tracking in YYYY-MM format
  - Employee assignment (optional)
  - Invoice linking (optional)
  - Filtering by vehicle and month

- **Expense Categories Management**
  - Predefined categories: Purchase, Maintenance, Insurance, Driver Salary, Fuel, Registration, Other
  - Custom category creation
  - Category CRUD operations
  - Reference checking (prevents deletion if used in transactions)
  - Dedicated page at `/finances/expense-categories`

- **Vehicle Profitability Analysis**
  - Per-vehicle profitability tracking
  - Current month vs last month comparison
  - All-time revenue, expenses, and profit calculations
  - 12-month rolling window for profitability data
  - Visual charts and KPIs
  - Endpoint: `GET /api/vehicles/:id/profitability`

- **Vehicle Finances Dashboard**
  - Overall metrics: total revenue, expenses, net profit, profit margin
  - Vehicle-based metrics: top/bottom performers, per-vehicle stats
  - Customer-based metrics: top customers, average revenue per customer
  - Category-based metrics: revenue/expenses by category, top expense category
  - Operational metrics: revenue per vehicle per month, expense ratio, most active vehicle
  - Time-based metrics: current month, last month, 12-month trend
  - Dashboard endpoint: `GET /api/vehicle-finances/dashboard`

#### Testing Infrastructure
- **Unit Tests (Jest)**
  - Vehicle Transactions API tests (`api/__tests__/vehicle-transactions.test.ts`)
  - Expense Categories API tests (`api/__tests__/expense-categories.test.ts`)
  - Vehicle Profitability endpoint tests (extended `api/__tests__/vehicles.test.ts`)
  - Dashboard Metrics tests (`api/__tests__/vehicle-finances.test.ts`)
  - Total: 16 test files covering all major modules

- **E2E Tests (Playwright)**
  - Core test scenarios
  - Extended test scenarios
  - Quote exploration tests

#### Documentation
- Comprehensive current state documentation (`docs/CURRENT_STATE.md`)
- Test cases registry (`lib/__tests__/automation/TEST_CASES.md`)
- Test automation guide (`lib/__tests__/automation/README.md`)
- Test cases update plan (`docs/TEST_CASES_UPDATE_PLAN.md`)

### Changed

#### Document Modules Synchronization
- **Quotes, Purchase Orders, Invoices**
  - Consistent 3-column grid layout (main content + sticky sidebar)
  - Additional notes field added to all documents
  - Unified styling and UX patterns
  - Consistent form structure and validation

#### Database Schema
- Added `expense_categories` table
- Added `vehicle_transactions` table
- Added indexes for performance optimization:
  - `idx_vehicle_transactions_vehicle`
  - `idx_vehicle_transactions_date`
  - `idx_vehicle_transactions_month`
  - `idx_vehicle_transactions_type`

#### Navigation
- Added "Finances" section under Masters menu
- Added "Expense Categories" submenu item
- Reorganized sidebar navigation for better structure

### Fixed

#### Bug Fixes
- Fixed hydration mismatch in DataManagement component
- Fixed date rendering in Quotations page
- Fixed expense category save issue (validation and duplicate checking)
- Fixed PurchaseOrder type to include notes field

#### Build & Deployment
- Electron packaging working correctly
- Static export for Next.js configured
- Server compilation for production
- Windows installer generation

### Technical Improvements

#### Code Quality
- TypeScript strict mode enabled
- Comprehensive error handling
- Improved validation logic
- Better type definitions

#### Performance
- Database indexes for frequently queried fields
- Optimized queries for vehicle transactions
- Efficient aggregation for dashboard metrics

#### Architecture
- Modular component structure
- Consistent API patterns
- Reusable UI components
- Separation of concerns

## Previous Versions

### Initial Release Features
- Customer, Vendor, Employee, Vehicle management
- Quote, Purchase Order, Invoice, Payslip management
- Document generation (PDF, DOCX, Excel)
- Admin settings and branding
- File uploads
- Dashboard with quick actions
- Salary calculation
- Reports

---

**Note:** This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) principles.



