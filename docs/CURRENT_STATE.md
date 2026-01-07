# iManage CRM - Current Application State Documentation

**Last Updated:** December 2024  
**Version:** 1.0.0

## Executive Summary

iManage is a comprehensive desktop Car Rental CRM system built with Electron, Next.js, and Express. The application provides end-to-end management for car rental operations including customer management, vehicle tracking, quote/invoice generation, purchase order management, employee payroll, and vehicle financial tracking.

## System Architecture

### Technology Stack

**Frontend:**
- Next.js 16 (React 18, TypeScript)
- Tailwind CSS 4.1.9
- Radix UI components
- shadcn/ui component library (58 UI components)
- Recharts for data visualization

**Backend:**
- Express 5.2.1 (Node.js)
- SQLite (better-sqlite3 12.5.0)
- TypeScript 5

**Desktop:**
- Electron 39.2.1
- electron-builder for packaging

**Document Generation:**
- jsPDF + html2canvas (PDF generation)
- docx library (Word document generation)
- exceljs (Excel workbook generation)

**Testing:**
- Jest 30.2.0 (Unit tests)
- Playwright 1.57.0 (E2E tests)
- ts-jest for TypeScript support

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              Electron Main Process                      │
│  - Spawns Express API server (port 3001)               │
│  - Creates BrowserWindow (1400x900)                    │
│  - Handles app lifecycle                                │
└─────────────────────────────────────────────────────────┘
                        │
                        ├─────────────────┐
                        │                 │
                        ▼                 ▼
        ┌──────────────────────┐  ┌──────────────────────┐
        │  Next.js Frontend     │  │  Express API Server   │
        │  (Static Export)      │  │  (Port 3001)         │
        │  - App Router         │  │  - RESTful API       │
        │  - Client-side routing│  │  - File uploads      │
        │  - React Components   │  │  - Static file serve │
        └──────────────────────┘  └──────────────────────┘
                        │                 │
                        │                 ▼
                        │        ┌──────────────────────┐
                        │        │  SQLite Database     │
                        │        │  (data/imanage.db)   │
                        │        └──────────────────────┘
                        │
                        ▼
        ┌──────────────────────────────────────┐
        │  Document Generation (Client-side)   │
        │  - PDF (jsPDF + html2canvas)         │
        │  - DOCX (docx library)               │
        │  - Excel (exceljs)                   │
        └──────────────────────────────────────┘
```

## Application Modules

### 1. Core Entity Management

#### Customers (`/customers`)
- **API Route:** `api/routes/customers.ts`
- **Frontend:** `app/customers/page.tsx`
- **Features:**
  - Create, read, update, delete customers
  - Fields: name, company, email, phone, address
  - Reference checking before deletion (prevents deletion if linked to quotes/invoices)
  - Full CRUD operations with validation

#### Vendors (`/vendors`)
- **API Route:** `api/routes/vendors.ts`
- **Frontend:** `app/vendors/page.tsx`
- **Features:**
  - Supplier management
  - Fields: name, contactPerson, email, phone, address, bankDetails, paymentTerms
  - Reference checking (prevents deletion if linked to POs/invoices)

#### Employees (`/employees`)
- **API Route:** `api/routes/employees.ts`
- **Frontend:** `app/employees/page.tsx`
- **Features:**
  - Staff management
  - Fields: name, employeeId, role, paymentType (hourly/monthly), hourlyRate, salary, bankDetails
  - Reference checking (prevents deletion if linked to payslips)

#### Vehicles (`/vehicles`)
- **API Route:** `api/routes/vehicles.ts`
- **Frontend:** `app/vehicles/page.tsx`
- **Features:**
  - Fleet management with comprehensive vehicle tracking
  - **Core Fields:** vehicleNumber (unique), vehicleType, make, model, year, color
  - **Financial:** purchasePrice, purchaseDate, currentValue, insuranceCostMonthly, financingCostMonthly
  - **Operational:** odometerReading, lastServiceDate, nextServiceDue, fuelType, status
  - **Compliance:** registrationExpiry, insuranceExpiry
  - **Additional:** description, basePrice, notes
  - Status types: active, maintenance, sold, retired
  - Fuel types: petrol, diesel, electric, hybrid
  - Profitability tracking endpoint: `GET /api/vehicles/:id/profitability`

### 2. Document Management

#### Quotes (`/quotes`, `/quotations`)
- **API Route:** `api/routes/quotes.ts`
- **Frontend:** 
  - `app/quotes/create/page.tsx` (Create/Edit)
  - `app/quotations/page.tsx` (List view)
- **Features:**
  - Quote number auto-generation (pattern: AAT-YYYYMMDD-NNNN)
  - Customer selection with inline add
  - Line items with vehicle types, quantity, unit price, tax percentage
  - Auto-calculation: subtotal, total tax, grand total
  - Terms & Conditions (rich text editor)
  - Additional notes
  - Export to PDF, DOCX, Excel
  - Convert to Invoice

#### Purchase Orders (`/purchase-orders`)
- **API Route:** `api/routes/purchase-orders.ts`
- **Frontend:**
  - `app/purchase-orders/page.tsx` (List)
  - `app/purchase-orders/create/page.tsx` (Create/Edit)
- **Features:**
  - PO number auto-generation
  - Vendor selection (required)
  - Status management (draft, sent, accepted)
  - Line items with description, quantity, unit price, tax
  - Auto-calculation: subtotal, tax, total amount
  - Additional notes
  - Export to PDF
  - Convert to Invoice

#### Invoices (`/invoices`)
- **API Route:** `api/routes/invoices.ts`
- **Frontend:**
  - `app/invoices/page.tsx` (List)
  - `app/invoices/create/page.tsx` (Create/Edit)
- **Features:**
  - Invoice number auto-generation
  - Customer/Vendor selection
  - Link to Quote or Purchase Order (optional)
  - Status management (draft, sent, paid, overdue)
  - Payment tracking (amountReceived)
  - Line items with description, quantity, unit price, tax
  - Due date tracking
  - Additional notes
  - Export to PDF, DOCX, Excel

#### Payslips (`/payslips`)
- **API Route:** `api/routes/payslips.ts`
- **Frontend:** `app/payslips/page.tsx`
- **Features:**
  - Employee salary management
  - Month/Year tracking (YYYY-MM format)
  - Base salary calculation
  - Overtime tracking (hours, rate, pay)
  - Deductions management
  - Net pay calculation
  - Status: draft, processed, paid
  - Notes field

### 3. Vehicle Financial Management

#### Vehicle Finances Dashboard (`/vehicle-finances`)
- **API Route:** `app/api/[...route]/route.ts` (Next.js API route)
- **Frontend:** `app/vehicle-finances/page.tsx`
- **Features:**
  - Overall metrics: total revenue, expenses, net profit, profit margin
  - Vehicle-based metrics: top/bottom performers, per-vehicle stats
  - Customer-based metrics: top customers, average revenue per customer
  - Category-based metrics: revenue/expenses by category, top expense category
  - Operational metrics: revenue per vehicle per month, expense ratio, most active vehicle
  - Time-based metrics: current month, last month, 12-month trend

#### Vehicle Transactions (`/vehicle-finances/[vehicleId]`)
- **API Route:** `api/routes/vehicle-transactions.ts`
- **Frontend:** `app/vehicle-finances/[vehicleId]/page.tsx`
- **Features:**
  - Transaction types: expense, revenue
  - Category assignment (with expense category manager)
  - Amount tracking
  - Date validation (no future dates, max 12 months back)
  - Month tracking (YYYY-MM format)
  - Employee assignment (optional)
  - Invoice linking (optional)
  - Filtering by vehicle and month

#### Expense Categories (`/finances/expense-categories`)
- **API Route:** `api/routes/expense-categories.ts`
- **Frontend:** `app/finances/expense-categories/page.tsx`
- **Features:**
  - Predefined categories: Purchase, Maintenance, Insurance, Driver Salary, Fuel, Registration, Other
  - Custom category creation
  - Category management (create, update, delete)
  - Reference checking (prevents deletion if used in transactions)

#### Vehicle Profitability (`/vehicle-profitability`)
- **Frontend:** `app/vehicle-profitability/page.tsx`
- **Features:**
  - Per-vehicle profitability analysis
  - Current month vs last month comparison
  - All-time revenue, expenses, profit
  - 12-month rolling window
  - Visual charts and KPIs

### 4. System Administration

#### Admin Settings (`/admin`)
- **API Route:** `api/routes/admin.ts`
- **Frontend:** `app/admin/page.tsx`
- **Features:**
  - Company profile: name, address, VAT number
  - Branding uploads: logo, seal, signature (stored in `data/branding/`)
  - Quote number pattern configuration
  - Currency settings (default: AED)
  - Default Terms & Conditions
  - UI customization flags:
    - Show/hide revenue trend chart
    - Show/hide quick actions
    - Show/hide Reports menu

#### File Uploads
- **API Route:** `api/routes/uploads.ts`
- **Service:** `api/services/file-storage.ts`
- **Features:**
  - General file uploads (stored in `data/uploads/{type}/`)
  - Branding file uploads (stored in `data/branding/`)
  - File type validation
  - UUID-based file naming for general uploads
  - Fixed naming for branding files (logo.png, seal.png, signature.png)

#### Dashboard (`/dashboard`)
- **Frontend:** `app/dashboard/page.tsx`
- **Components:**
  - `components/dashboard.tsx` - Main dashboard layout
  - `components/quick-actions.tsx` - Quick action buttons
  - `components/revenue-trend-chart.tsx` - Revenue visualization
  - `components/overview-card.tsx` - KPI cards
- **Features:**
  - Quick actions (configurable via admin settings)
  - Revenue trend chart (configurable)
  - Overview cards with key metrics
  - Recent activity display

#### Reports (`/reports`)
- **Frontend:** `app/reports/page.tsx`
- **Features:**
  - Financial reports
  - Vehicle performance reports
  - Customer reports
  - Configurable visibility via admin settings

### 5. Payroll Management

#### Salary Calculation (`/salary-calculation`)
- **Frontend:** `app/salary-calculation/page.tsx`
- **Features:**
  - Employee selection
  - Base pay calculation (hourly or monthly)
  - Overtime hours and rate input
  - Overtime pay calculation
  - Deductions input
  - Net pay calculation
  - Generate payslip

## Database Schema

### Core Tables

**admin_settings** (Single row)
- id, companyName, address, vatNumber
- logoUrl, sealUrl, signatureUrl
- quoteNumberPattern, currency, defaultTerms
- showRevenueTrend, showQuickActions, showReports
- createdAt, updatedAt

**customers**
- id (PK), name, company, email, phone, address
- createdAt, updatedAt

**vendors**
- id (PK), name, contactPerson, email, phone, address
- bankDetails, paymentTerms, createdAt

**employees**
- id (PK), name, employeeId, role
- paymentType, hourlyRate, salary, bankDetails
- createdAt

**vehicles**
- id (PK), vehicleNumber (UNIQUE), vehicleType, make, model, year, color
- purchasePrice, purchaseDate, currentValue
- insuranceCostMonthly, financingCostMonthly
- odometerReading, lastServiceDate, nextServiceDue
- fuelType, status, registrationExpiry, insuranceExpiry
- description, basePrice, notes, createdAt

### Document Tables

**quotes**
- id (PK), number (UNIQUE), date, validUntil, currency
- customerId (FK), subTotal, totalTax, total
- terms, notes, createdAt, updatedAt

**quote_items**
- id (PK), quoteId (FK), vehicleTypeId, vehicleTypeLabel
- quantity, unitPrice, taxPercent, lineTaxAmount, lineTotal

**purchase_orders**
- id (PK), number (UNIQUE), date, vendorId (FK)
- subtotal, tax, amount, currency, status, notes
- createdAt

**po_items**
- id (PK), purchaseOrderId (FK), description
- quantity, unitPrice, tax, total

**invoices**
- id (PK), number (UNIQUE), date, dueDate
- customerId (FK), vendorId (FK), purchaseOrderId (FK), quoteId (FK)
- subtotal, tax, total, amountReceived, status, notes
- createdAt

**invoice_items**
- id (PK), invoiceId (FK), description
- quantity, unitPrice, tax, total

**payslips**
- id (PK), month, year, employeeId (FK)
- baseSalary, overtimeHours, overtimeRate, overtimePay
- deductions, netPay, status, notes
- createdAt, updatedAt

### Financial Tracking Tables

**expense_categories**
- id (PK), name (UNIQUE), isCustom, createdAt

**vehicle_transactions**
- id (PK), vehicleId (FK), transactionType (expense/revenue)
- category, amount, date, month (YYYY-MM)
- description, employeeId (FK), invoiceId (FK)
- createdAt, updatedAt

### Indexes

- `idx_invoices_customer` on invoices(customerId)
- `idx_invoices_status` on invoices(status)
- `idx_purchase_orders_vendor` on purchase_orders(vendorId)
- `idx_purchase_orders_status` on purchase_orders(status)
- `idx_vehicle_transactions_vehicle` on vehicle_transactions(vehicleId)
- `idx_vehicle_transactions_date` on vehicle_transactions(date)
- `idx_vehicle_transactions_month` on vehicle_transactions(month)
- `idx_vehicle_transactions_type` on vehicle_transactions(transactionType)

## API Endpoints

### Base URL: `http://localhost:3001/api`

#### Core Entities
- `GET/POST /customers` - List/create customers
- `GET/PUT/DELETE /customers/:id` - Customer operations
- `GET/POST /vendors` - List/create vendors
- `GET/PUT/DELETE /vendors/:id` - Vendor operations
- `GET/POST /employees` - List/create employees
- `GET/PUT/DELETE /employees/:id` - Employee operations
- `GET/POST /vehicles` - List/create vehicles
- `GET/PUT/DELETE /vehicles/:id` - Vehicle operations
- `GET /vehicles/:id/profitability` - Vehicle profitability data

#### Documents
- `GET/POST /quotes` - List/create quotes
- `GET/PUT/DELETE /quotes/:id` - Quote operations
- `GET/POST /purchase-orders` - List/create POs
- `GET/PUT/DELETE /purchase-orders/:id` - PO operations
- `GET/POST /invoices` - List/create invoices
- `GET/PUT/DELETE /invoices/:id` - Invoice operations
- `GET/POST /payslips` - List/create payslips
- `GET /payslips/month/:month` - Payslips by month (YYYY-MM)
- `GET/PUT/DELETE /payslips/:id` - Payslip operations

#### Financial Management
- `GET/POST /vehicle-transactions` - List/create transactions
- `GET /vehicle-transactions?vehicleId=:id&month=:month` - Filtered transactions
- `GET/PUT/DELETE /vehicle-transactions/:id` - Transaction operations
- `GET/POST /expense-categories` - List/create categories
- `GET/PUT/DELETE /expense-categories/:id` - Category operations
- `GET /vehicle-finances/dashboard` - Dashboard metrics (Next.js API route)

#### System
- `GET/POST/PUT /admin/settings` - Admin settings
- `POST /uploads` - File uploads
- `GET /uploads/branding/:filename` - Branding file serving
- `GET /uploads/:type/:filename` - General file serving
- `DELETE /uploads/:type/:filename` - File deletion
- `GET /api/health` - Health check

## Frontend Structure

### Pages (Next.js App Router)

**Core Pages:**
- `/` - Home/Dashboard
- `/dashboard` - Main dashboard
- `/customers` - Customer list
- `/vendors` - Vendor list
- `/employees` - Employee list
- `/vehicles` - Vehicle list

**Document Pages:**
- `/quotes/create` - Create/Edit quote
- `/quotations` - Quote list
- `/purchase-orders` - PO list
- `/purchase-orders/create` - Create/Edit PO
- `/invoices` - Invoice list
- `/invoices/create` - Create/Edit invoice
- `/payslips` - Payslip list
- `/salary-calculation` - Salary calculator

**Financial Pages:**
- `/vehicle-finances` - Vehicle finances dashboard
- `/vehicle-finances/[vehicleId]` - Vehicle transaction details
- `/vehicle-profitability` - Vehicle profitability analysis
- `/finances/expense-categories` - Expense category management

**System Pages:**
- `/admin` - Admin settings
- `/reports` - Reports
- `/debug` - Debug utilities

### Components

**Layout Components:**
- `layout-wrapper.tsx` - Main layout wrapper
- `sidebar.tsx` - Navigation sidebar
- `navigation.tsx` - Top navigation
- `theme-provider.tsx` - Theme management (light/dark)

**Feature Components:**
- `dashboard.tsx` - Dashboard layout
- `quick-actions.tsx` - Quick action buttons
- `revenue-trend-chart.tsx` - Revenue chart
- `overview-card.tsx` - KPI cards
- `invoice-generator.tsx` - Invoice generation
- `billing-tracker.tsx` - Billing tracking
- `rental-tracker.tsx` - Rental tracking
- `data-management.tsx` - Data management UI
- `expense-category-manager.tsx` - Expense category manager

**Vehicle Finance Components:**
- `vehicle-finance-dashboard.tsx` - Finance dashboard
- `vehicle-finance-card.tsx` - Finance card
- `vehicle-finance-charts.tsx` - Finance charts
- `vehicle-finance-kpi-card.tsx` - KPI cards
- `vehicle-finance-search.tsx` - Search component
- `vehicle-profitability-chart.tsx` - Profitability chart
- `vehicle-transaction-form.tsx` - Transaction form

**UI Components (shadcn/ui):**
- 58 UI components in `components/ui/`
- Includes: buttons, forms, dialogs, tables, charts, etc.

## Document Generation

### PDF Generation (`lib/pdf.ts`)
- Uses jsPDF + html2canvas
- Renders HTML template to canvas
- Converts canvas to PDF
- Embeds branding images (logo, seal, signature)
- Supports Quotes, Invoices, Purchase Orders

### DOCX Generation (`lib/docx.ts`)
- Uses docx library
- Programmatic document creation
- Embeds branding images
- Supports Quotes and Invoices

### Excel Generation (`lib/excel.ts`)
- Uses exceljs library
- Workbook creation with formulas
- Supports Quotes and Invoices

## Testing Infrastructure

### Unit Tests (Jest)

**Test Files:**
1. `lib/__tests__/validation.test.ts` - Validation logic
2. `lib/__tests__/utils.test.ts` - Utility functions
3. `lib/__tests__/renderers.test.ts` - Document renderers
4. `api/__tests__/quotes.test.ts` - Quotes API
5. `api/__tests__/invoices.test.ts` - Invoices API
6. `api/__tests__/customers.test.ts` - Customers API
7. `api/__tests__/payslips.test.ts` - Payslips API
8. `api/__tests__/purchase-orders.test.ts` - Purchase Orders API
9. `api/__tests__/vehicles.test.ts` - Vehicles API (includes profitability)
10. `api/__tests__/employees.test.ts` - Employees API
11. `api/__tests__/vendors.test.ts` - Vendors API
12. `api/__tests__/admin.test.ts` - Admin Settings API
13. `api/__tests__/uploads.test.ts` - Uploads API
14. `api/__tests__/vehicle-transactions.test.ts` - Vehicle Transactions API
15. `api/__tests__/expense-categories.test.ts` - Expense Categories API
16. `api/__tests__/vehicle-finances.test.ts` - Dashboard Metrics

**Test Coverage:**
- Core validation logic
- API route handlers
- Business logic calculations
- Error handling
- Data validation
- Reference checking

### E2E Tests (Playwright)

**Test Projects:**
- Core: Essential user flows
- Extended: Additional scenarios

**Test Files:**
- `e2e/core/` - Core test scenarios
- `e2e/extended/` - Extended scenarios
- `e2e/explore-quotes.spec.ts` - Quote exploration

## Build Process

### Development
```bash
npm run dev          # Run API + Next.js dev server concurrently
npm run api:dev      # Run API server only (tsx)
```

### Production Build
```bash
npm run build:electron    # Full Electron build
npm run build:server      # Compile TypeScript API only
npm run build:all         # Build Electron + Server
```

### Build Steps
1. Backup `app/api` (Next.js static export doesn't support API routes)
2. Build Next.js with static export → `out/`
3. Restore `app/api`
4. Compile TypeScript API → `dist-server/`
5. Package with electron-builder → `dist/`

### Electron Packaging
- **Windows:** NSIS installer
- **Mac:** DMG
- **Linux:** AppImage

## File Structure

```
miniCRM/
├── api/                    # Express API server
│   ├── routes/            # API route handlers
│   ├── adapters/          # Database adapters
│   ├── services/          # Business logic services
│   └── server.ts          # Express server setup
├── app/                    # Next.js App Router pages
│   ├── [module]/          # Module pages
│   └── layout.tsx         # Root layout
├── components/             # React components
│   ├── ui/               # shadcn/ui components
│   └── [feature].tsx     # Feature components
├── lib/                    # Shared libraries
│   ├── database.ts       # Database initialization
│   ├── types.ts          # TypeScript types
│   ├── api-client.ts     # API client
│   ├── pdf.ts            # PDF generation
│   ├── docx.ts           # DOCX generation
│   ├── excel.ts          # Excel generation
│   └── __tests__/        # Unit tests
├── electron/              # Electron main process
│   ├── main.js           # Main process
│   └── preload.js        # Preload script
├── data/                  # Application data
│   ├── imanage.db        # SQLite database
│   ├── uploads/          # Uploaded files
│   └── branding/         # Branding images
├── dist-server/           # Compiled API (TypeScript → JS)
├── out/                   # Next.js static export
├── dist/                  # Electron build output
└── docs/                  # Documentation
```

## Data Storage

### Database
- **Primary:** SQLite (`data/imanage.db`)
- **Fallback:** localStorage (if SQLite unavailable)
- **Location:** `./data/` directory (project folder)

### File Storage
- **Uploads:** `data/uploads/{type}/` (UUID-based naming)
- **Branding:** `data/branding/` (fixed names: logo.png, seal.png, signature.png)

## Configuration

### Environment Variables
- `PORT` - API server port (default: 3001)
- `DB_FILENAME` - Database filename (default: imanage.db)
- `NODE_ENV` - Environment (development/production)

### Admin Settings
- Company profile (name, address, VAT)
- Branding (logo, seal, signature)
- Quote number pattern
- Currency (default: AED)
- Default Terms & Conditions
- UI customization flags

## Recent Updates & Features

### Vehicle Financial Management
- ✅ Vehicle transaction tracking (expense/revenue)
- ✅ Expense category management
- ✅ Vehicle profitability analysis
- ✅ Dashboard metrics and KPIs
- ✅ 12-month rolling window for profitability
- ✅ Date validation (no future dates, max 12 months back)

### Document Modules Synchronization
- ✅ Consistent layout across Quotes, POs, Invoices
- ✅ 3-column grid layout (main content + sticky sidebar)
- ✅ Additional notes field in all documents
- ✅ Consistent styling and UX patterns

### Testing Infrastructure
- ✅ Comprehensive unit test coverage (16 test files)
- ✅ E2E test framework (Playwright)
- ✅ Test automation documentation

### Build & Deployment
- ✅ Electron packaging working
- ✅ Static export for Next.js
- ✅ Server compilation for production
- ✅ Windows installer generation

## Known Limitations

1. **Next.js API Routes:** Static export doesn't support API routes, so dashboard metrics endpoint uses Next.js API route handler
2. **Database Migration:** Manual migration scripts for schema changes
3. **Offline Support:** Limited offline functionality (depends on SQLite availability)
4. **Multi-user:** Single-user desktop application (no multi-user support)

## Future Enhancements

### Planned Features
- Multi-currency support
- Advanced reporting and analytics
- Email integration for document sending
- Backup and restore functionality
- Data import/export (CSV, Excel)
- Advanced search and filtering
- User authentication and roles
- Audit trail and change history

### Technical Improvements
- Database migration system
- API versioning
- Enhanced error handling and logging
- Performance optimization
- Accessibility improvements
- Mobile responsive design

## Development Guidelines

### Code Style
- TypeScript strict mode
- ESLint for code quality
- Consistent component structure
- Modular architecture

### Testing
- Unit tests for business logic
- E2E tests for user flows
- Test coverage reporting
- Continuous integration ready

### Documentation
- Inline code comments
- API documentation
- Architecture documentation
- User guides

## Support & Maintenance

### Logs
- API server logs in console
- Electron main process logs
- Database initialization logs

### Debugging
- DevTools in development mode
- Debug page at `/debug`
- PDF test page at `/debug/pdf-test`

### Data Management
- Data management UI component
- Database backup recommendations
- File storage cleanup utilities

---

**Document Version:** 1.0.0  
**Last Updated:** December 2024  
**Maintained By:** Development Team



