import { validateQuoteForExport, validateInvoiceForExport, isPositiveNumber, isNonEmptyString, isValidDate, validateQuote, validateInvoice } from '../validation';
import { Quote } from '../types';
import { Invoice } from '../storage';
import * as storage from '../storage';

jest.mock('../storage', () => ({
    getAllQuotes: jest.fn(),
    getAllInvoices: jest.fn(),
    getAllCustomers: jest.fn(),
    getQuoteById: jest.fn(),
    getPurchaseOrderById: jest.fn(),
    getAllVehicles: jest.fn()
}));

const mockedStorage = storage as jest.Mocked<typeof storage>;

describe('Validation Utilities', () => {
    describe('Basic Helpers', () => {
        test('isPositiveNumber returns true for positive numbers', () => {
            expect(isPositiveNumber(10)).toBe(true);
            expect(isPositiveNumber(0.1)).toBe(true);
        });

        test('isPositiveNumber returns false for non-positive numbers', () => {
            expect(isPositiveNumber(0)).toBe(false);
            expect(isPositiveNumber(-5)).toBe(false);
            expect(isPositiveNumber(NaN)).toBe(false);
        });

        test('isNonEmptyString returns true for valid strings', () => {
            expect(isNonEmptyString('hello')).toBe(true);
        });

        test('isNonEmptyString returns false for empty or whitespace strings', () => {
            expect(isNonEmptyString('')).toBe(false);
            expect(isNonEmptyString('   ')).toBe(false);
        });

        test('isValidDate returns true for valid dates', () => {
            expect(isValidDate('2023-01-01')).toBe(true);
        });

        test('isValidDate returns false for invalid dates', () => {
            expect(isValidDate('invalid-date')).toBe(false);
            expect(isValidDate('')).toBe(false);
        });
    });

    describe('validateQuoteForExport', () => {
        const validQuote: Quote = {
            id: 'q1',
            number: 'Q-001',
            date: '2023-10-01',
            validUntil: '2023-11-01',
            currency: 'USD',
            customer: { id: 'c1', name: 'John Doe', email: 'john@example.com' },
            items: [
                { id: 'i1', vehicleTypeId: 'v1', vehicleTypeLabel: 'Car', quantity: 1, unitPrice: 100, taxPercent: 10, lineTotal: 110 }
            ],
            total: 110,
            subTotal: 100,
            totalTax: 10,
            createdAt: '',
            updatedAt: ''
        };

        test('should return valid for a correct quote', () => {
            const result = validateQuoteForExport(validQuote);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should fail if quote number is missing', () => {
            const result = validateQuoteForExport({ ...validQuote, number: '' });
            expect(result.isValid).toBe(false);
            expect(result.errors[0].field).toBe('number');
        });

        test('should fail if line items are empty', () => {
            const result = validateQuoteForExport({ ...validQuote, items: [] });
            expect(result.isValid).toBe(false);
            expect(result.errors[0].field).toBe('items');
        });

        test('should fail if total is not positive', () => {
            const result = validateQuoteForExport({ ...validQuote, total: 0 });
            expect(result.isValid).toBe(false);
            expect(result.errors.find(e => e.field === 'total')).toBeDefined();
        });
    });

    describe('validateQuote (Async)', () => {
        const validQuote: Quote = {
            id: 'q1',
            number: 'Q-001',
            date: '2023-10-01',
            validUntil: '2023-11-01',
            currency: 'USD',
            customer: { id: 'c1', name: 'John Doe' },
            items: [{ id: 'i1', vehicleTypeId: 'v1', vehicleTypeLabel: 'Car', quantity: 1, unitPrice: 100, taxPercent: 10, lineTotal: 110 }],
            total: 110,
            subTotal: 100,
            totalTax: 10
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should pass validation for a valid quote', async () => {
            mockedStorage.getAllQuotes.mockResolvedValue([]);
            const result = await validateQuote(validQuote);
            expect(result.isValid).toBe(true);
        });

        test('should fail if quote number is not unique', async () => {
            mockedStorage.getAllQuotes.mockResolvedValue([
                { ...validQuote, id: 'q2' } // Another quote with same number
            ]);

            const result = await validateQuote(validQuote, { checkUniqueness: true });
            expect(result.isValid).toBe(false);
            expect(result.errors[0].message).toContain('unique');
        });

        test('should check if customer exists', async () => {
            // Mock customer list that does NOT contain 'c1'
            mockedStorage.getAllCustomers.mockResolvedValue([
                { id: 'c2', name: 'Other', company: '', email: '', phone: '', address: '' } // Different ID
            ]);

            const result = await validateQuote(validQuote, { checkCustomerExists: true });
            expect(result.isValid).toBe(false);
            expect(result.errors[0].message).toContain('customer');
        });
    });

    describe('validateInvoice (Async)', () => {
        const validInvoice: Invoice = {
            id: 'inv1',
            number: 'INV-001',
            date: '2023-10-01',
            dueDate: '2023-11-01',
            customerId: 'c1',
            items: [{ id: 'i1', description: 'Item 1', quantity: 1, unitPrice: 100, tax: 10, total: 110 }],
            subtotal: 100,
            tax: 10,
            total: 110,
            status: 'draft'
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should pass validation for a valid invoice', async () => {
            mockedStorage.getAllInvoices.mockResolvedValue([]);
            const result = await validateInvoice(validInvoice);
            expect(result.isValid).toBe(true);
        });

        test('should fail if invoice number is not unique', async () => {
            mockedStorage.getAllInvoices.mockResolvedValue([
                { ...validInvoice, id: 'inv2' }
            ]);

            const result = await validateInvoice(validInvoice, { checkUniqueness: true });
            expect(result.isValid).toBe(false);
            expect(result.errors[0].message).toContain('unique');
        });

        test('should fail if customer does not exist', async () => {
            mockedStorage.getAllCustomers.mockResolvedValue([]);
            const result = await validateInvoice(validInvoice, { checkCustomerExists: true });
            expect(result.isValid).toBe(false);
            expect(result.errors[0].message).toContain('customer');
        });
    });
});
