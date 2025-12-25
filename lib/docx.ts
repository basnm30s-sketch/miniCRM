/**
 * DOCX Renderer abstraction layer
 * Provides DOCX export functionality for invoices and quotes with formatting, images, and tables
 */

import { Quote, AdminSettings } from '@/lib/types'
import type { Invoice } from '@/lib/storage'
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  TextRun,
  HeadingLevel,
  ImageRun,
  BorderStyle,
  ShadingType,
} from 'docx'
import { getFileUrl } from './api-client'

export interface DOCXRenderer {
  /**
   * Render a quote to DOCX blob
   * @param quote - Quote object
   * @param adminSettings - Admin company settings
   * @returns Promise<Blob> - DOCX file as blob
   */
  renderQuoteToDocx(quote: Quote, adminSettings: AdminSettings): Promise<Blob>

  /**
   * Render an invoice to DOCX blob
   * @param invoice - Invoice object
   * @param adminSettings - Admin company settings
   * @param customerName - Customer name for display
   * @returns Promise<Blob> - DOCX file as blob
   */
  renderInvoiceToDocx(invoice: Invoice, adminSettings: AdminSettings, customerName: string): Promise<Blob>

  /**
   * Trigger download of a DOCX blob in the browser
   * @param blob - DOCX blob
   * @param filename - Filename for download (e.g., "quote-AAT-20251118-0001.docx")
   */
  downloadDocx(blob: Blob, filename: string): void
}

/**
 * Client-side DOCX renderer using docx library
 * Creates formatted Word documents with proper structure, formatting, images, and tables
 */
export class ClientSideDOCXRenderer implements DOCXRenderer {
  /**
   * Helper to load image from URL and convert to buffer
   */
  private async loadImageAsBuffer(imageUrl: string | null): Promise<Buffer | null> {
    if (!imageUrl) return null

    try {
      // Handle both API URLs and base64 data URLs
      let url = imageUrl
      if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
        url = getFileUrl(imageUrl) || imageUrl
      }

      let arrayBuffer: ArrayBuffer

      if (imageUrl.startsWith('data:')) {
        const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/)
        if (base64Match) {
          const base64Data = base64Match[2]
          const binaryString = atob(base64Data)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          arrayBuffer = bytes.buffer
        } else {
          return null
        }
      } else {
        const response = await fetch(url)
        if (!response.ok) return null
        arrayBuffer = await response.arrayBuffer()
      }

      return Buffer.from(arrayBuffer)
    } catch (error) {
      console.error('Failed to load image:', error)
      return null
    }
  }

  async renderQuoteToDocx(quote: Quote, adminSettings: AdminSettings): Promise<Blob> {
    const children: (Paragraph | Table)[] = []

    // Load images
    const logoBuffer = await this.loadImageAsBuffer(adminSettings.logoUrl)
    const sealBuffer = await this.loadImageAsBuffer(adminSettings.sealUrl)
    const signatureBuffer = await this.loadImageAsBuffer(adminSettings.signatureUrl)

    // Header section with logo and company name side by side
    const headerTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: logoBuffer
                ? [
                    new Paragraph({
                      children: [
                        new ImageRun({
                          data: logoBuffer,
                          transformation: {
                            width: 200,
                            height: 60,
                          },
                        }),
                      ],
                    }),
                  ]
                : [],
              width: { size: 30, type: WidthType.PERCENTAGE },
              margins: { top: 0, bottom: 0, left: 0, right: 200 },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: adminSettings.companyName,
                      bold: true,
                      size: 28, // 14pt
                    }),
                  ],
                }),
                adminSettings.address
                  ? new Paragraph({
                      children: [
                        new TextRun({
                          text: adminSettings.address,
                          size: 22, // 11pt
                        }),
                      ],
                    })
                  : new Paragraph({ text: '' }),
                adminSettings.vatNumber
                  ? new Paragraph({
                      children: [
                        new TextRun({
                          text: `VAT: ${adminSettings.vatNumber}`,
                          size: 22, // 11pt
                        }),
                      ],
                    })
                  : new Paragraph({ text: '' }),
              ],
              width: { size: 70, type: WidthType.PERCENTAGE },
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '333333' },
      },
    })

    children.push(headerTable)

    // Title - centered
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'QUOTE',
            bold: true,
            size: 36, // 18pt
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
      })
    )

    // Document metadata - two columns
    const metadataTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Quote #:', bold: true }),
                    new TextRun({ text: ` ${quote.number}` }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Date:', bold: true }),
                    new TextRun({ text: ` ${quote.date}` }),
                  ],
                }),
                quote.validUntil
                  ? new Paragraph({
                      children: [
                        new TextRun({ text: 'Valid Up To:', bold: true }),
                        new TextRun({ text: ` ${quote.validUntil}` }),
                      ],
                    })
                  : new Paragraph({ text: '' }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Currency:', bold: true }),
                    new TextRun({ text: ` ${quote.currency || 'AED'}` }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    })

    children.push(metadataTable)

    // Customer info section with background
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'CUSTOMER',
            bold: true,
            size: 26, // 13pt
          }),
        ],
        spacing: { before: 400, after: 200 },
        shading: {
          type: ShadingType.SOLID,
          color: 'F0F0F0',
          fill: 'F0F0F0',
        },
      })
    )

    const customerRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Name:', bold: true }),
                  new TextRun({ text: ` ${quote.customer.name}` }),
                ],
              }),
            ],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: quote.customer.name })],
              }),
            ],
            width: { size: 30, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ]

    if (quote.customer.company) {
      customerRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Company:', bold: true }),
                    new TextRun({ text: ` ${quote.customer.company}` }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: quote.customer.company })],
                }),
              ],
            }),
          ],
        })
      )
    }

    if (quote.customer.address) {
      customerRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Address:', bold: true }),
                    new TextRun({ text: ` ${quote.customer.address}` }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: quote.customer.address })],
                }),
              ],
            }),
          ],
        })
      )
    }

    if (quote.customer.email) {
      customerRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Email:', bold: true }),
                    new TextRun({ text: ` ${quote.customer.email}` }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: quote.customer.email })],
                }),
              ],
            }),
          ],
        })
      )
    }

    if (quote.customer.phone) {
      customerRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Phone:', bold: true }),
                    new TextRun({ text: ` ${quote.customer.phone}` }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: quote.customer.phone })],
                }),
              ],
            }),
          ],
        })
      )
    }

    children.push(
      new Table({
        rows: customerRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        margins: { top: 0, bottom: 200, left: 0, right: 0 },
      })
    )

    // Line items table with professional borders
    const lineItemRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Description', bold: true })],
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: 'E0E0E0',
              fill: 'E0E0E0',
            },
            width: { size: 30, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Quantity', bold: true })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: 'E0E0E0',
              fill: 'E0E0E0',
            },
            width: { size: 10, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Unit Price', bold: true })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: 'E0E0E0',
              fill: 'E0E0E0',
            },
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Tax %', bold: true })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: 'E0E0E0',
              fill: 'E0E0E0',
            },
            width: { size: 10, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Tax Amount', bold: true })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: 'E0E0E0',
              fill: 'E0E0E0',
            },
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Total', bold: true })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: 'E0E0E0',
              fill: 'E0E0E0',
            },
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ]

    quote.items.forEach((item) => {
      const lineSubtotal = item.quantity * item.unitPrice
      const lineTax = (lineSubtotal * item.taxPercent) / 100
      const lineTotal = lineSubtotal + lineTax

      lineItemRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: item.vehicleTypeLabel || '' })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: item.quantity.toString() })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: item.unitPrice.toFixed(2) })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: item.taxPercent.toFixed(2) })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: lineTax.toFixed(2) })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: lineTotal.toFixed(2) })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        })
      )
    })

    children.push(
      new Table({
        rows: lineItemRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: '333333' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '333333' },
          left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        },
        margins: { top: 0, bottom: 400, left: 0, right: 0 },
      })
    )

    // Totals section - right aligned
    const totalsTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Subtotal:', bold: true })],
                }),
              ],
              width: { size: 70, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: quote.subTotal.toFixed(2), bold: true })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
              width: { size: 30, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Total Tax:', bold: true })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: quote.totalTax.toFixed(2), bold: true })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'TOTAL:',
                      bold: true,
                      size: 28, // 14pt
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: quote.total.toFixed(2),
                      bold: true,
                      size: 28, // 14pt
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        }),
      ],
      width: { size: 50, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.RIGHT,
      margins: { top: 0, bottom: 400, left: 0, right: 0 },
    })

    children.push(totalsTable)

    // Notes section
    if (quote.notes) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Notes:',
              bold: true,
            }),
          ],
          spacing: { before: 400 },
        })
      )
      children.push(
        new Paragraph({
          children: [new TextRun({ text: quote.notes })],
          spacing: { after: 400 },
        })
      )
    }

    // Terms section
    if (quote.terms || adminSettings.defaultTerms) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Terms and Conditions:',
              bold: true,
            }),
          ],
          spacing: { before: 400 },
        })
      )

      const terms = quote.terms || adminSettings.defaultTerms || ''
      // Convert HTML to plain text with line breaks
      const termsText = terms
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/div>/gi, '\n')
        .replace(/<div[^>]*>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim()

      termsText.split('\n').forEach((line) => {
        if (line.trim()) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: line.trim() })],
            })
          )
        }
      })
    }

    // Footer with signature and seal
    const footerTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                signatureBuffer
                  ? new Paragraph({
                      children: [
                        new ImageRun({
                          data: signatureBuffer,
                          transformation: {
                            width: 150,
                            height: 60,
                          },
                        }),
                      ],
                    })
                  : new Paragraph({ text: '' }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Authorized By:',
                      size: 20, // 10pt
                    }),
                  ],
                  spacing: { before: 200 },
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 400, bottom: 0, left: 0, right: 0 },
            }),
            new TableCell({
              children: [
                sealBuffer
                  ? new Paragraph({
                      children: [
                        new ImageRun({
                          data: sealBuffer,
                          transformation: {
                            width: 120,
                            height: 80,
                          },
                        }),
                      ],
                      alignment: AlignmentType.RIGHT,
                    })
                  : new Paragraph({ text: '' }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Date: ${quote.date}`,
                      size: 20, // 10pt
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 200 },
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 400, bottom: 0, left: 0, right: 0 },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    })

    children.push(footerTable)

    // Create document with proper margins
    const doc = new Document({
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
    })

    // Generate DOCX file as buffer
    const buffer = await Packer.toBuffer(doc)
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
  }

  async renderInvoiceToDocx(invoice: Invoice, adminSettings: AdminSettings, customerName: string): Promise<Blob> {
    const children: (Paragraph | Table)[] = []

    // Load images
    const logoBuffer = await this.loadImageAsBuffer(adminSettings.logoUrl)
    const sealBuffer = await this.loadImageAsBuffer(adminSettings.sealUrl)
    const signatureBuffer = await this.loadImageAsBuffer(adminSettings.signatureUrl)

    // Header section with logo and company name side by side
    const headerTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: logoBuffer
                ? [
                    new Paragraph({
                      children: [
                        new ImageRun({
                          data: logoBuffer,
                          transformation: {
                            width: 200,
                            height: 60,
                          },
                        }),
                      ],
                    }),
                  ]
                : [],
              width: { size: 30, type: WidthType.PERCENTAGE },
              margins: { top: 0, bottom: 0, left: 0, right: 200 },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: adminSettings.companyName,
                      bold: true,
                      size: 28, // 14pt
                    }),
                  ],
                }),
                adminSettings.address
                  ? new Paragraph({
                      children: [
                        new TextRun({
                          text: adminSettings.address,
                          size: 22, // 11pt
                        }),
                      ],
                    })
                  : new Paragraph({ text: '' }),
                adminSettings.vatNumber
                  ? new Paragraph({
                      children: [
                        new TextRun({
                          text: `VAT: ${adminSettings.vatNumber}`,
                          size: 22, // 11pt
                        }),
                      ],
                    })
                  : new Paragraph({ text: '' }),
              ],
              width: { size: 70, type: WidthType.PERCENTAGE },
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '333333' },
      },
    })

    children.push(headerTable)

    // Title - centered
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'INVOICE',
            bold: true,
            size: 36, // 18pt
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
      })
    )

    // Document metadata
    const statusDisplay =
      invoice.status === 'payment_received'
        ? 'Payment Received'
        : invoice.status === 'invoice_sent'
          ? 'Invoice Sent'
          : invoice.status === 'draft'
            ? 'Draft'
            : invoice.status || 'Draft'

    const metadataRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Invoice #:', bold: true }),
                  new TextRun({ text: ` ${invoice.number}` }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Date:', bold: true }),
                  new TextRun({ text: ` ${invoice.date}` }),
                ],
              }),
              invoice.dueDate
                ? new Paragraph({
                    children: [
                      new TextRun({ text: 'Due Date:', bold: true }),
                      new TextRun({ text: ` ${invoice.dueDate}` }),
                    ],
                  })
                : new Paragraph({ text: '' }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Status:', bold: true }),
                  new TextRun({ text: ` ${statusDisplay}` }),
                ],
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ]

    children.push(
      new Table({
        rows: metadataRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    )

    // Customer info section
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'CUSTOMER',
            bold: true,
            size: 26, // 13pt
          }),
        ],
        spacing: { before: 400, after: 200 },
        shading: {
          type: ShadingType.SOLID,
          color: 'F0F0F0',
          fill: 'F0F0F0',
        },
      })
    )

    children.push(
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'Name:', bold: true }),
                      new TextRun({ text: ` ${customerName}` }),
                    ],
                  }),
                ],
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: customerName })],
                  }),
                ],
                width: { size: 30, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
        margins: { top: 0, bottom: 200, left: 0, right: 0 },
      })
    )

    // Line items table
    const lineItemRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Description', bold: true })],
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: 'E0E0E0',
              fill: 'E0E0E0',
            },
            width: { size: 30, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Quantity', bold: true })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: 'E0E0E0',
              fill: 'E0E0E0',
            },
            width: { size: 10, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Unit Price', bold: true })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: 'E0E0E0',
              fill: 'E0E0E0',
            },
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Total', bold: true })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: 'E0E0E0',
              fill: 'E0E0E0',
            },
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ]

    invoice.items.forEach((item) => {
      const lineTotal = item.quantity * item.unitPrice + (item.tax || 0)

      lineItemRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: item.description || '' })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: item.quantity.toString() })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: item.unitPrice.toFixed(2) })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: lineTotal.toFixed(2) })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        })
      )
    })

    children.push(
      new Table({
        rows: lineItemRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: '333333' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '333333' },
          left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        },
        margins: { top: 0, bottom: 400, left: 0, right: 0 },
      })
    )

    // Totals section
    const totalsRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Subtotal:', bold: true })],
              }),
            ],
            width: { size: 70, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: invoice.subtotal.toFixed(2), bold: true })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
            width: { size: 30, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Tax:', bold: true })],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: (invoice.tax || 0).toFixed(2), bold: true })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'TOTAL:',
                    bold: true,
                    size: 28, // 14pt
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: invoice.total.toFixed(2),
                    bold: true,
                    size: 28, // 14pt
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        ],
      }),
    ]

    if (invoice.amountReceived !== undefined && invoice.amountReceived > 0) {
      totalsRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Amount Received:', bold: true })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: invoice.amountReceived.toFixed(2), bold: true })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        })
      )

      totalsRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Pending:', bold: true })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: ((invoice.total || 0) - invoice.amountReceived).toFixed(2),
                      bold: true,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        })
      )
    }

    children.push(
      new Table({
        rows: totalsRows,
        width: { size: 50, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.RIGHT,
        margins: { top: 0, bottom: 400, left: 0, right: 0 },
      })
    )

    // Notes section
    if (invoice.notes) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Notes:',
              bold: true,
            }),
          ],
          spacing: { before: 400 },
        })
      )
      children.push(
        new Paragraph({
          children: [new TextRun({ text: invoice.notes })],
          spacing: { after: 400 },
        })
      )
    }

    // Footer with signature and seal
    const footerTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                signatureBuffer
                  ? new Paragraph({
                      children: [
                        new ImageRun({
                          data: signatureBuffer,
                          transformation: {
                            width: 150,
                            height: 60,
                          },
                        }),
                      ],
                    })
                  : new Paragraph({ text: '' }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Authorized By:',
                      size: 20, // 10pt
                    }),
                  ],
                  spacing: { before: 200 },
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 400, bottom: 0, left: 0, right: 0 },
            }),
            new TableCell({
              children: [
                sealBuffer
                  ? new Paragraph({
                      children: [
                        new ImageRun({
                          data: sealBuffer,
                          transformation: {
                            width: 120,
                            height: 80,
                          },
                        }),
                      ],
                      alignment: AlignmentType.RIGHT,
                    })
                  : new Paragraph({ text: '' }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Date: ${invoice.date}`,
                      size: 20, // 10pt
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 200 },
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 400, bottom: 0, left: 0, right: 0 },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    })

    children.push(footerTable)

    // Create document with proper margins
    const doc = new Document({
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
    })

    // Generate DOCX file as buffer
    const buffer = await Packer.toBuffer(doc)
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
  }

  downloadDocx(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename.endsWith('.docx') ? filename : `${filename}.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

// Export a singleton instance
export const docxRenderer = new ClientSideDOCXRenderer()
