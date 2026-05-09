export const DOC_GENERATOR_LABELS = {
  quotations: {
    listTitle: 'All Quotations',
    newCta: 'New Quotation',
    emptyTitle: 'No quotation selected',
    emptyDescription: 'Select a quotation from the list to view details or create a new one.',
    emptyCta: 'Create New Quotation',
  },
  invoices: {
    listTitle: 'All Invoices',
    newCta: 'New Invoice',
    emptyTitle: 'No invoice selected',
    emptyDescription: 'Select an invoice from the list to view details or create a new one.',
    emptyCta: 'Create New Invoice',
  },
  purchaseOrders: {
    listTitle: 'All Purchase Orders',
    newCta: 'New Purchase Order',
    emptyTitle: 'No purchase order selected',
    emptyDescription: 'Select a purchase order from the list to view details or create a new one.',
    emptyCta: 'Create New Purchase Order',
  },
} as const

export function toTitleCaseLabel(input?: string, fallback = 'Draft') {
  if (!input || !String(input).trim()) return fallback
  return String(input)
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ')
}
