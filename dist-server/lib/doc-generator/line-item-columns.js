"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LINE_ITEM_ACTION_WIDTH = exports.LINE_ITEM_COLUMN_WIDTHS = exports.DEFAULT_INVOICE_COLUMNS = exports.DEFAULT_PO_COLUMNS = exports.DEFAULT_QUOTE_COLUMNS = void 0;
exports.DEFAULT_QUOTE_COLUMNS = {
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
};
exports.DEFAULT_PO_COLUMNS = {
    ...exports.DEFAULT_QUOTE_COLUMNS,
};
exports.DEFAULT_INVOICE_COLUMNS = {
    ...exports.DEFAULT_QUOTE_COLUMNS,
    amountReceived: true,
};
// Tailwind width classes for each line-item column. Used inside <colgroup>
// together with table-fixed so that <th> and <td> widths are bound to the
// column rather than to the widest cell content. Keeps headers aligned with
// inputs even when Vehicle/Basis selects show long strings.
//
// Description is intentionally undefined: with table-fixed + w-full, the
// column without an explicit width absorbs all leftover horizontal space.
exports.LINE_ITEM_COLUMN_WIDTHS = {
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
};
exports.LINE_ITEM_ACTION_WIDTH = 'w-10';
