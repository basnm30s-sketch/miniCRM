# Manual Test Guide – Customize Columns & PO Number/Filename

Use this checklist to verify the **Customize Columns (Invoice & PO) + PDF column sync** and **PO number/filename** changes in the Electron (or browser) build. Run after automation has passed where applicable.

---

## Prerequisites

- **Electron:** Start the app (`npm run electron:dev` or built executable). Backend must be running (e.g. Express on port 3001).
- **Browser (optional):** `npm run dev` and open http://localhost:3000.
- Have at least one **Customer**, one **Vendor**, and one **Vehicle** (for quotes/invoices/POs).

---

## Part A – PO number and filename

| # | Step | Expected |
|---|------|----------|
| 1 | **Purchase Orders → Create Purchase Order** | Form opens. |
| 2 | Leave number field as-is (or note if you see a number). | PO number is **PO-001** (or next sequential, e.g. PO-002, PO-003). No random/long value like PO-2026-03171. |
| 3 | Select a vendor, add a line item, save. | PO saves with that PO-XXX number. |
| 4 | From **list**: select the PO → **Download PDF**. | Downloaded file is **po-001.pdf** (or po-002, etc.). Not `po-PO-2026-03171.pdf`. |
| 5 | From **PO detail/form**: **Download PDF**, **Download Excel**, **Download DOCX**. | Filenames are **po-001.pdf**, **po-001.xlsx**, **po-001.docx** (number part only, no duplicate "PO-" prefix). |

---

## Part B – Customize Columns (Invoice & PO)

Column choices are a **per-module template**, not a per-document setting: one saved list for
Quotations, one for Invoices, one for Purchase Orders. Changing it on any document changes it for
every document of that type. It is stored in the database (`admin_settings.lineItemColumnTemplates`),
so it survives a cache clear and is shared by every machine pointing at the same database.

### Invoice

| # | Step | Expected |
|---|------|----------|
| 1 | **Invoices → New Invoice → New empty invoice**. | Invoice form with line-items table. |
| 2 | Open **Customize Columns**. | Dialog lists columns and says it applies to every invoice. |
| 3 | **Uncheck** one or two columns (e.g. Vehicle, Tax). Click **Done**. | Table hides those columns. |
| 4 | **Add a line item**, save invoice. | Invoice saves. |
| 5 | Reopen the same invoice (or reload). | **Same columns** remain hidden. |
| 6 | Open a **different, existing** invoice, and start a **new** invoice. | Both show the **same** hidden columns — the template is module-wide. |
| 7 | **Download PDF** from list or from form. | **PDF line-items table** shows only the **visible** columns (same as UI). No extra columns that were unchecked. |

### Purchase Order

| # | Step | Expected |
|---|------|----------|
| 1 | **Purchase Orders → Create Purchase Order**. | PO form with line-items table. |
| 2 | Open **Customize Columns**. | List of PO line-item columns. |
| 3 | **Uncheck** one or two columns. Click **Done**. | Table hides those columns. |
| 4 | Add line item, save PO. | PO saves. |
| 5 | Reopen same PO (or reload). | **Same columns** remain hidden. |
| 6 | **Download PDF** (and Excel if you use it). | **PDF/Excel** line-items match **visible** columns only. (DOCX ignores the template — see Known gaps.) |

### Quote (sanity check)

| # | Step | Expected |
|---|------|----------|
| 1 | **Quotations → New Quotation**. | Quote form with line-items. |
| 2 | **Customize Columns** → hide some columns → add item → save. | Columns stay hidden; quote saves. |
| 3 | **Download PDF**. | PDF line-items match visible columns. |

### Part B2 – Module independence and safety rails

| # | Step | Expected |
|---|------|----------|
| 1 | Hide **different** columns in Quotations, Invoices and Purchase Orders. | Each module keeps its own list; changing one never changes another. |
| 2 | In any Customize Columns dialog, try to **uncheck every** column. | The last remaining column cannot be unchecked — a document can never have an empty line-items table. |
| 3 | Click **Reset to defaults** in the dialog, then **Done**. | That module returns to its default column set; other modules unchanged. |
| 4 | Open and close a document form several times **without** touching Customize Columns. | The saved template is **not** reset to defaults. |
| 5 | **Admin → Settings → Line Item Columns**. | Three column lists (Quotations / Invoices / Purchase Orders) reflecting the current templates, each with a **Reset** button. |
| 6 | Change a column there → **Save Settings** → open that module's form. | The form shows the newly saved columns. |

---

## Part C – PDF column sync (all three doc types)

| # | Step | Expected |
|---|------|----------|
| 1 | **Quote:** Customize Columns → show e.g. **#**, **Description**, **Qty**, **Unit Price**, **Total** only. Download PDF. | Quote PDF has only those columns in the line-items table. |
| 2 | **Invoice:** Customize Columns → show e.g. **Description**, **Qty**, **Unit Price**, **Total**. Download PDF. | Invoice PDF has only those columns. |
| 3 | **PO:** Customize Columns → show e.g. **Description**, **Qty**, **Unit Price**, **Total**. Download PDF. | PO PDF has only those columns. |
| 4 | Enable **extra** columns (e.g. Vehicle, Tax, Amount Received). Download PDF again. | PDF line-items table **gains** those columns; no crash, alignment looks correct. |

---

## Quick smoke (minimum manual checks)

If time is short, do at least:

1. **PO:** Create PO → confirm number is **PO-001** (or next) → Download PDF → file is **po-001.pdf**.
2. **Invoice:** Customize Columns → hide 1 column → Download PDF → PDF matches visible columns.
3. **PO:** Customize Columns → hide 1 column → Download PDF → PDF matches visible columns.

---

## If something fails

- **PO number not sequential:** Ensure you’re on the latest build; check that `getNextPurchaseOrderNumber()` is used when creating new POs.
- **Filename still wrong:** Check list and form download handlers use the normalized name (e.g. `po-${numPart}.pdf` where `numPart` is the numeric part only).
- **PDF columns ignore Customize Columns:** Check that `visibleColumns` is passed from the form and list into the PDF renderer for Invoice, Quote, and PO.
- **Columns not persisting:** The template lives in `admin_settings.lineItemColumnTemplates` as JSON keyed by `quote` / `invoice` / `purchaseOrder`. Check that the API returns the field (`GET /api/admin/settings`) and that the column exists on the table — it is added by the startup migration in `lib/database.ts`.

## Known gaps

- **DOCX exports ignore the column template.** `renderQuoteToDocx` / `renderInvoiceToDocx` / `renderPurchaseOrderToDocx` take no `visibleColumns` argument, so DOCX always contains the full column set. PDF and Excel both honour the template.

---

## Automation reference

- **Electron:** `npx playwright test e2e/electron/ --config=playwright.electron.config.ts --project=Electron`
- **Browser Core:** `npx playwright test e2e/core/smoke.spec.ts e2e/core/invoices.spec.ts e2e/core/quote-to-invoice.spec.ts --project=Core`
- **Browser Extended (downloads):** `npx playwright test e2e/extended/downloads.spec.ts --project=Extended`  
  *(Note: Quote PDF test is currently `fixme`; Excel test may skip if Export button is not visible.)*
