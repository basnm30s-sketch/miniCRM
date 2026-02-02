# Test Cases Registry

This document lists all the automation test cases implemented in the project.

## Module 1: Core Content Validation
**File:** `lib/__tests__/validation.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **Basic Helpers** | `isPositiveNumber returns true for positive numbers` | Returns true for positive numbers. | **Global:** Affects all numeric inputs (Price, Quantity) across Quotes/Invoices/Vehicles. |
| | `isPositiveNumber returns false for non-positive numbers` | Returns false for non-positive numbers (0, negative, NaN). | **Global:** Prevents invalid data entry in forms across the app. |
| | `isNonEmptyString returns true for valid strings` | Returns true for valid strings. | **Global:** Validates required text fields (Names, Descriptions). |
| | `isNonEmptyString returns false for empty or whitespace strings` | Returns false for empty or whitespace strings. | **Global:** Prevents submission of empty required fields. |
| | `isValidDate returns true for valid dates` | Returns true for valid date strings. | **Global:** Validates Date pickers in Quotes/Invoices/Reports. |
| | `isValidDate returns false for invalid dates` | Returns false for invalid date strings. | **Global:** Prevents invalid date formats which could crash reports. |
| **validateQuoteForExport** | `should return valid` | Verifies a correctly formed quote object. | **Quotes Page:** Ensures "Export to PDF/Excel" works correctly for valid quotes. |
| | `missing quote number` | Fails if quote number is missing. | **Quotes Page:** Blocks export if critical metadata is missing. |
| | `empty line items` | Fails if line items array is empty. | **Quotes Page:** Blocks export of empty quotes (prevents generating blank docs). |
| | `total not positive` | Fails if quote total is 0 or negative. | **Quotes Page:** Ensures exported financial documents have valid totals. |
| **validateQuote (Async)** | `valid quote` | Passes validation for a valid quote with mocked storage. | **Create/Edit Quote:** Allows user to save a valid quote to the database. |
| | `unique number check` | Fails if a quote with the same number already exists in storage. | **Create/Edit Quote:** Prevents duplicate Quote Numbers (Data Integrity). |
| | `customer existence` | Fails if the referenced customer ID does not exist in storage. | **Create/Edit Quote:** Ensures integrity of Customer link (prevents orphaned records). |
| **validateInvoice (Async)** | `valid invoice` | Passes validation for a valid invoice with mocked storage. | **Create/Edit Invoice:** Allows user to save a valid invoice. |
| | `unique number check` | Fails if an invoice with the same number already exists. | **Create/Edit Invoice:** Prevents duplicate Invoice Numbers. |
| | `customer existence` | Fails if the referenced customer ID does not exist. | **Create/Edit Invoice:** Ensures integrity of Customer link. |

## Module 2: General Utilities
**File:** `lib/__tests__/utils.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **cn (ClassName)** | `merge class names` | Verifies simple string merging. | **All Pages (UI):** Ensures styles are applied correctly to all components. |
| | `conditional classes` | Verifies boolean logic (e.g. `isActive && 'active'`). | **All Pages (UI):** Controls dynamic states like Active Tabs, Button states, or Error highlights. |
| | `arrays/objects` | Verifies support for array/object inputs (clsx behavior). | **All Pages (UI):** Supports complex styling logic in components. |
| | `tailwind conflicts` | Verifies that later utility classes override earlier ones (e.g. `p-4` overrides `p-2`). | **All Pages (UI):** Ensures Style Overrides work (e.g., custom button padding overriding defaults). |

## Module 3: Backend API Logic
**File:** `api/__tests__/quotes.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **GET /quotes** | `return all quotes` | Verifies retrieval of quote array from mocked adapter. | **Quotes List Page:** Controls loading the main table of quotes. failure = Blank screen. |
| | `handle errors` | Verifies 500 response when adapter throws error. | **Quotes List Page:** Ensures app handles DB errors gracefully (e.g. showing error toast). |
| **GET /quotes/:id** | `return quote by id` | Verifies retrieval of single quote. | **Quote Details/Edit:** Controls loading specific quote data. failure = "Quote not found". |
| | `return 404` | Verifies 404 response when quote is not found. | **Quote Details:** Correctly handles invalid URLs/IDs. |
| **POST /quotes** | `create new quote` | Verifies creation logic and 201 response. | **Create Quote:** The core action of saving a new quote. failure = Cannot save work. |
| **DELETE /quotes/:id** | `delete quote` | Verifies deletion logic and 204 response. | **Quotes List:** The action of removing a quote. failure = Cannot delete items. |

## Module 4: Invoices API
**File:** `api/__tests__/invoices.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **GET /invoices** | `return all invoices` | Verifies retrieval of all invoices. | **Invoices List:** Loading the main invoices table. |
| | `handle errors` | Verifies 500 response on DB error. | **Invoices List:** Graceful error handling for DB failures. |
| **GET /invoices/:id** | `return invoice by id` | Verifies retrieval of single invoice. | **Invoice Details:** Loading specific invoice data. |
| | `return 404` | Verifies 404 if not found. | **Invoice Details:** Handling invalid URLs. |
| | `handle errors` | Verifies 500 response on DB error. | **Invoice Details:** Graceful error handling for DB failures. |
| **POST /invoices** | `create new invoice` | Verifies creation logic. | **Create Invoice:** Saving a new invoice. |
| | `validation error (customer)` | Fails if customer does not exist. | **Create Invoice:** Data integrity for linked customer. |
| | `validation error (required)` | Fails if required fields (total) missing. | **Create Invoice:** Form validation enforcement. |
| | `return 500 for other errors` | Verifies 500 response for unexpected errors. | **Create Invoice:** Handling unexpected errors during creation. |
| **PUT /invoices/:id** | `update invoice` | Verifies update logic. | **Edit Invoice:** Saving changes to an invoice. |
| | `return 404` | Verifies 404 if updating non-existent invoice. | **Edit Invoice:** Handling concurrent deletions/invalid IDs. |
| | `handle errors` | Verifies 500 response on DB error. | **Edit Invoice:** Graceful error handling for DB failures. |
| **DELETE /invoices/:id** | `delete invoice` | Verifies deletion logic. | **Invoices List:** Removing an invoice. |
| | `handle errors` | Verifies 500 response on DB error. | **Invoices List:** Graceful error handling for DB failures. |

## Module 5: Customers API
**File:** `api/__tests__/customers.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **GET /customers** | `return all customers` | Verifies retrieval of customers list. | **Customers List:** Loading the main customer directory. |
| | `handle errors` | Verifies 500 response on DB error. | **Customers List:** Graceful error handling for DB failures. |
| **GET /customers/:id** | `return customer by id` | Verifies retrieval of single customer. | **Customer Details:** Loading specific customer info. |
| | `return 404` | Verifies 404 if customer not found. | **Customer Details:** Handling invalid URLs/IDs. |
| | `handle errors` | Verifies 500 response on DB error. | **Customer Details:** Graceful error handling for DB failures. |
| **POST /customers** | `create new customer` | Verifies creation logic. | **Add Customer:** Onboarding a new client. |
| | `handle errors` | Verifies 500 response on DB error. | **Add Customer:** Graceful error handling for DB failures. |
| **PUT /customers/:id** | `update customer` | Verifies update logic. | **Edit Customer:** Updating contact details. |
| | `return 404` | Verifies 404 if customer not found. | **Edit Customer:** Handling concurrent deletions/invalid IDs. |
| | `handle errors` | Verifies 500 response on DB error. | **Edit Customer:** Graceful error handling for DB failures. |
| **DELETE /customers/:id** | `delete customer` | Verifies deletion logic. | **Customers List:** Removing a client. |
| | `return 409 (referenced)` | Fails if customer has linked Quotes/Invoices. | **Data Integrity:** Prevents accidental deletion of active clients. |
| | `handle other errors` | Verifies 500 response for other errors. | **Customers List:** Graceful error handling for DB failures. |

## Module 6: Payslips API
**File:** `api/__tests__/payslips.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **GET /test** | `return working message` | Verifies router is working. | **Payslips API:** Basic connectivity test. |
| **GET /payslips** | `return all payslips` | Verifies retrieval of payslips. | **Payroll History:** Loading list of all generated payslips. |
| | `return empty array on errors` | Returns empty array instead of 500 on error (per implementation). | **Payroll History:** Graceful error handling returning empty array. |
| **GET /payslips/month/:m** | `return by month` | Verifies filtering by month (YYYY-MM). | **Payroll:** Viewing payslips for a specific period. |
| | `invalid format` | Fails if month is not YYYY-MM. | **Payroll:** Validating filter inputs. |
| | `handle errors` | Verifies 500 response on DB error. | **Payroll:** Graceful error handling for DB failures. |
| **GET /payslips/:id** | `return filtered payslip filtered by id` | Verifies retrieval of single payslip by id. | **Payslip Details:** Loading specific payslip data. |
| | `return 404` | Verifies 404 if payslip not found. | **Payslip Details:** Handling invalid URLs/IDs. |
| **POST /payslips** | `create payslip` | Verifies creation logic. | **Generate Payslip:** creating a new salary record. |
| | `missing fields` | Fails if employeeId or month missing. | **Generate Payslip:** Enforcing required data. |
| | `handle errors` | Verifies 500 response on DB error. | **Generate Payslip:** Graceful error handling for DB failures. |
| **PUT /payslips/:id** | `update payslip` | Verifies update logic. | **Edit Payslip:** Saving changes to a payslip. |
| | `return 404` | Verifies 404 if payslip not found. | **Edit Payslip:** Handling concurrent deletions/invalid IDs. |
| **DELETE /payslips/:id** | `delete payslip` | Verifies deletion logic. | **Payslips List:** Removing a payslip. |

## Module 7: Purchase Orders API
**File:** `api/__tests__/purchase-orders.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **GET /purchase-orders** | `return all POs` | Verifies retrieval of PO list. | **PO List:** Loading purchase orders. |
| | `handle errors` | Verifies 500 response on DB error. | **PO List:** Graceful error handling for DB failures. |
| **GET /purchase-orders/:id** | `return a PO by id` | Verifies retrieval of single PO. | **PO Details:** Loading specific PO data. |
| | `return 404` | Verifies 404 if PO not found. | **PO Details:** Handling invalid URLs/IDs. |
| **POST /purchase-orders** | `create a new PO` | Verifies creation logic. | **Create PO:** Saving a new purchase order. |
| | `handle errors` | Verifies 500 response on DB error. | **Create PO:** Graceful error handling for DB failures. |
| **PUT /purchase-orders/:id** | `update a PO` | Verifies update logic. | **Edit PO:** Saving changes to a purchase order. |
| | `return 404` | Verifies 404 if PO not found. | **Edit PO:** Handling concurrent deletions/invalid IDs. |
| **DELETE /purchase-orders/:id** | `delete a PO` | Verifies deletion logic. | **PO List:** Removing a draft/cancelled PO. |
| | `check references` | Fails if PO is linked to an Invoice. | **Data Integrity:** Prevents breaking supply chain history. |
| | `handle general errors` | Verifies 500 response for general errors. | **PO List:** Graceful error handling for DB failures. |

## Module 8: Vehicles API
**File:** `api/__tests__/vehicles.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **GET /vehicles** | `return all vehicles` | Verifies retrieval of fleet. | **Fleet Management:** Loading vehicle types. |
| | `handle errors` | Verifies 500 response on DB error. | **Fleet Management:** Graceful error handling for DB failures. |
| **GET /vehicles/:id** | `return a vehicle by id` | Verifies retrieval of single vehicle. | **Vehicle Details:** Loading specific vehicle data. |
| | `return 404` | Verifies 404 if vehicle not found. | **Vehicle Details:** Handling invalid URLs/IDs. |
| **POST /vehicles** | `create a new vehicle` | Verifies creation logic. | **Add Vehicle:** Adding a new vehicle to fleet. |
| | `handle errors` | Verifies 500 response on DB error. | **Add Vehicle:** Graceful error handling for DB failures. |
| **PUT /vehicles/:id** | `update a vehicle` | Verifies update logic. | **Edit Vehicle:** Saving changes to a vehicle. |
| | `return 404` | Verifies 404 if vehicle not found. | **Edit Vehicle:** Handling concurrent deletions/invalid IDs. |
| **DELETE /vehicles/:id** | `delete a vehicle` | Verifies deletion logic. | **Fleet Management:** Removing a vehicle. |
| | `check references` | Fails if Vehicle is used in any Quote. | **Data Integrity:** Prevents deleting assets used in active quotes. |
| | `return 409 generic error if FK fails but no refs found` | Returns 409 if FK fails but no refs found (rare case). | **Data Integrity:** Handling edge case in reference checking. |
| | `handle general errors` | Verifies 500 response for general errors. | **Fleet Management:** Graceful error handling for DB failures. |
| **GET /vehicles/:id/profitability** | `return profitability data for vehicle` | Verifies profitability data retrieval for a vehicle. | **Vehicle Finances:** Loading profitability data. |
| | `return 404 if vehicle not found` | Verifies 404 if vehicle does not exist. | **Vehicle Finances:** Handling invalid vehicle IDs. |
| | `verify profitability structure` | Verifies- [x] Stabilize Quotes Component Tests (Flaky dropdowns & redirect urgency)tMonth, lastMonth, allTimeRevenue, etc.). | **Vehicle Finances:** Ensuring correct data structure for frontend. |
| | `verify month normalization (YYYY-MM format)` | Verifies all months are in YYYY-MM format. | **Vehicle Finances:** Ensuring consistent month formatting for chart display. |
| | `handle errors` | Verifies 500 response on DB error. | **Vehicle Finances:** Graceful error handling for DB failures. |

## Module 9: Employees API
**File:** `api/__tests__/employees.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **GET /employees** | `return all employees` | Verifies retrieval of workforce. | **Staff Directory:** Loading employee list. |
| | `handle errors` | Verifies 500 response on DB error. | **Staff Directory:** Graceful error handling for DB failures. |
| **GET /employees/:id** | `return an employee by id` | Verifies retrieval of single employee. | **Employee Details:** Loading specific employee info. |
| | `return 404` | Verifies 404 if employee not found. | **Employee Details:** Handling invalid URLs/IDs. |
| **POST /employees** | `create a new employee` | Verifies creation logic. | **Add Employee:** Onboarding a new staff member. |
| | `handle errors` | Verifies 500 response on DB error. | **Add Employee:** Graceful error handling for DB failures. |
| **PUT /employees/:id** | `update an employee` | Verifies update logic. | **Edit Employee:** Updating employee details. |
| | `return 404` | Verifies 404 if employee not found. | **Edit Employee:** Handling concurrent deletions/invalid IDs. |
| **DELETE /employees/:id** | `delete an employee` | Verifies deletion logic. | **Staff Directory:** Removing an employee. |
| | `check references` | Fails if Employee has Payslips. | **Data Integrity:** Prevents deleting staff with financial history. |
| | `handle general errors` | Verifies 500 response for general errors. | **Staff Directory:** Graceful error handling for DB failures. |

## Module 10: Vendors API
**File:** `api/__tests__/vendors.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **GET /vendors** | `return all vendors` | Verifies retrieval of suppliers. | **Vendor List:** Loading supplier directory. |
| | `handle errors` | Verifies 500 response on DB error. | **Vendor List:** Graceful error handling for DB failures. |
| **GET /vendors/:id** | `return a vendor by id` | Verifies retrieval of single vendor. | **Vendor Details:** Loading specific vendor info. |
| | `return 404` | Verifies 404 if vendor not found. | **Vendor Details:** Handling invalid URLs/IDs. |
| **POST /vendors** | `create a new vendor` | Verifies creation logic. | **Add Vendor:** Onboarding a new supplier. |
| | `handle errors` | Verifies 500 response on DB error. | **Add Vendor:** Graceful error handling for DB failures. |
| **PUT /vendors/:id** | `update a vendor` | Verifies update logic. | **Edit Vendor:** Updating vendor details. |
| | `return 404` | Verifies 404 if vendor not found. | **Edit Vendor:** Handling concurrent deletions/invalid IDs. |
| **DELETE /vendors/:id** | `delete a vendor` | Verifies deletion logic. | **Vendor List:** Removing a supplier. |
| | `check references` | Fails if Vendor has POs or Invoices. | **Data Integrity:** Prevents deleting suppliers with active orders. |
| | `handle general errors` | Verifies 500 response for general errors. | **Vendor List:** Graceful error handling for DB failures. |

## Module 11: Admin Settings API
**File:** `api/__tests__/admin.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **GET /settings** | `return admin settings` | Verifies retrieval of config. | **Settings Page:** Loading company details. |
| | `handle errors` | Verifies 500 response on DB error. | **Settings Page:** Graceful error handling for DB failures. |
| **POST /settings** | `save settings via POST` | Verifies saving configuration via POST. | **Settings Page:** Updating company branding/info. |
| | `handle errors` | Verifies 500 response on DB error. | **Settings Page:** Graceful error handling for DB failures. |
| **PUT /settings** | `save settings via PUT` | Verifies saving configuration via PUT. | **Settings Page:** Updating company branding/info. |
| | `handle errors` | Verifies 500 response on DB error. | **Settings Page:** Graceful error handling for DB failures. |

## Module 12: Uploads & Storage
**File:** `api/__tests__/uploads.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **POST /uploads** | `upload general file` | Verifies file upload logic. | **Attachments:** Uploading documents/images. |
| | `upload branding` | Verifies branding file upload. | **Settings:** Uploading Logo/Seal/Signature. |
| | `return 400 if no file attached` | Fails if no file is attached. | **Attachments:** Validating file presence. |
| | `invalid type` | Fails for unknown file types. | **Security:** Restricting uploads to allowed types. |
| **GET /branding/check** | `return status` | Verifies checking existing files. | **Settings:** Displaying current branding status. |
| **GET /branding/:filename** | `return branding file content` | Verifies retrieval of branding file. | **Settings:** Displaying logo/seal/signature. |
| | `return 404 if branding file does not exist` | Verifies 404 if branding file not found. | **Settings:** Handling missing branding files. |
| **GET /:type/:filename** | `return file content` | Verifies retrieval of uploaded file. | **Attachments:** Downloading/viewing uploaded files. |
| | `return 400 for invalid type` | Verifies 400 for invalid file type. | **Security:** Restricting access to valid file types. |
| | `return 404 if file does not exist` | Verifies 404 if file not found. | **Attachments:** Handling missing files. |
| **DELETE /:type/:filename** | `delete a file` | Verifies file deletion logic. | **Attachments:** Removing uploaded files. |
| | `return 400 for invalid type` | Verifies 400 for invalid file type. | **Security:** Restricting deletion to valid file types. |

## Module 13: Document Renderers
**File:** `lib/__tests__/renderers.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **Excel Renderer** | `Quote Blob` | Verifies Excel generation for Quotes. | **Quote Export:** Downloading Quote as Excel. |
| | `Invoice Blob` | Verifies Excel generation for Invoices. | **Invoice Export:** Downloading Invoice as Excel. |
| **DOCX Renderer** | `Quote Blob` | Verifies Word generation for Quotes. | **Quote Export:** Downloading Quote as Word. |
| | `Invoice Blob` | Verifies Word generation for Invoices. | **Invoice Export:** Downloading Invoice as Word. |
| **PDF Renderer** | `ClientSidePDFRenderer is DOM-dependent and skipped` | Placeholder for PDF renderer (skipped in unit tests). | **Quote/Invoice Export:** PDF generation requires DOM (skipped). |

## Module 14: Vehicle Transactions API
**File:** `api/__tests__/vehicle-transactions.test.ts`

| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **GET /vehicle-transactions** | `return all transactions` | Verifies retrieval of all transactions. | **Vehicle Finances:** Loading transaction list. |
| | `filter by vehicleId query parameter` | Verifies filtering by vehicleId. | **Vehicle Finances:** Filtering transactions by vehicle. |
| | `filter by vehicleId and month query parameters` | Verifies filtering by vehicleId and month. | **Vehicle Finances:** Filtering transactions by vehicle and month. |
| | `handle errors` | Verifies 500 response on DB error. | **Vehicle Finances:** Graceful error handling for DB failures. |
| **GET /vehicle-transactions/:id** | `return transaction by id` | Verifies retrieval of single transaction. | **Vehicle Finances:** Loading specific transaction data. |
| | `return 404 if transaction not found` | Verifies 404 if transaction not found. | **Vehicle Finances:** Handling invalid transaction IDs. |
| | `handle errors` | Verifies 500 response on DB error. | **Vehicle Finances:** Graceful error handling for DB failures. |
| **POST /vehicle-transactions** | `create a new transaction` | Verifies creation logic. | **Vehicle Finances:** Creating a new transaction. |
| | `return 400 if vehicle does not exist` | Fails if vehicle does not exist. | **Vehicle Finances:** Data integrity for linked vehicle. |
| | `return 400 if amount is not positive` | Fails if amount is not positive. | **Vehicle Finances:** Form validation enforcement. |
| | `return 400 if date is in the future` | Fails if transaction date is in the future. | **Vehicle Finances:** Preventing future-dated transactions. |
| | `return 400 if date is more than 12 months in the past` | Fails if transaction date is more than 12 months in the past. | **Vehicle Finances:** Limiting backdating to 12 months. |
| | `return 400 if employee does not exist` | Fails if employee does not exist. | **Vehicle Finances:** Data integrity for linked employee. |
| | `handle general errors` | Verifies 500 response for unexpected errors. | **Vehicle Finances:** Handling unexpected errors during creation. |
| **PUT /vehicle-transactions/:id** | `update a transaction` | Verifies update logic. | **Vehicle Finances:** Saving changes to a transaction. |
| | `return 404 if transaction not found` | Verifies 404 if updating non-existent transaction. | **Vehicle Finances:** Handling concurrent deletions/invalid IDs. |
| | `return 400 for validation errors` | Verifies 400 response for validation errors. | **Vehicle Finances:** Form validation enforcement on update. |
| | `handle general errors` | Verifies 500 response for general errors. | **Vehicle Finances:** Graceful error handling for DB failures. |
| **DELETE /vehicle-transactions/:id** | `delete a transaction` | Verifies deletion logic. | **Vehicle Finances:** Removing a transaction. |
| | `handle errors` | Verifies 500 response on DB error. | **Vehicle Finances:** Graceful error handling for DB failures. |

## Module 15: Expense Categories API
**File:** `api/__tests__/expense-categories.test.ts`| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **GET /expense-categories** | `return all categories` | Verifies retrieval of all categories. | **Vehicle Finances:** Loading expense category list. |
| | `handle errors` | Verifies 500 response on DB error. | **Vehicle Finances:** Graceful error handling for DB failures. |
| **GET /expense-categories/:id** | `return category by id` | Verifies retrieval of single category. | **Vehicle Finances:** Loading specific category data. |
| | `return 404 if category not found` | Verifies 404 if category not found. | **Vehicle Finances:** Handling invalid category IDs. |
| | `handle errors` | Verifies 500 response on DB error. | **Vehicle Finances:** Graceful error handling for DB failures. |
| **POST /expense-categories** | `create a new category` | Verifies creation logic. | **Vehicle Finances:** Creating a custom expense category. |
| | `return 400 if name is required` | Fails if category name is missing. | **Vehicle Finances:** Form validation enforcement. |
| | `return 400 for UNIQUE constraint violation` | Fails if category name already exists. | **Vehicle Finances:** Preventing duplicate category names. |
| | `handle general errors` | Verifies 500 response for unexpected errors. | **Vehicle Finances:** Handling unexpected errors during creation. |
| **PUT /expense-categories/:id** | `update a category` | Verifies update logic. | **Vehicle Finances:** Saving changes to a category. |
| | `return 404 if category not found` | Verifies 404 if updating non-existent category. | **Vehicle Finances:** Handling concurrent deletions/invalid IDs. |
| | `return 400 for UNIQUE constraint violation` | Fails if updated category name already exists. | **Vehicle Finances:** Preventing duplicate category names on update. |
| | `handle general errors` | Verifies 500 response for general errors. | **Vehicle Finances:** Graceful error handling for DB failures. |
| **DELETE /expense-categories/:id** | `delete a category` | Verifies deletion logic. | **Vehicle Finances:** Removing a category. |
| | `return 409 if category is referenced` | Fails if category is used in transactions. | **Data Integrity:** Prevents deleting categories with transaction history. |
| | `handle general errors` | Verifies 500 response for general errors. | **Vehicle Finances:** Graceful error handling for DB failures. |## Module 16: Vehicle Finances Dashboard Metrics
**File:** `api/__tests__/vehicle-finances.test.ts`| Test Group | Test Case | Description | Functional Explanation (Impact Area) |
| :--- | :--- | :--- | :--- |
| **getDashboardMetrics()** | `return dashboard metrics structure` | Verifies dashboard metrics structure (overall, timeBased, vehicleBased, customerBased, categoryBased, operational). | **Vehicle Finances Dashboard:** Ensuring correct data structure for frontend. |
| | `calculate overall metrics correctly` | Verifies calculation of total revenue, expenses, net profit, and profit margin. | **Vehicle Finances Dashboard:** Displaying overall financial summary. |
| | `calculate vehicle-based metrics` | Verifies calculation of vehicle metrics (total vehicles, revenue, expenses, profit, top/bottom performers). | **Vehicle Finances Dashboard:** Displaying vehicle performance metrics. |
| | `calculate customer-based metrics` | Verifies calculation of customer metrics (total unique customers, top customers by revenue, average revenue per customer). | **Vehicle Finances Dashboard:** Displaying customer performance metrics. |
| | `calculate category-based metrics` | Verifies calculation of category metrics (revenue by category, expenses by category, top expense category). | **Vehicle Finances Dashboard:** Displaying category breakdown metrics. |
| | `calculate operational metrics` | Verifies calculation of operational metrics (revenue per vehicle per month, expense ratio, most active vehicle, avg transactions per vehicle). | **Vehicle Finances Dashboard:** Displaying operational efficiency metrics. |
| | `handle empty data gracefully` | Verifies metrics return zero values when no data exists. | **Vehicle Finances Dashboard:** Handling empty state gracefully. |
| | `calculate time-based metrics` | Verifies calculation of time-based metrics (current month, last month, monthly trend for 12 months). | **Vehicle Finances Dashboard:** Displaying time-based trends. |
| | `handle errors gracefully` | Verifies 500 response on DB error. | **Vehicle Finances Dashboard:** Graceful error handling for DB failures. |