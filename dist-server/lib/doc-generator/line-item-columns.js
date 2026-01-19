"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_INVOICE_COLUMNS = exports.DEFAULT_PO_COLUMNS = exports.DEFAULT_QUOTE_COLUMNS = void 0;
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
