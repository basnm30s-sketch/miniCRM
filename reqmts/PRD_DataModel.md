# PRD: Data Model & API Notes — PDF Quote MVP

## Core data model: AdminSettings
Schema (example JSON):

```json
{
  "id": "settings_1",
  "companyName": "ALMSAR ALZAKI TRANSPORT AND MAINTENANCE",
  "address": "string",
  "vatNumber": "string",
  "logoUrl": "data:image/png;base64,...",      // base64 embedded
  "sealUrl": "data:image/png;base64,...",      // base64 embedded
  "signatureUrl": "data:image/png;base64,...", // base64 embedded
  "quoteNumberPattern": "AAT-YYYYMMDD-NNNN",
  "currency": "AED"
}
```

## Core data model: Quote
Schema (example JSON):

```json
{
  "id": "string",              
  "number": "string",         // e.g., "AAT-20251118-0001"
  "date": "YYYY-MM-DD",
  "currency": "AED",           // fixed
  "customer": {
    "id": "string",
    "name": "string",
    "company": "string",
    "email": "string",
    "phone": "string",
    "address": "string"
  },
  "items": [
    {
      "id": "string",
      "vehicleTypeId": "string",           // reference to vehicle master
      "vehicleTypeLabel": "string",        // display name
      "quantity": 1,
      "unitPrice": 0.0,                    // AED
      "taxPercent": 0.0,                   // 0-100
      "lineTaxAmount": 0.0,                // auto-computed: (unitPrice * quantity) * (taxPercent / 100)
      "lineTotal": 0.0                     // auto-computed: (unitPrice * quantity) + lineTaxAmount
    }
  ],
  "subTotal": 0.0,             // sum of (unitPrice * quantity) for all items
  "totalTax": 0.0,             // sum of lineTaxAmount for all items
  "total": 0.0,                // subTotal + totalTax
  "notes": "string",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

## Core data model: Vehicle (master data)
Schema (example JSON):

```json
{
  "id": "string",
  "type": "string",            // e.g., "Pickup Truck", "Sedan", "Lorry"
  "description": "string",
  "basePrice": 0.0             // optional; can be empty, user enters in quote
}
```

## Core data model: Customer
Schema (example JSON):

```json
{
  "id": "string",
  "name": "string",
  "company": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "createdAt": "ISO8601"
}
```

## Storage: Local IndexedDB (browser only)
Use `localForage` library to persist:
- AdminSettings (company profile, logo, seal, signature).
- Quotes list (all quotes).
- Customers list (customer master data).
- Vehicles list (vehicle type master data).

All data is stored locally in the browser; syncing to backend is out of scope for MVP.

## PDF generation abstraction
Create `lib/pdf/PDFRenderer.ts` with interface:

```typescript
interface PDFRenderer {
  renderQuoteToPdf(quote: Quote, adminSettings: AdminSettings): Promise<Blob>;
  downloadPdf(blob: Blob, filename: string): void;
}

export class ClientSidePDFRenderer implements PDFRenderer {
  async renderQuoteToPdf(quote: Quote, adminSettings: AdminSettings): Promise<Blob> {
    // 1. Render quote HTML to canvas using html2canvas
    // 2. Embed admin details (logo, seal, signature) into header/footer
    // 3. Convert canvas to PDF using jspdf
    // 4. Return PDF blob
  }

  downloadPdf(blob: Blob, filename: string): void {
    // Use blob URL and <a> tag to trigger download
  }
}
```

This allows swapping to server-side (Puppeteer) later without UI changes.

## Integration points
- AdminSettings loaded at app startup; cached in app context/store.
- Quote Editor reads vehicles from Vehicles master; reads customer from Customers master.
- Quote Preview composes HTML from Quote + AdminSettings; passes to PDFRenderer for PDF generation.

## Data validation rules
- Quantity must be integer >= 1.
- Unit price must be >= 0.00.
- Discount percent between 0 and 100.
- Date must be valid and expiryDate must be >= date.

---
If you'd like, I can: (a) wire these schemas into TypeScript interfaces in the codebase, (b) add localForage and implement persistence, or (c) scaffold the Quote editor UI.
