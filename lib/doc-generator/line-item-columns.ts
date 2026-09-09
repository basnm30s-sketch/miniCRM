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

export type LineItemColumnModule = 'quote' | 'invoice' | 'purchaseOrder'

export const DEFAULT_COLUMNS_BY_MODULE: Record<LineItemColumnModule, VisibleColumns> = {
  quote: DEFAULT_QUOTE_COLUMNS,
  invoice: DEFAULT_INVOICE_COLUMNS,
  purchaseOrder: DEFAULT_PO_COLUMNS,
}

export const LINE_ITEM_COLUMN_MODULE_LABELS: Record<LineItemColumnModule, string> = {
  quote: 'Quotations',
  invoice: 'Invoices',
  purchaseOrder: 'Purchase Orders',
}

const BASE_COLUMN_OPTIONS: { key: string; label: string }[] = [
  { key: 'serialNumber', label: 'Sl. no.' },
  { key: 'vehicleNumber', label: 'Vehicle number' },
  { key: 'vehicleType', label: 'Vehicle Type' },
  { key: 'makeModel', label: 'Make/Model' },
  { key: 'year', label: 'Year' },
  { key: 'basePrice', label: 'Base Price' },
  { key: 'description', label: 'Description' },
  { key: 'rentalBasis', label: 'Rental basis' },
  { key: 'quantity', label: 'Qty' },
  { key: 'rate', label: 'Rate' },
  { key: 'grossAmount', label: 'Gross amount' },
  { key: 'tax', label: 'Tax %' },
  { key: 'netAmount', label: 'Net amount' },
]

export const LINE_ITEM_COLUMN_OPTIONS: Record<LineItemColumnModule, { key: string; label: string }[]> = {
  quote: BASE_COLUMN_OPTIONS,
  purchaseOrder: BASE_COLUMN_OPTIONS,
  invoice: [...BASE_COLUMN_OPTIONS, { key: 'amountReceived', label: 'Amount Received' }],
}

export type LineItemColumnTemplates = Partial<Record<LineItemColumnModule, VisibleColumns>>

/**
 * Parse the `lineItemColumnTemplates` admin setting, which is stored as a JSON
 * string in SQLite. Unknown modules and non-boolean values are dropped so a
 * corrupted or hand-edited row can never render an unusable line-items table.
 */
export function parseLineItemColumnTemplates(raw: unknown): LineItemColumnTemplates {
  if (!raw) return {}
  let source: unknown = raw
  if (typeof raw === 'string') {
    try {
      source = JSON.parse(raw)
    } catch {
      return {}
    }
  }
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {}

  const templates: LineItemColumnTemplates = {}
  for (const module of Object.keys(DEFAULT_COLUMNS_BY_MODULE) as LineItemColumnModule[]) {
    const stored = (source as Record<string, unknown>)[module]
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) continue
    const allowedKeys = new Set(LINE_ITEM_COLUMN_OPTIONS[module].map((col) => col.key))
    const columns: VisibleColumns = {}
    for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
      if (typeof value === 'boolean' && allowedKeys.has(key)) columns[key] = value
    }
    if (Object.keys(columns).length > 0) templates[module] = columns
  }
  return templates
}

/**
 * The saved template for a module, merged over that module's defaults so a
 * partial template (older save, newly added column) still resolves every key.
 */
export function resolveVisibleColumns(
  module: LineItemColumnModule,
  settings: { lineItemColumnTemplates?: unknown } | null | undefined
): VisibleColumns {
  const defaults = DEFAULT_COLUMNS_BY_MODULE[module]
  const stored = parseLineItemColumnTemplates(settings?.lineItemColumnTemplates)[module]
  return { ...defaults, ...(stored || {}) }
}

/**
 * Merge one module's template into the stored JSON, leaving the other modules'
 * templates untouched.
 */
export function serializeLineItemColumnTemplates(
  existingRaw: unknown,
  module: LineItemColumnModule,
  columns: VisibleColumns
): string {
  const templates = parseLineItemColumnTemplates(existingRaw)
  const allowedKeys = LINE_ITEM_COLUMN_OPTIONS[module].map((col) => col.key)
  const normalized: VisibleColumns = {}
  for (const key of allowedKeys) normalized[key] = columns[key] !== false
  return JSON.stringify({ ...templates, [module]: normalized })
}

/**
 * At least one column must stay visible — an empty template would render an
 * empty table in every record of the module and in its PDF/Excel exports.
 */
export function hasVisibleColumn(module: LineItemColumnModule, columns: VisibleColumns): boolean {
  return LINE_ITEM_COLUMN_OPTIONS[module].some((col) => columns[col.key] !== false)
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
