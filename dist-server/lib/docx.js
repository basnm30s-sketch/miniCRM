"use strict";
/**
 * DOCX Renderer abstraction layer
 * Provides DOCX export functionality for invoices and quotes with formatting, images, and tables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.docxRenderer = exports.ClientSideDOCXRenderer = void 0;
const docx_1 = require("docx");
const api_client_1 = require("./api-client");
/**
 * Client-side DOCX renderer using docx library
 * Creates formatted Word documents with proper structure, formatting, images, and tables
 */
class ClientSideDOCXRenderer {
    /**
     * Detect image type from buffer by checking magic bytes
     */
    detectImageType(buffer) {
        // Check magic bytes
        if (buffer.length >= 3) {
            // JPEG: starts with FF D8 FF
            if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
                return 'jpg';
            }
            // PNG: starts with 89 50 4E 47
            if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
                return 'png';
            }
            // GIF: starts with 47 49 46
            if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
                return 'gif';
            }
            // BMP: starts with 42 4D
            if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
                return 'bmp';
            }
        }
        // Default to PNG if unable to detect
        return 'png';
    }
    /**
     * Extract image type from URL or MIME type
     */
    getImageTypeFromUrl(url) {
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg'))
            return 'jpg';
        if (lowerUrl.includes('.png'))
            return 'png';
        if (lowerUrl.includes('.gif'))
            return 'gif';
        if (lowerUrl.includes('.bmp'))
            return 'bmp';
        return null;
    }
    /**
     * Extract image type from MIME type in data URL
     */
    getImageTypeFromMime(mimeType) {
        const lower = mimeType.toLowerCase();
        if (lower === 'jpeg' || lower === 'jpg')
            return 'jpg';
        if (lower === 'png')
            return 'png';
        if (lower === 'gif')
            return 'gif';
        if (lower === 'bmp')
            return 'bmp';
        // Default to png for unknown types
        return 'png';
    }
    /**
     * Helper to load image from URL and convert to buffer with type detection
     */
    async loadImageAsBuffer(imageUrl) {
        if (!imageUrl)
            return null;
        try {
            // Handle both API URLs and base64 data URLs
            let url = imageUrl;
            if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
                url = (0, api_client_1.getFileUrl)(imageUrl) || imageUrl;
            }
            let arrayBuffer;
            let detectedType = null;
            if (imageUrl.startsWith('data:')) {
                const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
                if (base64Match) {
                    // Extract MIME type from data URL
                    detectedType = this.getImageTypeFromMime(base64Match[1]);
                    const base64Data = base64Match[2];
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    arrayBuffer = bytes.buffer;
                }
                else {
                    return null;
                }
            }
            else {
                // Try to detect type from URL extension first
                detectedType = this.getImageTypeFromUrl(url);
                const response = await fetch(url);
                if (!response.ok)
                    return null;
                // If no type from URL, try Content-Type header
                if (!detectedType) {
                    const contentType = response.headers.get('Content-Type');
                    if (contentType) {
                        const mimeMatch = contentType.match(/image\/(\w+)/);
                        if (mimeMatch) {
                            detectedType = this.getImageTypeFromMime(mimeMatch[1]);
                        }
                    }
                }
                arrayBuffer = await response.arrayBuffer();
            }
            const buffer = Buffer.from(arrayBuffer);
            // Final fallback: detect from magic bytes if still no type
            if (!detectedType) {
                detectedType = this.detectImageType(buffer);
            }
            return { buffer, type: detectedType };
        }
        catch (error) {
            console.error('Failed to load image:', error);
            return null;
        }
    }
    async renderQuoteToDocx(quote, adminSettings) {
        const children = [];
        // Load branding URLs from fixed file locations
        const brandingUrls = await (0, api_client_1.loadBrandingUrls)();
        // Load images with type detection
        const logoData = await this.loadImageAsBuffer(brandingUrls.logoUrl);
        const sealData = await this.loadImageAsBuffer(brandingUrls.sealUrl);
        const signatureData = await this.loadImageAsBuffer(brandingUrls.signatureUrl);
        // Logo - centered at top
        if (logoData) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.ImageRun({
                        type: logoData.type,
                        data: logoData.buffer,
                        transformation: {
                            width: 250,
                            height: 80,
                        },
                    }),
                ],
                alignment: docx_1.AlignmentType.CENTER,
                spacing: { after: 200 },
            }));
        }
        // Company name - centered, bold
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({
                    text: adminSettings.companyName,
                    bold: true,
                    size: 40, // 20pt
                }),
            ],
            alignment: docx_1.AlignmentType.CENTER,
            spacing: { after: 100 },
        }));
        // Address and VAT - centered
        if (adminSettings.address) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: adminSettings.address,
                        size: 22, // 11pt
                    }),
                ],
                alignment: docx_1.AlignmentType.CENTER,
                spacing: { after: 50 },
            }));
        }
        if (adminSettings.vatNumber) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: `VAT: ${adminSettings.vatNumber}`,
                        size: 22, // 11pt
                    }),
                ],
                alignment: docx_1.AlignmentType.CENTER,
                spacing: { after: 400 },
            }));
        }
        // Bottom border line
        children.push(new docx_1.Paragraph({
            children: [new docx_1.TextRun({ text: '' })],
            border: {
                bottom: {
                    color: '333333',
                    size: 24, // 12pt
                    style: docx_1.BorderStyle.SINGLE,
                },
            },
            spacing: { after: 200 },
        }));
        // Title - centered, bold, larger
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({
                    text: 'QUOTATION',
                    bold: true,
                    size: 36, // 18pt
                }),
            ],
            alignment: docx_1.AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
        }));
        // Document metadata - simple paragraphs, not table
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: 'Quote #: ', bold: true }),
                new docx_1.TextRun({ text: quote.number }),
            ],
            spacing: { after: 100 },
        }));
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: 'Date: ', bold: true }),
                new docx_1.TextRun({ text: quote.date }),
            ],
            spacing: { after: 100 },
        }));
        if (quote.validUntil) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({ text: 'Valid Up To: ', bold: true }),
                    new docx_1.TextRun({ text: quote.validUntil }),
                ],
                spacing: { after: 100 },
            }));
        }
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: 'Currency: ', bold: true }),
                new docx_1.TextRun({ text: quote.currency || 'AED' }),
            ],
            spacing: { after: 400 },
        }));
        // Customer info section with background
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({
                    text: 'CUSTOMER',
                    bold: true,
                    size: 26, // 13pt
                    color: '0066CC', // Blue color
                }),
            ],
            spacing: { before: 200, after: 100 },
            shading: {
                type: docx_1.ShadingType.SOLID,
                color: 'F9F9F9',
                fill: 'F9F9F9',
            },
        }));
        // Customer details as simple paragraphs
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: quote.customer.name, bold: true }),
            ],
            spacing: { after: 100 },
        }));
        if (quote.customer.company) {
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: quote.customer.company })],
                spacing: { after: 100 },
            }));
        }
        if (quote.customer.address) {
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: quote.customer.address })],
                spacing: { after: 100 },
            }));
        }
        if (quote.customer.email) {
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: `Email: ${quote.customer.email}` })],
                spacing: { after: 100 },
            }));
        }
        if (quote.customer.phone) {
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: `Phone: ${quote.customer.phone}` })],
                spacing: { after: 200 },
            }));
        }
        // Line items table with professional borders
        const lineItemRows = [
            new docx_1.TableRow({
                children: [
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Description', bold: true })],
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 30, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Quantity', bold: true })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 10, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Unit Price', bold: true })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 12, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Tax %', bold: true })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 10, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Tax Amount', bold: true })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 12, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Total', bold: true })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 12, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                ],
            }),
        ];
        quote.items.forEach((item) => {
            const lineSubtotal = item.quantity * item.unitPrice;
            const lineTax = (lineSubtotal * item.taxPercent) / 100;
            const lineTotal = lineSubtotal + lineTax;
            lineItemRows.push(new docx_1.TableRow({
                children: [
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: item.vehicleTypeLabel || '' })],
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: item.quantity.toString() })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: item.unitPrice.toFixed(2) })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: item.taxPercent.toFixed(2) })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: lineTax.toFixed(2) })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: lineTotal.toFixed(2) })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                ],
            }));
        });
        // Add totals rows to the same table for proper alignment
        // Empty cells for first 4 columns, totals in last 2 columns
        lineItemRows.push(new docx_1.TableRow({
            children: [
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [
                        new docx_1.Paragraph({
                            children: [new docx_1.TextRun({ text: 'Total Tax:' })],
                            alignment: docx_1.AlignmentType.RIGHT,
                        }),
                    ],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [
                        new docx_1.Paragraph({
                            children: [new docx_1.TextRun({ text: quote.totalTax.toFixed(2) })],
                            alignment: docx_1.AlignmentType.RIGHT,
                        }),
                    ],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
            ],
        }), new docx_1.TableRow({
            children: [
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [
                        new docx_1.Paragraph({
                            children: [
                                new docx_1.TextRun({
                                    text: 'TOTAL:',
                                    bold: true,
                                    size: 28, // 14pt
                                }),
                            ],
                            alignment: docx_1.AlignmentType.RIGHT,
                        }),
                    ],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [
                        new docx_1.Paragraph({
                            children: [
                                new docx_1.TextRun({
                                    text: quote.total.toFixed(2),
                                    bold: true,
                                    size: 28, // 14pt
                                }),
                            ],
                            alignment: docx_1.AlignmentType.RIGHT,
                        }),
                    ],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
            ],
        }));
        children.push(new docx_1.Table({
            rows: lineItemRows,
            width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
            borders: {
                top: { style: docx_1.BorderStyle.SINGLE, size: 12, color: '333333' },
                bottom: { style: docx_1.BorderStyle.SINGLE, size: 12, color: '333333' },
                left: { style: docx_1.BorderStyle.SINGLE, size: 1, color: '000000' },
                right: { style: docx_1.BorderStyle.SINGLE, size: 1, color: '000000' },
                insideHorizontal: { style: docx_1.BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                insideVertical: { style: docx_1.BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
            margins: { marginUnitType: docx_1.WidthType.DXA, top: 0, bottom: 200, left: 0, right: 0 },
        }));
        // Notes section
        if (quote.notes) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: 'Notes:',
                        bold: true,
                    }),
                ],
                spacing: { before: 200 },
            }));
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: quote.notes })],
                spacing: { after: 200 },
            }));
        }
        // Terms section
        if (quote.terms || adminSettings.defaultTerms) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: 'Terms and Conditions:',
                        bold: true,
                    }),
                ],
                spacing: { before: 200 },
            }));
            const terms = quote.terms || adminSettings.defaultTerms || '';
            // Convert HTML to plain text with line breaks
            const termsText = terms
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<p[^>]*>/gi, '')
                .replace(/<\/div>/gi, '\n')
                .replace(/<div[^>]*>/gi, '')
                .replace(/<[^>]+>/g, '')
                .trim();
            termsText.split('\n').forEach((line) => {
                if (line.trim()) {
                    children.push(new docx_1.Paragraph({
                        children: [new docx_1.TextRun({ text: line.trim() })],
                        spacing: { after: 100 },
                    }));
                }
            });
        }
        // Footer with signature and seal
        const footerTable = new docx_1.Table({
            rows: [
                new docx_1.TableRow({
                    children: [
                        new docx_1.TableCell({
                            children: [
                                signatureData
                                    ? new docx_1.Paragraph({
                                        children: [
                                            new docx_1.ImageRun({
                                                type: signatureData.type,
                                                data: signatureData.buffer,
                                                transformation: {
                                                    width: 180,
                                                    height: 80,
                                                },
                                            }),
                                        ],
                                    })
                                    : new docx_1.Paragraph({ text: '' }),
                                new docx_1.Paragraph({
                                    children: [
                                        new docx_1.TextRun({
                                            text: 'Authorized By:',
                                            size: 20, // 10pt
                                        }),
                                    ],
                                    spacing: { before: 100 },
                                }),
                            ],
                            width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                            margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 0, left: 0, right: 0 },
                        }),
                        new docx_1.TableCell({
                            children: [
                                sealData
                                    ? new docx_1.Paragraph({
                                        children: [
                                            new docx_1.ImageRun({
                                                type: sealData.type,
                                                data: sealData.buffer,
                                                transformation: {
                                                    width: 150,
                                                    height: 100,
                                                },
                                            }),
                                        ],
                                        alignment: docx_1.AlignmentType.RIGHT,
                                    })
                                    : new docx_1.Paragraph({ text: '' }),
                                new docx_1.Paragraph({
                                    children: [
                                        new docx_1.TextRun({
                                            text: `Date: ${quote.date}`,
                                            size: 20, // 10pt
                                        }),
                                    ],
                                    alignment: docx_1.AlignmentType.RIGHT,
                                    spacing: { before: 100 },
                                }),
                            ],
                            width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                            margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 0, left: 0, right: 0 },
                        }),
                    ],
                }),
            ],
            width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
            borders: docx_1.TableBorders.NONE,
        });
        children.push(footerTable);
        // Create document with proper margins
        const doc = new docx_1.Document({
            sections: [
                {
                    properties: {
                        page: {
                            margin: {
                                top: 1440, // 1 inch
                                right: 1440,
                                bottom: 1440,
                                left: 1440,
                            },
                        },
                    },
                    children,
                },
            ],
        });
        // Generate DOCX file as buffer
        const buffer = await docx_1.Packer.toBuffer(doc);
        return new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
    }
    async renderInvoiceToDocx(invoice, adminSettings, customerName) {
        const children = [];
        // Load branding URLs from fixed file locations
        const brandingUrls = await (0, api_client_1.loadBrandingUrls)();
        // Load images with type detection
        const logoData = await this.loadImageAsBuffer(brandingUrls.logoUrl);
        const sealData = await this.loadImageAsBuffer(brandingUrls.sealUrl);
        const signatureData = await this.loadImageAsBuffer(brandingUrls.signatureUrl);
        // Logo - centered at top
        if (logoData) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.ImageRun({
                        type: logoData.type,
                        data: logoData.buffer,
                        transformation: {
                            width: 250,
                            height: 80,
                        },
                    }),
                ],
                alignment: docx_1.AlignmentType.CENTER,
                spacing: { after: 200 },
            }));
        }
        // Company name - centered, bold
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({
                    text: adminSettings.companyName,
                    bold: true,
                    size: 40, // 20pt
                }),
            ],
            alignment: docx_1.AlignmentType.CENTER,
            spacing: { after: 100 },
        }));
        // Address and VAT - centered
        if (adminSettings.address) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: adminSettings.address,
                        size: 22, // 11pt
                    }),
                ],
                alignment: docx_1.AlignmentType.CENTER,
                spacing: { after: 50 },
            }));
        }
        if (adminSettings.vatNumber) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: `VAT: ${adminSettings.vatNumber}`,
                        size: 22, // 11pt
                    }),
                ],
                alignment: docx_1.AlignmentType.CENTER,
                spacing: { after: 200 },
            }));
        }
        // Bottom border line
        children.push(new docx_1.Paragraph({
            children: [new docx_1.TextRun({ text: '' })],
            border: {
                bottom: {
                    color: '333333',
                    size: 24, // 12pt
                    style: docx_1.BorderStyle.SINGLE,
                },
            },
            spacing: { after: 200 },
        }));
        // Title - centered, bold, larger
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({
                    text: 'INVOICE',
                    bold: true,
                    size: 36, // 18pt
                }),
            ],
            alignment: docx_1.AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
        }));
        // Document metadata
        const statusDisplay = invoice.status === 'payment_received'
            ? 'Payment Received'
            : invoice.status === 'invoice_sent'
                ? 'Invoice Sent'
                : invoice.status === 'draft'
                    ? 'Draft'
                    : invoice.status || 'Draft';
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: 'Invoice #: ', bold: true }),
                new docx_1.TextRun({ text: invoice.number }),
            ],
            spacing: { after: 100 },
        }));
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: 'Date: ', bold: true }),
                new docx_1.TextRun({ text: invoice.date }),
            ],
            spacing: { after: 100 },
        }));
        if (invoice.dueDate) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({ text: 'Due Date: ', bold: true }),
                    new docx_1.TextRun({ text: invoice.dueDate }),
                ],
                spacing: { after: 100 },
            }));
        }
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: 'Status: ', bold: true }),
                new docx_1.TextRun({ text: statusDisplay }),
            ],
            spacing: { after: 400 },
        }));
        // Customer info section
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({
                    text: 'CUSTOMER',
                    bold: true,
                    size: 26, // 13pt
                    color: '0066CC', // Blue color
                }),
            ],
            spacing: { before: 200, after: 100 },
            shading: {
                type: docx_1.ShadingType.SOLID,
                color: 'F9F9F9',
                fill: 'F9F9F9',
            },
        }));
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: customerName, bold: true }),
            ],
            spacing: { after: 200 },
        }));
        // Line items table
        const lineItemRows = [
            new docx_1.TableRow({
                children: [
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Description', bold: true })],
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 30, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Quantity', bold: true })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 10, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Unit Price', bold: true })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 12, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Total', bold: true })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 12, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                ],
            }),
        ];
        invoice.items.forEach((item) => {
            const lineTotal = item.quantity * item.unitPrice + (item.tax || 0);
            lineItemRows.push(new docx_1.TableRow({
                children: [
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: item.description || '' })],
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: item.quantity.toString() })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: item.unitPrice.toFixed(2) })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: lineTotal.toFixed(2) })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                ],
            }));
        });
        // Add totals rows to the same table for proper alignment
        // Empty cells for first 3 columns, totals in last column
        lineItemRows.push(new docx_1.TableRow({
            children: [
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [
                        new docx_1.Paragraph({
                            children: [new docx_1.TextRun({ text: 'Tax:' })],
                            alignment: docx_1.AlignmentType.RIGHT,
                        }),
                    ],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [
                        new docx_1.Paragraph({
                            children: [new docx_1.TextRun({ text: (invoice.tax || 0).toFixed(2) })],
                            alignment: docx_1.AlignmentType.RIGHT,
                        }),
                    ],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
            ],
        }), new docx_1.TableRow({
            children: [
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [
                        new docx_1.Paragraph({
                            children: [
                                new docx_1.TextRun({
                                    text: 'TOTAL:',
                                    bold: true,
                                    size: 28, // 14pt
                                }),
                            ],
                            alignment: docx_1.AlignmentType.RIGHT,
                        }),
                    ],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [
                        new docx_1.Paragraph({
                            children: [
                                new docx_1.TextRun({
                                    text: invoice.total.toFixed(2),
                                    bold: true,
                                    size: 28, // 14pt
                                }),
                            ],
                            alignment: docx_1.AlignmentType.RIGHT,
                        }),
                    ],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
            ],
        }));
        if (invoice.amountReceived !== undefined && invoice.amountReceived > 0) {
            lineItemRows.push(new docx_1.TableRow({
                children: [
                    new docx_1.TableCell({
                        children: [new docx_1.Paragraph({ text: '' })],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [new docx_1.Paragraph({ text: '' })],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Amount Received:' })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: invoice.amountReceived.toFixed(2) })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                ],
            }), new docx_1.TableRow({
                children: [
                    new docx_1.TableCell({
                        children: [new docx_1.Paragraph({ text: '' })],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [new docx_1.Paragraph({ text: '' })],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [
                                    new docx_1.TextRun({
                                        text: 'Pending:',
                                    }),
                                ],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [
                                    new docx_1.TextRun({
                                        text: ((invoice.total || 0) - invoice.amountReceived).toFixed(2),
                                    }),
                                ],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                ],
            }));
        }
        children.push(new docx_1.Table({
            rows: lineItemRows,
            width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
            borders: {
                top: { style: docx_1.BorderStyle.SINGLE, size: 12, color: '333333' },
                bottom: { style: docx_1.BorderStyle.SINGLE, size: 12, color: '333333' },
                left: { style: docx_1.BorderStyle.SINGLE, size: 1, color: '000000' },
                right: { style: docx_1.BorderStyle.SINGLE, size: 1, color: '000000' },
                insideHorizontal: { style: docx_1.BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                insideVertical: { style: docx_1.BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
            margins: { marginUnitType: docx_1.WidthType.DXA, top: 0, bottom: 200, left: 0, right: 0 },
        }));
        const invoiceDefaultTerms = adminSettings.defaultInvoiceTerms ?? adminSettings.defaultTerms;
        // Terms section
        if (invoice.terms || invoiceDefaultTerms) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: 'Terms and Conditions:',
                        bold: true,
                    }),
                ],
                spacing: { before: 200 },
            }));
            const terms = invoice.terms || invoiceDefaultTerms || '';
            // Convert HTML to plain text with line breaks
            const termsText = terms
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<p[^>]*>/gi, '')
                .replace(/<\/div>/gi, '\n')
                .replace(/<div[^>]*>/gi, '')
                .replace(/<[^>]+>/g, '')
                .trim();
            termsText.split('\n').forEach((line) => {
                if (line.trim()) {
                    children.push(new docx_1.Paragraph({
                        children: [new docx_1.TextRun({ text: line.trim() })],
                        spacing: { after: 100 },
                    }));
                }
            });
        }
        // Notes section
        if (invoice.notes) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: 'Notes:',
                        bold: true,
                    }),
                ],
                spacing: { before: 200 },
            }));
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: invoice.notes })],
                spacing: { after: 200 },
            }));
        }
        // Footer with signature and seal
        const footerTable = new docx_1.Table({
            rows: [
                new docx_1.TableRow({
                    children: [
                        new docx_1.TableCell({
                            children: [
                                signatureData
                                    ? new docx_1.Paragraph({
                                        children: [
                                            new docx_1.ImageRun({
                                                type: signatureData.type,
                                                data: signatureData.buffer,
                                                transformation: {
                                                    width: 180,
                                                    height: 80,
                                                },
                                            }),
                                        ],
                                    })
                                    : new docx_1.Paragraph({ text: '' }),
                                new docx_1.Paragraph({
                                    children: [
                                        new docx_1.TextRun({
                                            text: 'Authorized By:',
                                            size: 20, // 10pt
                                        }),
                                    ],
                                    spacing: { before: 100 },
                                }),
                            ],
                            width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                            margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 0, left: 0, right: 0 },
                        }),
                        new docx_1.TableCell({
                            children: [
                                sealData
                                    ? new docx_1.Paragraph({
                                        children: [
                                            new docx_1.ImageRun({
                                                type: sealData.type,
                                                data: sealData.buffer,
                                                transformation: {
                                                    width: 150,
                                                    height: 100,
                                                },
                                            }),
                                        ],
                                        alignment: docx_1.AlignmentType.RIGHT,
                                    })
                                    : new docx_1.Paragraph({ text: '' }),
                                new docx_1.Paragraph({
                                    children: [
                                        new docx_1.TextRun({
                                            text: `Date: ${invoice.date}`,
                                            size: 20, // 10pt
                                        }),
                                    ],
                                    alignment: docx_1.AlignmentType.RIGHT,
                                    spacing: { before: 100 },
                                }),
                            ],
                            width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                            margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 0, left: 0, right: 0 },
                        }),
                    ],
                }),
            ],
            width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
            borders: docx_1.TableBorders.NONE,
        });
        children.push(footerTable);
        // Create document with proper margins
        const doc = new docx_1.Document({
            sections: [
                {
                    properties: {
                        page: {
                            margin: {
                                top: 1440, // 1 inch
                                right: 1440,
                                bottom: 1440,
                                left: 1440,
                            },
                        },
                    },
                    children,
                },
            ],
        });
        // Generate DOCX file as buffer
        const buffer = await docx_1.Packer.toBuffer(doc);
        return new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
    }
    async renderPurchaseOrderToDocx(po, adminSettings, vendorName) {
        const children = [];
        // Load branding URLs from fixed file locations
        const brandingUrls = await (0, api_client_1.loadBrandingUrls)();
        // Load images with type detection
        const logoData = await this.loadImageAsBuffer(brandingUrls.logoUrl);
        const sealData = await this.loadImageAsBuffer(brandingUrls.sealUrl);
        const signatureData = await this.loadImageAsBuffer(brandingUrls.signatureUrl);
        // Logo - centered at top
        if (logoData) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.ImageRun({
                        type: logoData.type,
                        data: logoData.buffer,
                        transformation: {
                            width: 250,
                            height: 80,
                        },
                    }),
                ],
                alignment: docx_1.AlignmentType.CENTER,
                spacing: { after: 200 },
            }));
        }
        // Company name - centered, bold
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({
                    text: adminSettings.companyName,
                    bold: true,
                    size: 40, // 20pt
                }),
            ],
            alignment: docx_1.AlignmentType.CENTER,
            spacing: { after: 100 },
        }));
        // Address and VAT - centered
        if (adminSettings.address) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: adminSettings.address,
                        size: 22, // 11pt
                    }),
                ],
                alignment: docx_1.AlignmentType.CENTER,
                spacing: { after: 50 },
            }));
        }
        if (adminSettings.vatNumber) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: `VAT: ${adminSettings.vatNumber}`,
                        size: 22, // 11pt
                    }),
                ],
                alignment: docx_1.AlignmentType.CENTER,
                spacing: { after: 200 },
            }));
        }
        // Bottom border line
        children.push(new docx_1.Paragraph({
            children: [new docx_1.TextRun({ text: '' })],
            border: {
                bottom: {
                    color: '333333',
                    size: 24, // 12pt
                    style: docx_1.BorderStyle.SINGLE,
                },
            },
            spacing: { after: 200 },
        }));
        // Title - centered, bold, larger
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({
                    text: 'PURCHASE ORDER',
                    bold: true,
                    size: 36, // 18pt
                }),
            ],
            alignment: docx_1.AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
        }));
        // Document metadata
        const statusDisplay = po.status === 'accepted'
            ? 'Accepted'
            : po.status === 'sent'
                ? 'Sent'
                : po.status === 'draft'
                    ? 'Draft'
                    : po.status || 'Draft';
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: 'PO #: ', bold: true }),
                new docx_1.TextRun({ text: po.number }),
            ],
            spacing: { after: 100 },
        }));
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: 'Date: ', bold: true }),
                new docx_1.TextRun({ text: po.date }),
            ],
            spacing: { after: 100 },
        }));
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: 'Status: ', bold: true }),
                new docx_1.TextRun({ text: statusDisplay }),
            ],
            spacing: { after: 400 },
        }));
        // Vendor info section
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({
                    text: 'VENDOR',
                    bold: true,
                    size: 26, // 13pt
                    color: '0066CC', // Blue color
                }),
            ],
            spacing: { before: 200, after: 100 },
            shading: {
                type: docx_1.ShadingType.SOLID,
                color: 'F9F9F9',
                fill: 'F9F9F9',
            },
        }));
        children.push(new docx_1.Paragraph({
            children: [
                new docx_1.TextRun({ text: vendorName, bold: true }),
            ],
            spacing: { after: 200 },
        }));
        // Line items table
        const lineItemRows = [
            new docx_1.TableRow({
                children: [
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Description', bold: true })],
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 30, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Quantity', bold: true })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 10, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Unit Price', bold: true })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 12, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: 'Total', bold: true })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        shading: {
                            type: docx_1.ShadingType.SOLID,
                            color: 'E0E0E0',
                            fill: 'E0E0E0',
                        },
                        width: { size: 12, type: docx_1.WidthType.PERCENTAGE },
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                ],
            }),
        ];
        po.items.forEach((item) => {
            const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
            lineItemRows.push(new docx_1.TableRow({
                children: [
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: item.description || item.vehicleNumber || '' })],
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: (item.quantity || 0).toString() })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: (item.unitPrice || 0).toFixed(2) })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                    new docx_1.TableCell({
                        children: [
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: lineTotal.toFixed(2) })],
                                alignment: docx_1.AlignmentType.RIGHT,
                            }),
                        ],
                        margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                    }),
                ],
            }));
        });
        // Add totals rows to the same table for proper alignment
        lineItemRows.push(new docx_1.TableRow({
            children: [
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [
                        new docx_1.Paragraph({
                            children: [new docx_1.TextRun({ text: 'Tax:' })],
                            alignment: docx_1.AlignmentType.RIGHT,
                        }),
                    ],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [
                        new docx_1.Paragraph({
                            children: [new docx_1.TextRun({ text: (po.tax || 0).toFixed(2) })],
                            alignment: docx_1.AlignmentType.RIGHT,
                        }),
                    ],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
            ],
        }), new docx_1.TableRow({
            children: [
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [new docx_1.Paragraph({ text: '' })],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [
                        new docx_1.Paragraph({
                            children: [
                                new docx_1.TextRun({
                                    text: 'TOTAL:',
                                    bold: true,
                                    size: 28, // 14pt
                                }),
                            ],
                            alignment: docx_1.AlignmentType.RIGHT,
                        }),
                    ],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
                new docx_1.TableCell({
                    children: [
                        new docx_1.Paragraph({
                            children: [
                                new docx_1.TextRun({
                                    text: (po.amount || 0).toFixed(2),
                                    bold: true,
                                    size: 28, // 14pt
                                }),
                            ],
                            alignment: docx_1.AlignmentType.RIGHT,
                        }),
                    ],
                    margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 200, left: 200, right: 200 },
                }),
            ],
        }));
        children.push(new docx_1.Table({
            rows: lineItemRows,
            width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
            borders: {
                top: { style: docx_1.BorderStyle.SINGLE, size: 12, color: '333333' },
                bottom: { style: docx_1.BorderStyle.SINGLE, size: 12, color: '333333' },
                left: { style: docx_1.BorderStyle.SINGLE, size: 1, color: '000000' },
                right: { style: docx_1.BorderStyle.SINGLE, size: 1, color: '000000' },
                insideHorizontal: { style: docx_1.BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                insideVertical: { style: docx_1.BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
            margins: { marginUnitType: docx_1.WidthType.DXA, top: 0, bottom: 200, left: 0, right: 0 },
        }));
        const poDefaultTerms = adminSettings.defaultPurchaseOrderTerms ?? adminSettings.defaultTerms;
        // Terms section
        if (po.terms || poDefaultTerms) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: 'Terms and Conditions:',
                        bold: true,
                    }),
                ],
                spacing: { before: 200 },
            }));
            const terms = po.terms || poDefaultTerms || '';
            // Convert HTML to plain text with line breaks
            const termsText = terms
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<p[^>]*>/gi, '')
                .replace(/<\/div>/gi, '\n')
                .replace(/<div[^>]*>/gi, '')
                .replace(/<[^>]+>/g, '')
                .trim();
            termsText.split('\n').forEach((line) => {
                if (line.trim()) {
                    children.push(new docx_1.Paragraph({
                        children: [new docx_1.TextRun({ text: line.trim() })],
                        spacing: { after: 100 },
                    }));
                }
            });
        }
        // Notes section
        if (po.notes) {
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: 'Notes:',
                        bold: true,
                    }),
                ],
                spacing: { before: 200 },
            }));
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: po.notes })],
                spacing: { after: 200 },
            }));
        }
        // Footer with signature and seal
        const footerTable = new docx_1.Table({
            rows: [
                new docx_1.TableRow({
                    children: [
                        new docx_1.TableCell({
                            children: [
                                signatureData
                                    ? new docx_1.Paragraph({
                                        children: [
                                            new docx_1.ImageRun({
                                                type: signatureData.type,
                                                data: signatureData.buffer,
                                                transformation: {
                                                    width: 180,
                                                    height: 80,
                                                },
                                            }),
                                        ],
                                    })
                                    : new docx_1.Paragraph({ text: '' }),
                                new docx_1.Paragraph({
                                    children: [
                                        new docx_1.TextRun({
                                            text: 'Authorized By:',
                                            size: 20, // 10pt
                                        }),
                                    ],
                                    spacing: { before: 100 },
                                }),
                            ],
                            width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                            margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 0, left: 0, right: 0 },
                        }),
                        new docx_1.TableCell({
                            children: [
                                sealData
                                    ? new docx_1.Paragraph({
                                        children: [
                                            new docx_1.ImageRun({
                                                type: sealData.type,
                                                data: sealData.buffer,
                                                transformation: {
                                                    width: 150,
                                                    height: 100,
                                                },
                                            }),
                                        ],
                                        alignment: docx_1.AlignmentType.RIGHT,
                                    })
                                    : new docx_1.Paragraph({ text: '' }),
                                new docx_1.Paragraph({
                                    children: [
                                        new docx_1.TextRun({
                                            text: `Date: ${po.date}`,
                                            size: 20, // 10pt
                                        }),
                                    ],
                                    alignment: docx_1.AlignmentType.RIGHT,
                                    spacing: { before: 100 },
                                }),
                            ],
                            width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                            margins: { marginUnitType: docx_1.WidthType.DXA, top: 200, bottom: 0, left: 0, right: 0 },
                        }),
                    ],
                }),
            ],
            width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
            borders: docx_1.TableBorders.NONE,
        });
        children.push(footerTable);
        // Create document with proper margins
        const doc = new docx_1.Document({
            sections: [
                {
                    properties: {
                        page: {
                            margin: {
                                top: 1440, // 1 inch
                                right: 1440,
                                bottom: 1440,
                                left: 1440,
                            },
                        },
                    },
                    children,
                },
            ],
        });
        // Generate DOCX file as buffer
        const buffer = await docx_1.Packer.toBuffer(doc);
        return new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
    }
    downloadDocx(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
exports.ClientSideDOCXRenderer = ClientSideDOCXRenderer;
// Export a singleton instance
exports.docxRenderer = new ClientSideDOCXRenderer();
