# Three Modules Structure Synchronization

## Overview
The three document creation modules (Quotations, Purchase Orders, Invoices) have been synchronized to follow a consistent structure and styling pattern.

## Common Layout Structure

All three modules now follow this hierarchy:

### Top Section (Full Width)
- Back button + Module heading + Subtitle

### Main Content Grid (3-column layout)
- **Left Section (col-span-2)**: Main form content with multiple cards
- **Right Section (1 col)**: Sticky summary sidebar

## Detailed Section Breakdown

### QUOTATIONS Module (`/app/quotes/create/page.tsx`)
**Current Layout**: Single column (space-y-6 p-6)

**Sections** (in order):
1. Header (Title + Subtitle)
2. Quote Details Card
   - Quote Number (disabled)
   - Date field
   - Valid Until date field
   - Currency (disabled)
3. Customer Selection Card
   - Select Customer dropdown
   - Add Customer button (inline)
   - Customer Summary Display
4. Add Customer Modal (overlay)
5. Line Items Card
   - Table with columns: Vehicle Type | Qty | Unit Price | Tax % | Line Tax | Total | Actions
   - Add Line Item button
6. Summary Card
   - Subtotal
   - Total Tax
   - Grand Total
7. Additional Notes Card
   - Textarea for notes
8. Terms & Conditions Card
   - Rich text editor
9. Action Buttons
   - Cancel | Save Quote | Download PDF

**Type Fields** (from Quote interface):
- id, number, date, validUntil, currency, customer, items, subTotal, totalTax, total, terms, notes, createdAt, updatedAt

---

### PURCHASE ORDERS Module (`/app/purchase-orders/create/page.tsx`)
**Current Layout**: Grid layout (grid grid-cols-3 gap-8)

**Sections** (in order):
1. Header (Title + Subtitle)
2. Main Content (col-span-2):
   - PO Details Card
     - PO Number (disabled)
     - Status select
     - Date field
     - Vendor select (required)
     - Amount field (disabled, auto-calculated)
   - Line Items Card
     - Table with columns: Description | Qty | Unit Price | Tax | Total | Actions
     - Add Line Item button
   - **NEW: Additional Notes Card**
     - Textarea for notes
3. Summary Sidebar (sticky):
   - Subtotal
   - Tax
   - Total Amount
   - Status
   - Vendor Name
   - Download PDF button
   - Create/Update PO button
   - Cancel button

**Type Fields** (from PurchaseOrder interface):
- id, number, date, vendorId, vendor, items, subtotal, tax, amount, currency, status, **notes**, createdAt

**Enhancement**: Added `notes` field to PurchaseOrder type to match Quote functionality

---

### INVOICES Module (`/app/invoices/create/page.tsx`)
**Current Layout**: Grid layout (grid grid-cols-3 gap-8)

**Sections** (in order):
1. Header (Title + Subtitle)
2. Main Content (col-span-2):
   - Invoice Details Card
     - Invoice Number (disabled)
     - Status select
     - Date field
     - Due Date field
     - Customer select (required)
     - Link to Quote/PO (optional)
   - Line Items Card
     - Table with columns: Description | Qty | Unit Price | Total | Actions
     - Add Item button
   - Additional Notes Card
     - Textarea for notes
3. Summary Sidebar (sticky):
   - Subtotal
   - Tax field (editable)
   - Total Amount
   - Create/Update button
   - Cancel button

**Type Fields** (from Invoice interface):
- id, number, date, dueDate, customerId, vendorId, purchaseOrderId, quoteId, items, subtotal, tax, total, status, notes, createdAt

---

## Consistency Achieved

### ✅ Layout Pattern
- All three use responsive grid layout
- Sidebar for summary/totals
- Consistent spacing (gap-8)
- Back button navigation

### ✅ Card Styling
- CardHeader with CardTitle
- CardContent with space-y-4
- Consistent border and shadow

### ✅ Input Styling
- Label components with slate colors (text-slate-700)
- Input/Select/Textarea with consistent classes
- Disabled fields with bg-slate-50 / bg-slate-100
- Required field indicators (*)

### ✅ Form Sections
- Details/Meta information section
- Line Items table with CRUD operations
- Additional Notes section (all three)
- Summary with key metrics
- Action buttons (Save, PDF, Cancel)

### ✅ Typography
- Headings: text-3xl font-bold text-slate-900
- Labels: text-slate-700
- Secondary text: text-slate-500 / text-slate-600
- Summary text: text-lg/text-2xl for important values

### ✅ Color Scheme
- Primary action buttons: bg-blue-600 hover:bg-blue-700
- PDF button: bg-green-600 hover:bg-green-700
- Delete/Remove buttons: text-red-600 hover:text-red-800
- Disabled states: bg-slate-50 / bg-slate-100
- Text: slate-900 for primary, slate-600 for secondary

---

## Line Items Table Structure

All three modules use a similar table-based approach for line items:

### Quote Items Table
```
Vehicle Type | Qty | Unit Price | Tax % | Line Tax | Total | Actions
```
- Columns: 7
- Vehicle selection via dropdown
- Tax as percentage
- Line calculations shown

### PO Items Table
```
Description | Qty | Unit Price | Tax | Total | Actions
```
- Columns: 6
- Free-text description
- Tax as absolute amount
- Line calculations shown

### Invoice Items Table
```
Description | Qty | Unit Price | Total | Actions
```
- Columns: 5
- Free-text description
- No separate tax column (included in calculations)
- Line calculations shown

---

## Responsive Behavior

- **Desktop**: Full 3-column grid (col-span-2 + sidebar)
- **Mobile**: Sidebar moves below main content or stacks

---

## Data Flow

All three follow the same pattern:

1. **Load Data**: Customer/Vendor/Admin Settings
2. **Initialize Form**: Generate number, set defaults
3. **Edit Detection**: Check URL params for ID
4. **CRUD Operations**: handleAddLineItem, handleRemoveLineItem, handleLineItemChange
5. **Calculate Totals**: Recalculate on any item/field change
6. **Validation**: Check required fields before save
7. **Persist**: Save to localStorage via storage functions
8. **PDF Generation**: Call pdfRenderer with appropriate template
9. **Navigation**: Redirect to list page after save

---

## Type Definitions Summary

### Common Interface Pattern
```typescript
interface Document {
  id: string;
  number: string;
  date: string; // YYYY-MM-DD
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status?: string;
  notes?: string;
  createdAt?: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax?: number;
  total: number;
}
```

---

## Recent Updates

### 1. Fixed Hydration Mismatch
- **Issue**: `new Date().toLocaleString()` in DataManagement component
- **Fix**: Moved to useEffect with state variable `syncTime`
- **File**: `components/data-management.tsx`

### 2. Fixed Date Rendering in Quotations
- **Issue**: `new Date(quote.date).toLocaleDateString()` in render (potential hydration mismatch)
- **Fix**: Display `quote.date` directly as YYYY-MM-DD string
- **File**: `app/quotations/page.tsx` line 140

### 3. Extended PurchaseOrder Type
- **Added**: `notes?: string` field
- **File**: `lib/types.ts`
- **Reason**: Feature parity with Quote and Invoice modules

### 4. Enhanced PO Create Page
- **Added**: Additional Notes section
- **File**: `app/purchase-orders/create/page.tsx`
- **Placement**: After Line Items, before Summary sidebar

---

## Build Status

✅ **Production Build**: Successful
- All 17 routes pre-rendering correctly
- No TypeScript errors
- No compilation warnings

---

## Testing Checklist

- [ ] Quote creation with all sections
- [ ] PO creation with all sections
- [ ] Invoice creation with all sections
- [ ] Line items add/remove/edit functionality
- [ ] PDF generation for each module
- [ ] Edit mode (load existing documents)
- [ ] Form validation
- [ ] Responsive layout on mobile
- [ ] Sidebar summary updates in real-time
- [ ] Date inputs work correctly
- [ ] Navigation (Back button, Cancel buttons)
