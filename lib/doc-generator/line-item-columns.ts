import type { CSSProperties } from 'react'

export type VisibleColumns = Record<string, boolean>

export const DEFAULT_QUOTE_COLUMNS: VisibleColumns = {
  serialNumber: true,
  vehicleNumber: true,
  vehicleType: false,
  makeModel: false,
  year: false,
  basePrice: false,
  description: true,
  rentalBasis: true,
  quantity: true,
  rate: true,
  grossAmount: true,
  tax: true,
  netAmount: true,
}

export const DEFAULT_PO_COLUMNS: VisibleColumns = {
  ...DEFAULT_QUOTE_COLUMNS,
}

export const DEFAULT_INVOICE_COLUMNS: VisibleColumns = {
  ...DEFAULT_QUOTE_COLUMNS,
  amountReceived: true,
}

// Inline widths (not Tailwind classes) for each line-item column, applied to
// <col> inside a table-fixed <colgroup> so <th>/<td> widths are bound to the
// column rather than to the widest cell content. Keeps headers aligned with
// inputs even when Vehicle/Basis selects show long strings.
//
// These must be inline styles, not Tailwind classes: this map is shared
// across InvoiceForm/QuoteForm/PurchaseOrderForm and referenced only via
// property access (LINE_ITEM_COLUMN_WIDTHS.description), so Tailwind's
// content scanner never sees the class names as literal strings in a
// scanned template and does not generate the CSS for them.
//
// Description gets a fixed pixel width like every other column, not a
// percentage or "auto" one. Both were tried and don't hold up under
// table-fixed: a <col> with no width at all is only granted whatever space
// is left over after every fixed-width column is satisfied, which can be
// exactly 0 once enough optional columns are enabled (or the viewport is
// narrow) — and a percentage width on <col> fares no better, since this
// engine's table-fixed layout doesn't reliably resolve % against the table's
// own width when it's mixed with px columns (it renders 0 in practice, same
// as "auto"). min-width on the <th>/<td> doesn't help either — it's not
// part of the table-fixed column-sizing algorithm at all. A fixed px width
// is the only value this algorithm honors reliably; the overflow-x-auto
// wrapper handles genuine overflow via horizontal scroll once the columns'
// combined width exceeds the container.
export const LINE_ITEM_COLUMN_WIDTHS: Record<string, CSSProperties> = {
  serialNumber: { width: 40 },
  vehicleNumber: { width: 128 },
  vehicleType: { width: 96 },
  makeModel: { width: 128 },
  year: { width: 64 },
  basePrice: { width: 96 },
  description: { width: 200 },
  rentalBasis: { width: 112 },
  quantity: { width: 64 },
  rate: { width: 80 },
  grossAmount: { width: 80 },
  tax: { width: 64 },
  netAmount: { width: 96 },
  amountReceived: { width: 96 },
}

export const LINE_ITEM_ACTION_WIDTH: CSSProperties = { width: 40 }
