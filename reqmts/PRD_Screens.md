# PRD: Master Screens — PDF Quote MVP

This document lists the master screens and the essential UI components for the PDF quote MVP.

## Global layout
- Top navigation / App header (app name, user menu, create-new button)
- Left navigation (Dashboard, Quotes, Customers, Products, Settings)
- Main content area (responsive)

## Screen list (MVP)
1. **Admin Settings** (NEW — high priority):
   - Company profile form: company name, address, VAT number.
   - Uploads: logo image, seal image, signature image.
   - Save and confirmation.

2. Dashboard (minimal):
   - Quick actions: New Quote, Recent Quotes, Metrics (quotes this month).

3. **Quotes List**:
   - Table of quotes with columns: Quote #, Customer, Date, Vehicle Type, Total (AED), Actions.
   - Actions: View, Edit, Delete, Download PDF.
   - Filters: date range, customer.

4. **Quote Editor** (Create / Edit) — PRIORITY:
   - Customer selector / quick add customer.
   - Quote meta: Quote number (auto, pattern AAT-YYYYMMDD-NNNN), date, currency (AED, fixed).
   - Line items area:
     - Vehicle type: dropdown (loaded from Vehicle master).
     - Quantity: integer.
     - Unit price: numeric (AED).
     - Tax %: numeric (0-100), per line.
     - Line total: auto-calculated.
     - Subtotal, tax amount per line, quote total: auto-calculated.
   - Buttons: Save Draft, Preview & Download PDF.

5. Quote Preview (live):
   - Visual preview of how the quote will render on PDF.
   - Shows company header (logo, name, address, VAT, seal, signature if uploaded).
   - Shows customer details, line items, totals, footer.
   - Button: Download PDF, Back to Edit.

6. Quote Detail:
   - Read-only view of a saved quote with all details.
   - Actions: Regenerate/Download PDF, Edit, Delete.

7. Customers (master data):
   - List of customers with create/edit.
   - Fields: name, company, email, phone, address.

8. Vehicles / Products (master data):
   - List of vehicle types (for dropdown in Quote Editor).
   - Fields: vehicle type, description, base price (optional).

9. Settings (consolidated):
   - Tab 1: Company profile (logo, seal, signature, address, VAT, name).
   - Tab 2: Quote defaults (quote numbering pattern, currency — AED fixed).
   - Tab 3: Vehicles / product catalog.

## Wireframe notes / layout considerations
- Use a single-column printable-width design for the preview to make PDF generation easier.
- Avoid complex CSS that doesn't translate well to canvas rendering (avoid CSS transforms, complex grid overlays).
- Keep fonts web-safe or embed a provided brand font; otherwise use system fallbacks.
- Provide margins and page-break markers in preview; show warning if content exceeds one page.

## Keyboard & accessibility
- Keyboard shortcuts: `N` => New Quote, `Ctrl/Cmd+S` => Save draft, `P` => Preview.
- All interactive elements must have accessible labels for screen readers.

## Acceptance pointers
- Preview must match the generated PDF closely (visual layout within acceptable tolerance).
- Downloaded PDF should open and render in common PDF viewers.

---
Next: review these screens and tell me which one(s) to prioritize first for implementation and any fields that are mandatory for your business process.