# Work Log

This file records work performed in the repo (by plan or task). After implementing any plan, add an entry describing what was actually done.

**Format:** Date | Plan/task name | Short list of changes (files touched, behavior). Newest entries at the top.

---

## Entries

### 2025-03-10 — Customer/vendor full details on invoice and PO forms; consistent PDF block

**Plan:** Customer/Vendor full details on Invoice and Purchase Order forms – impact and plan

**What was done:**
- **app/invoices/InvoiceForm.tsx** — Extended the customer details card below "Select Customer" to match quotations: when a customer is selected, the card now shows name (or company), company (contact person), and when present Email, Phone, Address in a two-column layout (label left, value right; "—" when empty). Same structure and styling as QuoteForm (p-3 bg-slate-50 rounded border, mt-2 space-y-1 for contact rows).
- **app/purchase-orders/PurchaseOrderForm.tsx** — Extended the vendor details card below "Select Vendor" to include Email, Phone, Address in the same pattern as customer details (name, contact person, then Email/Phone/Address rows with "—" when empty). PDF export now passes a full vendor object (name, contactPerson, address, email, phone) to renderPurchaseOrderToPdf instead of vendor name string.
- **lib/pdf.ts** — Added exported type `PdfVendor` (name, contactPerson, address, email, phone). Changed `renderPurchaseOrderToPdf` and `buildPurchaseOrderHtml` to accept `vendor: PdfVendor | null`. PO PDF vendor block now uses the same layout and styling as the customer block in quote/invoice PDFs: container, "VENDOR" heading, name (18px bold), "Contact:" contactPerson (12px), address, Email, Phone (12px); fallback "Unknown Vendor" when null.
- **app/purchase-orders/page.tsx** — When calling `renderPurchaseOrderToPdf`, now builds and passes a `pdfVendor` object from `getVendorDetails`/vendors list (or null) instead of vendor name string.

### 2025-03-10 — Create invoice from existing

**Plan:** Create invoice from existing – impact analysis and implementation plan

**What was done:**
- **app/invoices/create/page.tsx** — Reworked create flow: (1) When no `id`, `quoteId`, or `copyFrom` query params, show inline choice screen (card with two buttons: "New empty invoice", "Copy from existing invoice").
- **app/invoices/create/page.tsx** — (2) "Copy from existing" shows list step: fetch all invoices and customers; filters by customer (dropdown) and vehicle number (text input, substring match on line items); table of invoices (number, customer, date, total) with "Use this invoice" → navigate to same page with `copyFrom=<id>`.
- **app/invoices/create/page.tsx** — (3) When `copyFrom` is present, fetch source invoice, build clone via `buildInvoiceCloneFrom(source)` (new id, `generateInvoiceNumber()`, date = today, dueDate = undefined, status = draft, amountReceived = 0, new item ids; copy customerId, items, terms, notes, poNumbers, vendorId, quoteId), set as initialData and show form.
- **app/invoices/create/page.tsx** — (4) "New empty" shows form with no initialData.
- **app/invoices/create/page.tsx** — Back link to /invoices; from list step, Back returns to choice.
- **app/invoices/create/page.tsx** — Loading state when loading by id/quoteId/copyFrom; empty state when no invoices match filters.
- No API or schema changes; uses existing getInvoiceById, getAllInvoices, getAllCustomers, generateInvoiceNumber, generateId.

### 2025-03-10 — UI fixes: customer dropdown, save toasts, quote export filenames

**Task:** Ad-hoc fixes (no formal plan)

**What was done:**
- **Add Customer dropdown** — In Create Quotation and Create/Edit Invoice, clicking "+ Add Customer" opened the modal but the customer Select dropdown stayed open. Fixed by controlling the Select with `open` / `onOpenChange` and closing it when "+ Add Customer" is clicked. **app/quotations/QuoteForm.tsx**, **app/invoices/InvoiceForm.tsx**: added `customerSelectOpen` state; Select now uses `open={customerSelectOpen}` and `onOpenChange={setCustomerSelectOpen}`; "+ Add Customer" button onClick calls `setCustomerSelectOpen(false)` then `setShowAddCustomer(true)`.
- **Save success toasts** — Removed redundant doc type prefix from messages so they read "{number} was saved/updated/created successfully". **app/quotations/QuoteForm.tsx**: `Quote ${quote.number} saved successfully` → `${quote.number} was saved successfully`. **app/invoices/InvoiceForm.tsx**: same pattern for invoice. **app/purchase-orders/PurchaseOrderForm.tsx**: "Purchase order updated/created successfully" → `${poToSave.number} was updated/created successfully`.
- **Quote export filenames** — Filenames were "quote-Quote-003.pdf" (duplicate prefix). Strip leading "Quote-" from quote.number when building filenames so result is "quote-003.pdf". **app/quotations/QuoteForm.tsx**: PDF, Excel, DOCX download handlers use `numPart = (quote.number || '').replace(/^Quote-?/i, '') || quote.number || 'quote'` then `quote-${numPart}.pdf` (and .xlsx, .docx). **app/quotations/page.tsx**: same logic in handleDownloadPDF, handleDownloadExcel, handleDownloadDocx. **e2e/extended/downloads.spec.ts**: filename assertion updated to match `/quote-.+\.pdf$/i`.

### 2025-03-10 — Invoice PO# field and PDF

**Plan:** Invoice PO# field (multi-select + free text) and PDF – impact and plan

**What was done:**
- **src/db/schema.ts** — Removed `purchaseOrderId` from invoices table; added `poNumbers: text('poNumbers')`.
- **lib/database.ts** — Invoices CREATE TABLE: removed purchaseOrderId and FK; added poNumbers. Migration: add poNumbers if missing; drop purchaseOrderId if supported (SQLite 3.35+).
- **lib/types.ts** — Invoice interface: removed purchaseOrderId and purchaseOrderNumber; added poNumbers?: string.
- **lib/pdf.ts** — PdfInvoice type: added poNumbers; in buildInvoiceHtml added "PO #:" line in Invoice Meta when poNumbers present.
- **api/adapters/sqlite.ts** — Invoice getAll/getById: return poNumbers, no purchaseOrderId. create/update: INSERT/UPDATE use poNumbers; removed purchaseOrderId and PO-exists validation.
- **actions/invoices.ts** — createInvoice/updateInvoice: payload and insert/update use poNumbers; removed purchaseOrderId and PO-exists validation.
- **api/routes/purchase-orders.ts** — Removed invoice reference check by purchaseOrderId (invoices no longer reference a single PO by ID).
- **lib/validation.ts** — Removed invoice purchaseOrderId / linked-PO validation block.
- **app/invoices/InvoiceForm.tsx** — Fetches POs and vendors; replaced "PO Reference" with PO# field: text input (invoice.poNumbers) + "Add from existing" dropdown (PO number – vendor name); append selected PO number to comma-separated value; save sends poNumbers.
- **app/invoices/page.tsx** — Detail panel shows PO # when selectedInvoice.poNumbers is present.

### 2025-03-10 — PDF customer styling and full details

**Plan:** PDF customer styling and full details – impact and plan

**What was done:**
- **lib/pdf.ts** — Added `trn` to `PdfCustomer`; changed `renderInvoiceToPdf` to accept `customer: PdfCustomer | null` instead of `customerName: string`; `buildInvoiceHtml` now takes customer object and renders full block (company name 18px bold, contact person 12px, address/email/phone/TRN 12px) with fallback "Unknown Customer" when null; quote PDF customer block styled (company name 18px bold, contact person "Contact:" 12px, rest 12px); purchase order PDF vendor name styled (18px bold).
- **app/invoices/page.tsx** — Build `pdfCustomer` object from customer (name, company, address, email, phone, trn) or null; pass to `renderInvoiceToPdf`.
- **app/invoices/InvoiceForm.tsx** — Same: build and pass full customer object (or null) to `renderInvoiceToPdf`.
- **lib/__tests__/renderers.test.ts** — Updated `buildInvoiceHtml` call to pass customer object `{ name: 'Client A' }` instead of string.

### 2025-03-10 — Customer TRN field

**Plan:** Add Customer TRN (Tax Registration Number) – impact and plan

**What was done:**
- **src/db/schema.ts** — Added `trn: text('trn')` to customers table.
- **lib/database.ts** — Added `trn TEXT` to CREATE TABLE customers; added migration to ALTER TABLE customers ADD COLUMN trn TEXT if missing.
- **lib/types.ts** — Added `trn?: string` to Customer interface.
- **lib/validation/customers.ts** — Added `trn: z.string().optional().nullable()` to customerSchema.
- **api/adapters/sqlite.ts** — getAll/getById return `trn`; create INSERT and update SET include `trn`; fallback customer object includes `trn: ''`.
- **actions/customers.ts** — createCustomer and updateCustomer accept and pass `trn`.
- **app/customers/page.tsx** — State `newTrn`, table column TRN, Add/Edit modal TRN input, handleEdit/handleSave/reset.
- **app/invoices/InvoiceForm.tsx** — Add Customer modal: state `newCustomerTrn`, TRN input, create payload and reset.
- **app/quotations/QuoteForm.tsx** — Same Add Customer modal TRN support.
- **app/invoices/page.tsx** — getCustomerDetails returns `trn`; detail panel shows TRN when present.
- **app/quotations/page.tsx** — Customer tooltip and detail panel show TRN when present.
- **lib/pdf.ts**, **lib/docx.ts**, **lib/excel.ts** — Quote exports output TRN in customer block when present.

### 2025-03-10 — Customer field rename impact

**Plan:** Customer field rename – complete impact

**What was done:**
- **docs/WORK_LOG.md** — Created; single place to record work done in the repo (date, plan/task, changes). Newest entries at top.
- **app/customers/page.tsx** — Added "Contact Person" table header (between Company Name and Email); set Add/Edit modal placeholders to "Company Name" and "Contact Person" (labels were already updated).
- **app/invoices/InvoiceForm.tsx** — Add Customer modal: label and placeholder "Name" → "Company Name", "Company" → "Contact Person".
- **app/quotations/QuoteForm.tsx** — Add Customer modal: same label and placeholder renames (Company Name, Contact Person).
- **e2e/core/customers.spec.ts** — Updated selectors: `getByPlaceholder('Name')` → `getByPlaceholder('Company Name')`, `getByPlaceholder('Company')` → `getByPlaceholder('Contact Person')`.

API/DB and types unchanged (`name` / `company`); only UI labels and placeholders updated.

