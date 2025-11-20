# PRD: MVP — Generate PDF Quote

## Summary
Build an MVP feature that allows users to create, preview and export professional PDF quotes from the app. The primary goal is to let a user assemble quote line items and customer details and then produce a downloadable PDF that can be shared with customers.

## Goals
- Allow creation of a quote with customer info, line items, taxes, discounts and totals.
- Provide a live preview of the final quote.
- Generate a high-fidelity PDF (client-side for MVP) and allow download.
- Save generated quotes to the local database (and display them in a list) so users can revisit and regenerate PDFs.

## Success metrics
- User can create and download a quote PDF in under 60 seconds from starting a new quote.
- No critical visual truncation in the generated PDF for single-page quotes.
- 80% of manual QA checks pass on first run (layout, totals, line items, customer data).

## Scope (MVP)
Included:
- Quote creation form (customer, items, pricing, currency, tax).
- Quote preview and PDF download.
- Quotes list and quote detail view (view, regenerate PDF, delete).
- Basic settings: company name/logo, default tax rate, currency.

Excluded (out of scope for MVP):
- Multi-language templates and advanced templates.
- Email sending of quotes (optional next step).
- Integrated payment/checkout.
- Server-side PDF generation and queued rendering.

## Approach and technical decisions
MVP PDF generation: **Client-side using html2canvas + jspdf** for speed and simplicity. No server required.
- Render quote HTML preview to canvas using html2canvas.
- Convert canvas to PDF using jspdf.
- Embed admin company details (logo, seal, signature, address, VAT) into the quote PDF header/footer.

### Libraries and project fit
- `html2canvas` — already in package.json (for MVP client-side rendering).
- `jspdf` — already in package.json (for PDF generation).
- `localForage` (or native localStorage/IndexedDB) — will add for quote persistence.

### PDFRenderer abstraction
Create an abstraction layer `services/PDFRenderer.ts`:
```typescript
interface PDFRenderer {
  renderPreviewToCanvas(htmlElement: HTMLElement): Promise<Canvas>;
  generatePdfFromCanvas(canvas: Canvas, adminSettings: AdminSettings): Promise<Blob>;
  downloadPdf(blob: Blob, filename: string): void;
}
```

This allows future swap to server-side (Puppeteer, etc.) without UI changes.

## User flows
- Create Quote: User clicks `New Quote` -> fills customer -> adds items -> clicks "Preview" -> sees live preview -> clicks "Download PDF".
- Save Quote: On save, the quote is stored (local DB or server API) and appears in `Quotes List`.
- Regenerate PDF: From Quote Detail, user can re-open preview and regenerate/download the PDF.

## Decisions (from requirements)
1. **Branding**: Admin Settings screen will store company details (name, address, VAT number, logo image, seal image, signature image). These will be embedded in quote PDF header/footer on generation.
2. **Storage**: Local browser storage only (IndexedDB / localStorage).
3. **Templates**: Single template.
4. **Pagination**: Single-page quotes only (no multi-page support needed).
5. **Numbering**: Pattern based on company name "ALMSAR ALZAKI TRANSPORT AND MAINTENANCE" — suggested pattern: `AAT-YYYYMMDD-NNNN` (e.g., `AAT-20251118-0001`).
6. **Currency & taxes**: Single currency (AED). Tax % entered per line item by user; amount computed from line total × tax %.
7. **Line item features**: Vehicle type selector (from Vehicle master data dropdown). User enters tax % per line. Discount handling: TBD (if needed, add per-line discount % field).
8. **Emailing**: Not in MVP.
9. **Signatures**: Not in MVP.
10. **Authentication & users**: No auth; quotes are company-wide (shared).

## Non-functional requirements
- PDF generation to complete within ~10s for single page on typical desktop browsers.
- The generated PDF file size should be under 5MB for normal quotes (no high-resolution images).
- Data validation for numeric fields (price, qty) and totals must be enforced.

## Risks and mitigation
- HTML->Canvas fidelity: Use conservative layout and web-safe fonts to avoid rendering issues; provide a "Download as image" fallback.
- Large quote length: Warn users before generating very large PDF and suggest server-side rendering.
- Browser differences: Test across Chrome, Edge and Firefox; document any limitations.

## Next steps (implementation phases)
1. Create UI screens and wireframes (master screens in `PRD_Screens.md`).
2. Implement Quote model and local storage (or backend API if chosen).
3. Implement preview UI and client-side PDF renderer (html2canvas + jspdf) with an abstraction layer.
4. QA and iterate on template fidelity; optional: add server-side rendering for multi-page support.

---
Please answer the open questions above and I will update the PRD and create the implementation task list and estimates.