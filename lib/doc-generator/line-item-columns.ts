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

