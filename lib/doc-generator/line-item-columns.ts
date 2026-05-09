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

// Tailwind width classes for each line-item column. Used inside <colgroup>
// together with table-fixed so that <th> and <td> widths are bound to the
// column rather than to the widest cell content. Keeps headers aligned with
// inputs even when Vehicle/Basis selects show long strings.
//
// Description is intentionally undefined: with table-fixed + w-full, the
// column without an explicit width absorbs all leftover horizontal space.
export const LINE_ITEM_COLUMN_WIDTHS: Record<string, string | undefined> = {
  serialNumber: 'w-10',
  vehicleNumber: 'w-32',
  vehicleType: 'w-24',
  makeModel: 'w-32',
  year: 'w-16',
  basePrice: 'w-24',
  description: undefined,
  rentalBasis: 'w-28',
  quantity: 'w-16',
  rate: 'w-20',
  grossAmount: 'w-20',
  tax: 'w-16',
  netAmount: 'w-24',
  amountReceived: 'w-24',
}

export const LINE_ITEM_ACTION_WIDTH = 'w-10'

