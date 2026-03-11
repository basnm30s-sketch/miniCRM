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

### Invoice

| # | Step | Expected |
|---|------|----------|
| 1 | **Invoices → New Invoice → New empty invoice**. | Invoice form with line-items table. |
| 2 | Open **Customize Columns** (e.g. menu or column header). | Dialog/menu lists columns (e.g. #, Vehicle, Description, Qty, Unit Price, Total, …). |
| 3 | **Uncheck** one or two columns (e.g. Vehicle, Tax). Apply/close. | Table hides those columns. |
| 4 | **Add a line item**, save invoice. | Invoice saves. |
| 5 | Reopen the same invoice (or reload). | **Same columns** remain hidden (preference restored from storage). |
| 6 | **Download PDF** from list or from form. | **PDF line-items table** shows only the **visible** columns (same as UI). No extra columns that were unchecked. |

### Purchase Order

| # | Step | Expected |
|---|------|----------|
| 1 | **Purchase Orders → Create Purchase Order**. | PO form with line-items table. |
| 2 | Open **Customize Columns**. | List of PO line-item columns. |
| 3 | **Uncheck** one or two columns. Apply/close. | Table hides those columns. |
| 4 | Add line item, save PO. | PO saves. |
| 5 | Reopen same PO (or reload). | **Same columns** remain hidden. |
| 6 | **Download PDF** (and Excel/DOCX if you use them). | **PDF (and exports)** line-items match **visible** columns only. |

### Quote (sanity check)

| # | Step | Expected |
|---|------|----------|
| 1 | **Quotations → New Quotation**. | Quote form with line-items. |
| 2 | **Customize Columns** → hide some columns → add item → save. | Columns stay hidden; quote saves. |
| 3 | **Download PDF**. | PDF line-items match visible columns. (Existing behavior; confirm unchanged.) |

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
- **Columns not persisting:** Preferences are in `localStorage` (e.g. `invoice-visible-columns-*`, `po-visible-columns-*`). Clearing site data will reset them.

---

## Automation reference

- **Electron:** `npx playwright test e2e/electron/ --config=playwright.electron.config.ts --project=Electron`
- **Browser Core:** `npx playwright test e2e/core/smoke.spec.ts e2e/core/invoices.spec.ts e2e/core/quote-to-invoice.spec.ts --project=Core`
- **Browser Extended (downloads):** `npx playwright test e2e/extended/downloads.spec.ts --project=Extended`  
  *(Note: Quote PDF test is currently `fixme`; Excel test may skip if Export button is not visible.)*
