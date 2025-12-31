import { ClientSideExcelRenderer } from '../excel'
import { ClientSideDOCXRenderer } from '../docx'
import { Quote, AdminSettings, Invoice } from '../types'

// Mock api-client
jest.mock('../api-client', () => ({
    loadBrandingUrls: jest.fn().mockResolvedValue({
        logoUrl: 'http://example.com/logo.png',
        sealUrl: 'http://example.com/seal.png',
        signatureUrl: 'http://example.com/signature.png',
    }),
    getFileUrl: jest.fn((url) => url),
}))

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
        headers: { get: () => 'image/png' },
    })
) as jest.Mock

// Polyfill Blob if missing (Node environment)
if (typeof Blob === 'undefined') {
    global.Blob = class Blob {
        size: number
        type: string
        constructor(content: any[], options: any) {
            this.size = content.length
            this.type = options?.type || ''
        }
    } as any
}

describe('Document Renderers', () => {
    const mockAdminSettings: AdminSettings = {
        companyName: 'Test Corp',
        address: '123 Test St',
        phone: '1234567890',
        email: 'test@example.com',
        website: 'example.com',
        vatNumber: 'TAX-123',
        defaultTerms: 'Terms applied',
    }

    const mockQuote: Quote = {
        id: '1',
        number: 'Q-001',
        date: '2025-01-01',
        validUntil: '2025-02-01',
        customer: {
            id: 'c1',
            name: 'Client A',
            email: 'client@example.com',
        },
        items: [
            {
                id: 'i1',
                vehicleTypeId: 'v1',
                vehicleTypeLabel: 'Sedan',
                quantity: 2,
                unitPrice: 100,
                taxPercent: 5,
                lineTaxAmount: 10,
                lineTotal: 210,
                description: 'Sedan Rental',
            },
        ],
        total: 210,
        totalTax: 10,
        subtotal: 200,
        currency: 'USD',
        status: 'draft',
        terms: 'Custom terms',
        notes: 'Thanks',
    }

    const mockInvoice: Invoice = {
        id: 'inv1',
        number: 'INV-001',
        date: '2025-01-01',
        dueDate: '2025-02-01',
        customerId: 'c1',
        items: [
            {
                id: 'i1',
                description: 'Sedan Rental',
                quantity: 2,
                unitPrice: 100,
                total: 200,
                tax: 0,
            },
        ],
        total: 200,
        tax: 0,
        subtotal: 200,
        status: 'draft',
        notes: 'Thanks',
    }

    describe('Excel Renderer', () => {
        const renderer = new ClientSideExcelRenderer()

        it('should result in a Blob for Quote', async () => {
            const blob = await renderer.renderQuoteToExcel(mockQuote, mockAdminSettings)
            expect(blob).toBeDefined()
            expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        })

        it('should result in a Blob for Invoice', async () => {
            const blob = await renderer.renderInvoiceToExcel(mockInvoice, mockAdminSettings, 'Client A')
            expect(blob).toBeDefined()
            expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        })
    })

    describe('DOCX Renderer', () => {
        const renderer = new ClientSideDOCXRenderer()

        it('should result in a Blob for Quote', async () => {
            const blob = await renderer.renderQuoteToDocx(mockQuote, mockAdminSettings)
            expect(blob).toBeDefined()
            // DOCX library output type varies, checking existence is primary smoke test
            expect(blob instanceof Blob).toBeTruthy()
        })

        it('should result in a Blob for Invoice', async () => {
            const blob = await renderer.renderInvoiceToDocx(mockInvoice, mockAdminSettings, 'Client A')
            expect(blob).toBeDefined()
            expect(blob instanceof Blob).toBeTruthy()
        })
    })

    describe('PDF Renderer', () => {
        it.skip('ClientSidePDFRenderer is DOM-dependent and skipped in unit tests', () => {
            // Placeholder to document why logic is skipped
        })
    })
})
