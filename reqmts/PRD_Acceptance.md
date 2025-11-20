# PRD: Acceptance Criteria & QA Checklist — PDF Quote MVP

## Acceptance criteria (high-level)
- A user can create and save a quote with at least one line item.
- The quote preview displays the quote as it will appear on the PDF.
- Clicking `Download PDF` downloads a PDF file with the rendered quote.
- Quote data persists and appears in the Quotes List after save.
- Basic validation errors are shown (e.g., negative price, non-numeric quantity).

## Detailed QA checklist
1. Quote Editor
   - [ ] Can select/add a customer and save customer details.
   - [ ] Can add, edit, and remove line items.
   - [ ] Subtotals, tax, discounts and totals calculate correctly for common scenarios (single tax, per-line discounts).

2. Preview & PDF
   - [ ] Preview shows company logo, header, customer details, line items and totals.
   - [ ] Downloaded PDF opens in Adobe Reader, Chrome PDF viewer and other common viewers.
   - [ ] Page margins are preserved; content is not clipped on single-page quotes.
   - [ ] When preview content overflows a page, the app shows a clear warning and advises server-side rendering.

3. Persistence
   - [ ] Saved quotes appear in Quotes List with correct metadata.
   - [ ] Edit and update flow preserves quote id and history where appropriate.

4. Edge cases
   - [ ] Very long descriptions are wrapped correctly and do not overlap other elements.
   - [ ] High quantity and prices calculate totals without floating-point rounding issues (display values to 2 decimal places by default).
   - [ ] Empty required fields display validation messages and prevent save or download.

5. Security & Privacy
   - [ ] Uploaded logos are validated for file type and size (limit 2MB recommended).
   - [ ] No sensitive data is embedded in the PDF unless explicitly part of the quote.

6. Performance
   - [ ] PDF generation for a single-page quote completes within acceptable time (<= 10s on desktop Chrome).

## Test cases (examples)
- TC1: Create quote with 2 items, 10% tax, no discounts; confirm totals and download PDF
- TC2: Create quote with per-line discount on one line; confirm subtotal and total
- TC3: Upload logo and confirm it appears in preview and PDF
- TC4: Create very long quote (20+ line items) — ensure warning shown and PDF file available (may be large)

---
If these acceptance criteria look good I will convert them into implementation tasks and map each to a developer test case.