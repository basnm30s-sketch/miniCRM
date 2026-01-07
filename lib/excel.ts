/**
 * Excel Renderer abstraction layer
 * Provides Excel export functionality for invoices and quotes with formatting, images, and formulas
 */

import { Quote, AdminSettings } from '@/lib/types'
import type { Invoice } from '@/lib/storage'
import ExcelJS from 'exceljs'
import { getFileUrl, loadBrandingUrls } from './api-client'

export interface ExcelRenderer {
  /**
   * Render a quote to Excel blob
   * @param quote - Quote object
   * @param adminSettings - Admin company settings
   * @returns Promise<Blob> - Excel file as blob
   */
  renderQuoteToExcel(quote: Quote, adminSettings: AdminSettings): Promise<Blob>

  /**
   * Render an invoice to Excel blob
   * @param invoice - Invoice object
   * @param adminSettings - Admin company settings
   * @param customerName - Customer name for display
   * @returns Promise<Blob> - Excel file as blob
   */
  renderInvoiceToExcel(invoice: Invoice, adminSettings: AdminSettings, customerName: string): Promise<Blob>

  /**
   * Trigger download of an Excel blob in the browser
   * @param blob - Excel blob
   * @param filename - Filename for download (e.g., "quote-AAT-20251118-0001.xlsx")
   */
  downloadExcel(blob: Blob, filename: string): void
}

/**
 * Client-side Excel renderer using ExcelJS library
 * Creates formatted Excel files with proper structure, formatting, images, and formulas
 */
export class ClientSideExcelRenderer implements ExcelRenderer {
  /**
   * Helper to load image from URL and convert to buffer
   */
  private async loadImageAsBuffer(imageUrl: string | null): Promise<ExcelJS.Image | null> {
    if (!imageUrl) return null

    try {
      let arrayBuffer: ArrayBuffer
      let extension: 'png' | 'jpeg' | 'gif' | 'webp' = 'png'

      // Handle base64 data URLs
      if (imageUrl.startsWith('data:')) {
        const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/)
        if (base64Match) {
          extension = (base64Match[1] === 'jpg' ? 'jpeg' : base64Match[1]) as 'png' | 'jpeg' | 'gif' | 'webp'
          const base64Data = base64Match[2]
          // Convert base64 to ArrayBuffer
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
        // Handle regular URLs (API or http/https)
        let url = imageUrl
        if (!imageUrl.startsWith('http')) {
          url = getFileUrl(imageUrl) || imageUrl
        }

        const response = await fetch(url)
        if (!response.ok) return null

        arrayBuffer = await response.arrayBuffer()

        // Determine image type from URL
        const urlLower = url.toLowerCase()
        if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) extension = 'jpeg'
        else if (urlLower.includes('.gif')) extension = 'gif'
        else if (urlLower.includes('.webp')) extension = 'webp'
        // Default to png if not specified
      }

      // Use Uint8Array for browser compatibility (ExcelJS accepts both Buffer and Uint8Array)
      const buffer = typeof Buffer !== 'undefined' ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer)

      return {
        buffer,
        extension,
      }
    } catch (error) {
      console.error('Failed to load image:', error)
      return null
    }
  }

  /**
   * Helper to apply cell formatting
   */
  private applyCellStyle(cell: ExcelJS.Cell, style: {
    bold?: boolean
    fontSize?: number
    fill?: { type: 'pattern'; pattern: 'solid'; fgColor: { argb: string } }
    alignment?: { horizontal?: 'left' | 'center' | 'right'; vertical?: 'top' | 'middle' | 'bottom' }
    border?: Partial<ExcelJS.Borders>
    numFmt?: string
  }) {
    if (style.bold !== undefined) cell.font = { ...cell.font, bold: style.bold }
    if (style.fontSize !== undefined) cell.font = { ...cell.font, size: style.fontSize }
    if (style.fill) cell.fill = style.fill
    if (style.alignment) cell.alignment = { ...cell.alignment, ...style.alignment }
    if (style.border) cell.border = { ...cell.border, ...style.border }
    if (style.numFmt) cell.numFmt = style.numFmt
  }

  async renderQuoteToExcel(quote: Quote, adminSettings: AdminSettings): Promise<Blob> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Quote')

    let currentRow = 1

    // Load branding URLs from fixed file locations
    const brandingUrls = await loadBrandingUrls()
    
    // Load images
    const logoImage = await this.loadImageAsBuffer(brandingUrls.logoUrl)
    const sealImage = await this.loadImageAsBuffer(brandingUrls.sealUrl)
    const signatureImage = await this.loadImageAsBuffer(brandingUrls.signatureUrl)

    // Header section with logo
    if (logoImage) {
      const logoId = workbook.addImage({
        buffer: logoImage.buffer,
        extension: logoImage.extension,
      })
      worksheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 250, height: 80 },
      })
    }

    // Company name (row 1, column 2 if logo exists, else column 1)
    const companyNameCol = logoImage ? 2 : 1
    worksheet.getCell(currentRow, companyNameCol).value = adminSettings.companyName
    this.applyCellStyle(worksheet.getCell(currentRow, companyNameCol), {
      bold: true,
      fontSize: 14,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    if (adminSettings.address) {
      worksheet.getCell(currentRow, companyNameCol).value = adminSettings.address
      this.applyCellStyle(worksheet.getCell(currentRow, companyNameCol), {
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      currentRow++
    }
    if (adminSettings.vatNumber) {
      worksheet.getCell(currentRow, companyNameCol).value = `VAT: ${adminSettings.vatNumber}`
      this.applyCellStyle(worksheet.getCell(currentRow, companyNameCol), {
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      currentRow++
    }

    currentRow++ // Empty row

    // Title
    worksheet.getCell(currentRow, 1).value = 'QUOTATION'
    this.applyCellStyle(worksheet.getCell(currentRow, 1), {
      bold: true,
      fontSize: 16,
      alignment: { horizontal: 'center' },
    })
    worksheet.mergeCells(currentRow, 1, currentRow, 6)
    currentRow++

    // Document metadata
    currentRow++ // Empty row
    worksheet.getCell(currentRow, 1).value = 'Quote #:'
    worksheet.getCell(currentRow, 2).value = quote.number
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 2), {
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    worksheet.getCell(currentRow, 1).value = 'Date:'
    worksheet.getCell(currentRow, 2).value = quote.date
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 2), {
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    if (quote.validUntil) {
      worksheet.getCell(currentRow, 1).value = 'Valid Up To:'
      worksheet.getCell(currentRow, 2).value = quote.validUntil
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
        bold: true,
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      this.applyCellStyle(worksheet.getCell(currentRow, 2), {
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      currentRow++
    }

    worksheet.getCell(currentRow, 1).value = 'Currency:'
    worksheet.getCell(currentRow, 2).value = quote.currency || 'AED'
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 2), {
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    // Customer info section
    currentRow++ // Empty row
    worksheet.getCell(currentRow, 1).value = 'CUSTOMER'
    this.applyCellStyle(worksheet.getCell(currentRow, 1), {
      bold: true,
      fontSize: 12,
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    worksheet.getCell(currentRow, 1).value = 'Name:'
    worksheet.getCell(currentRow, 2).value = quote.customer.name
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 2), {
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    if (quote.customer.company) {
      worksheet.getCell(currentRow, 1).value = 'Company:'
      worksheet.getCell(currentRow, 2).value = quote.customer.company
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
        bold: true,
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      this.applyCellStyle(worksheet.getCell(currentRow, 2), {
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      currentRow++
    }
    if (quote.customer.address) {
      worksheet.getCell(currentRow, 1).value = 'Address:'
      worksheet.getCell(currentRow, 2).value = quote.customer.address
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
        bold: true,
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      this.applyCellStyle(worksheet.getCell(currentRow, 2), {
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      currentRow++
    }
    if (quote.customer.email) {
      worksheet.getCell(currentRow, 1).value = 'Email:'
      worksheet.getCell(currentRow, 2).value = quote.customer.email
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
        bold: true,
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      this.applyCellStyle(worksheet.getCell(currentRow, 2), {
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      currentRow++
    }
    if (quote.customer.phone) {
      worksheet.getCell(currentRow, 1).value = 'Phone:'
      worksheet.getCell(currentRow, 2).value = quote.customer.phone
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
        bold: true,
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      this.applyCellStyle(worksheet.getCell(currentRow, 2), {
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      currentRow++
    }

    // Line items table header
    currentRow++ // Empty row
    const headerRow = currentRow
    worksheet.getCell(currentRow, 1).value = 'Description'
    worksheet.getCell(currentRow, 2).value = 'Quantity'
    worksheet.getCell(currentRow, 3).value = 'Unit Price'
    worksheet.getCell(currentRow, 4).value = 'Tax %'
    worksheet.getCell(currentRow, 5).value = 'Tax Amount'
    worksheet.getCell(currentRow, 6).value = 'Total'

    // Format header row
    for (let col = 1; col <= 6; col++) {
      const cell = worksheet.getCell(currentRow, col)
      this.applyCellStyle(cell, {
        bold: true,
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } },
        alignment: { horizontal: col === 1 ? 'left' : 'right', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      })
    }
    currentRow++

    // Line items with formulas
    const firstItemRow = currentRow
    quote.items.forEach((item, index) => {
      const row = currentRow + index
      const qtyCol = 2
      const unitPriceCol = 3
      const taxPercentCol = 4
      const taxAmountCol = 5
      const totalCol = 6

      worksheet.getCell(row, 1).value = item.vehicleTypeLabel || ''
      worksheet.getCell(row, qtyCol).value = item.quantity || 0
      worksheet.getCell(row, unitPriceCol).value = item.unitPrice || 0
      worksheet.getCell(row, taxPercentCol).value = item.taxPercent || 0

      // Formula for tax amount: (Quantity * Unit Price * Tax %) / 100
      worksheet.getCell(row, taxAmountCol).value = {
        formula: `(${this.getCellRef(row, qtyCol)}*${this.getCellRef(row, unitPriceCol)}*${this.getCellRef(row, taxPercentCol)})/100`,
      }

      // Formula for total: (Quantity * Unit Price) + Tax Amount
      worksheet.getCell(row, totalCol).value = {
        formula: `${this.getCellRef(row, qtyCol)}*${this.getCellRef(row, unitPriceCol)}+${this.getCellRef(row, taxAmountCol)}`,
      }

      // Format number cells and set alignment
      worksheet.getCell(row, 1).alignment = { horizontal: 'left', vertical: 'middle' } // Description
      worksheet.getCell(row, qtyCol).numFmt = '#,##0'
      worksheet.getCell(row, qtyCol).alignment = { horizontal: 'right', vertical: 'middle' }
      worksheet.getCell(row, unitPriceCol).numFmt = '#,##0.00'
      worksheet.getCell(row, unitPriceCol).alignment = { horizontal: 'right', vertical: 'middle' }
      worksheet.getCell(row, taxPercentCol).numFmt = '0.00'
      worksheet.getCell(row, taxPercentCol).alignment = { horizontal: 'right', vertical: 'middle' }
      worksheet.getCell(row, taxAmountCol).numFmt = '#,##0.00'
      worksheet.getCell(row, taxAmountCol).alignment = { horizontal: 'right', vertical: 'middle' }
      worksheet.getCell(row, totalCol).numFmt = '#,##0.00'
      worksheet.getCell(row, totalCol).alignment = { horizontal: 'right', vertical: 'middle' }

      // Apply borders
      for (let col = 1; col <= 6; col++) {
        const cell = worksheet.getCell(row, col)
        this.applyCellStyle(cell, {
          border: {
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          },
        })
      }
    })
    currentRow += quote.items.length

    // Totals section
    currentRow++ // Empty row
    const lastItemRow = currentRow - 1

    const taxRow = currentRow
    worksheet.getCell(currentRow, 1).value = 'Total Tax:'
    worksheet.getCell(currentRow, 6).value = {
      formula: `SUM(${this.getCellRef(firstItemRow, 5)}:${this.getCellRef(lastItemRow, 5)})`,
    }
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 6), {
      numFmt: '#,##0.00',
      bold: true,
      alignment: { horizontal: 'right', vertical: 'middle' },
    })
    currentRow++

    const totalRow = currentRow
    worksheet.getCell(currentRow, 1).value = 'TOTAL:'
    worksheet.getCell(currentRow, 6).value = {
      formula: `SUM(${this.getCellRef(firstItemRow, 6)}:${this.getCellRef(lastItemRow, 6)})`,
    }
    this.applyCellStyle(worksheet.getCell(currentRow, 1), {
      bold: true,
      fontSize: 12,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 6), {
      numFmt: '#,##0.00',
      bold: true,
      fontSize: 12,
      alignment: { horizontal: 'right', vertical: 'middle' },
    })
    currentRow++

    // Notes section
    if (quote.notes) {
      currentRow++ // Empty row
      worksheet.getCell(currentRow, 1).value = 'Notes:'
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { bold: true })
      currentRow++
      worksheet.getCell(currentRow, 1).value = quote.notes
      worksheet.mergeCells(currentRow, 1, currentRow, 6)
      currentRow++
    }

    // Terms section
    if (quote.terms || adminSettings.defaultTerms) {
      currentRow++ // Empty row
      worksheet.getCell(currentRow, 1).value = 'Terms and Conditions:'
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { bold: true })
      currentRow++
      const terms = quote.terms || adminSettings.defaultTerms || ''
      terms.split('\n').forEach((line) => {
        worksheet.getCell(currentRow, 1).value = line
        worksheet.mergeCells(currentRow, 1, currentRow, 6)
        currentRow++
      })
    }

    // Footer with signature and seal
    currentRow += 2 // Extra space
    const footerRow = currentRow

    // Signature
    if (signatureImage) {
      const sigId = workbook.addImage({
        buffer: signatureImage.buffer,
        extension: signatureImage.extension,
      })
      worksheet.addImage(sigId, {
        tl: { col: 0, row: footerRow - 1 },
        ext: { width: 180, height: 80 },
      })
    }

    worksheet.getCell(footerRow, 1).value = 'Authorized By:'
    this.applyCellStyle(worksheet.getCell(footerRow, 1), { fontSize: 10 })
    if (signatureImage) {
      worksheet.getRow(footerRow).height = 60
    }

    // Seal (right side)
    if (sealImage) {
      const sealId = workbook.addImage({
        buffer: sealImage.buffer,
        extension: sealImage.extension,
      })
      worksheet.addImage(sealId, {
        tl: { col: 4, row: footerRow - 1 },
        ext: { width: 150, height: 100 },
      })
    }

    worksheet.getCell(footerRow + 2, 5).value = `Date: ${quote.date}`
    this.applyCellStyle(worksheet.getCell(footerRow + 2, 5), {
      alignment: { horizontal: 'right' },
      fontSize: 10,
    })

    // Set column widths
    worksheet.getColumn(1).width = 30 // Description
    worksheet.getColumn(2).width = 10 // Quantity
    worksheet.getColumn(3).width = 12 // Unit Price
    worksheet.getColumn(4).width = 10 // Tax %
    worksheet.getColumn(5).width = 12 // Tax Amount
    worksheet.getColumn(6).width = 12 // Total

    // Generate Excel file as buffer
    const buffer = await workbook.xlsx.writeBuffer()
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  async renderInvoiceToExcel(invoice: Invoice, adminSettings: AdminSettings, customerName: string): Promise<Blob> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Invoice')

    let currentRow = 1

    // Load branding URLs from fixed file locations
    const brandingUrls = await loadBrandingUrls()
    
    // Load images
    const logoImage = await this.loadImageAsBuffer(brandingUrls.logoUrl)
    const sealImage = await this.loadImageAsBuffer(brandingUrls.sealUrl)
    const signatureImage = await this.loadImageAsBuffer(brandingUrls.signatureUrl)

    // Header section with logo
    if (logoImage) {
      const logoId = workbook.addImage({
        buffer: logoImage.buffer,
        extension: logoImage.extension,
      })
      worksheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 250, height: 80 },
      })
    }

    // Company name (row 1, column 2 if logo exists, else column 1)
    const companyNameCol = logoImage ? 2 : 1
    worksheet.getCell(currentRow, companyNameCol).value = adminSettings.companyName
    this.applyCellStyle(worksheet.getCell(currentRow, companyNameCol), {
      bold: true,
      fontSize: 14,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    if (adminSettings.address) {
      worksheet.getCell(currentRow, companyNameCol).value = adminSettings.address
      this.applyCellStyle(worksheet.getCell(currentRow, companyNameCol), {
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      currentRow++
    }
    if (adminSettings.vatNumber) {
      worksheet.getCell(currentRow, companyNameCol).value = `VAT: ${adminSettings.vatNumber}`
      this.applyCellStyle(worksheet.getCell(currentRow, companyNameCol), {
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      currentRow++
    }

    currentRow++ // Empty row

    // Title
    worksheet.getCell(currentRow, 1).value = 'INVOICE'
    this.applyCellStyle(worksheet.getCell(currentRow, 1), {
      bold: true,
      fontSize: 16,
      alignment: { horizontal: 'center' },
    })
    worksheet.mergeCells(currentRow, 1, currentRow, 4)
    currentRow++

    // Document metadata
    currentRow++ // Empty row
    worksheet.getCell(currentRow, 1).value = 'Invoice #:'
    worksheet.getCell(currentRow, 2).value = invoice.number
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 2), {
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    worksheet.getCell(currentRow, 1).value = 'Date:'
    worksheet.getCell(currentRow, 2).value = invoice.date
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 2), {
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    if (invoice.dueDate) {
      worksheet.getCell(currentRow, 1).value = 'Due Date:'
      worksheet.getCell(currentRow, 2).value = invoice.dueDate
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
        bold: true,
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      this.applyCellStyle(worksheet.getCell(currentRow, 2), {
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      currentRow++
    }

    const statusDisplay =
      invoice.status === 'payment_received'
        ? 'Payment Received'
        : invoice.status === 'invoice_sent'
          ? 'Invoice Sent'
          : invoice.status === 'draft'
            ? 'Draft'
            : invoice.status || 'Draft'
    worksheet.getCell(currentRow, 1).value = 'Status:'
    worksheet.getCell(currentRow, 2).value = statusDisplay
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 2), {
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    // Customer info section
    currentRow++ // Empty row
    worksheet.getCell(currentRow, 1).value = 'CUSTOMER'
    this.applyCellStyle(worksheet.getCell(currentRow, 1), {
      bold: true,
      fontSize: 12,
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    worksheet.getCell(currentRow, 1).value = 'Name:'
    worksheet.getCell(currentRow, 2).value = customerName
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 2), {
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    // Line items table header
    currentRow++ // Empty row
    const headerRow = currentRow
    worksheet.getCell(currentRow, 1).value = 'Description'
    worksheet.getCell(currentRow, 2).value = 'Quantity'
    worksheet.getCell(currentRow, 3).value = 'Unit Price'
    worksheet.getCell(currentRow, 4).value = 'Total'

    // Format header row
    for (let col = 1; col <= 4; col++) {
      const cell = worksheet.getCell(currentRow, col)
      this.applyCellStyle(cell, {
        bold: true,
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } },
        alignment: { horizontal: col === 1 ? 'left' : 'right', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      })
    }
    currentRow++

    // Line items with formulas
    const firstItemRow = currentRow
    const hasItemLevelTax = invoice.items.some((item) => item.tax && item.tax > 0)
    
    invoice.items.forEach((item, index) => {
      const row = currentRow + index
      const qtyCol = 2
      const unitPriceCol = 3
      const totalCol = 4

      worksheet.getCell(row, 1).value = item.description || ''
      worksheet.getCell(row, qtyCol).value = item.quantity || 0
      worksheet.getCell(row, unitPriceCol).value = item.unitPrice || 0

      // Formula for total: (Quantity * Unit Price) + Tax (if tax is per item)
      // If tax is per item, use: Quantity * Unit Price + Tax
      // Otherwise, use: Quantity * Unit Price (tax is added at document level)
      if (item.tax && item.tax > 0) {
        worksheet.getCell(row, totalCol).value = {
          formula: `${this.getCellRef(row, qtyCol)}*${this.getCellRef(row, unitPriceCol)}+${item.tax}`,
        }
      } else {
        worksheet.getCell(row, totalCol).value = {
          formula: `${this.getCellRef(row, qtyCol)}*${this.getCellRef(row, unitPriceCol)}`,
        }
      }

      // Format number cells and set alignment
      worksheet.getCell(row, 1).alignment = { horizontal: 'left', vertical: 'middle' } // Description
      worksheet.getCell(row, qtyCol).numFmt = '#,##0'
      worksheet.getCell(row, qtyCol).alignment = { horizontal: 'right', vertical: 'middle' }
      worksheet.getCell(row, unitPriceCol).numFmt = '#,##0.00'
      worksheet.getCell(row, unitPriceCol).alignment = { horizontal: 'right', vertical: 'middle' }
      worksheet.getCell(row, totalCol).numFmt = '#,##0.00'
      worksheet.getCell(row, totalCol).alignment = { horizontal: 'right', vertical: 'middle' }

      // Apply borders
      for (let col = 1; col <= 4; col++) {
        const cell = worksheet.getCell(row, col)
        this.applyCellStyle(cell, {
          border: {
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          },
        })
      }
    })
    currentRow += invoice.items.length

    // Totals section
    currentRow++ // Empty row
    const lastItemRow = currentRow - 1
    
    // Calculate subtotal for internal use (for tax calculation)
    const qtyRange = `${this.getCellRef(firstItemRow, 2)}:${this.getCellRef(lastItemRow, 2)}`
    const priceRange = `${this.getCellRef(firstItemRow, 3)}:${this.getCellRef(lastItemRow, 3)}`

    const taxRow = currentRow
    worksheet.getCell(currentRow, 1).value = 'Tax:'
    // Tax can be document-level or sum of item-level taxes
    if (hasItemLevelTax) {
      // Sum item-level taxes (calculate from item totals - subtotals)
      const totalRange = `${this.getCellRef(firstItemRow, 4)}:${this.getCellRef(lastItemRow, 4)}`
      worksheet.getCell(currentRow, 4).value = {
        formula: `SUM(${totalRange})-SUMPRODUCT(${qtyRange},${priceRange})`,
      }
    } else {
      // Document-level tax
      worksheet.getCell(currentRow, 4).value = invoice.tax || 0
    }
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 4), {
      numFmt: '#,##0.00',
      bold: true,
      alignment: { horizontal: 'right', vertical: 'middle' },
    })
    currentRow++

    const totalRow = currentRow
    worksheet.getCell(currentRow, 1).value = 'TOTAL:'
    worksheet.getCell(currentRow, 4).value = {
      formula: `SUMPRODUCT(${qtyRange},${priceRange})+${this.getCellRef(taxRow, 4)}`,
    }
    this.applyCellStyle(worksheet.getCell(currentRow, 1), {
      bold: true,
      fontSize: 12,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 4), {
      numFmt: '#,##0.00',
      bold: true,
      fontSize: 12,
      alignment: { horizontal: 'right', vertical: 'middle' },
    })
    currentRow++

    if (invoice.amountReceived !== undefined && invoice.amountReceived > 0) {
      worksheet.getCell(currentRow, 1).value = 'Amount Received:'
      worksheet.getCell(currentRow, 4).value = invoice.amountReceived
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
        bold: true,
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      this.applyCellStyle(worksheet.getCell(currentRow, 4), {
        numFmt: '#,##0.00',
        bold: true,
        alignment: { horizontal: 'right', vertical: 'middle' },
      })
      currentRow++

      worksheet.getCell(currentRow, 1).value = 'Pending:'
      worksheet.getCell(currentRow, 4).value = {
        formula: `${this.getCellRef(totalRow, 4)}-${this.getCellRef(currentRow - 1, 4)}`,
      }
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
        bold: true,
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      this.applyCellStyle(worksheet.getCell(currentRow, 4), {
        numFmt: '#,##0.00',
        bold: true,
        alignment: { horizontal: 'right', vertical: 'middle' },
      })
      currentRow++
    }

    // Notes section
    if (invoice.notes) {
      currentRow++ // Empty row
      worksheet.getCell(currentRow, 1).value = 'Notes:'
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { bold: true })
      currentRow++
      worksheet.getCell(currentRow, 1).value = invoice.notes
      worksheet.mergeCells(currentRow, 1, currentRow, 4)
      currentRow++
    }

    // Footer with signature and seal
    currentRow += 2 // Extra space
    const footerRow = currentRow

    // Signature
    if (signatureImage) {
      const sigId = workbook.addImage({
        buffer: signatureImage.buffer,
        extension: signatureImage.extension,
      })
      worksheet.addImage(sigId, {
        tl: { col: 0, row: footerRow - 1 },
        ext: { width: 180, height: 80 },
      })
    }

    worksheet.getCell(footerRow, 1).value = 'Authorized By:'
    this.applyCellStyle(worksheet.getCell(footerRow, 1), { fontSize: 10 })
    if (signatureImage) {
      worksheet.getRow(footerRow).height = 60
    }

    // Seal (right side)
    if (sealImage) {
      const sealId = workbook.addImage({
        buffer: sealImage.buffer,
        extension: sealImage.extension,
      })
      worksheet.addImage(sealId, {
        tl: { col: 3, row: footerRow - 1 },
        ext: { width: 150, height: 100 },
      })
    }

    worksheet.getCell(footerRow + 2, 4).value = `Date: ${invoice.date}`
    this.applyCellStyle(worksheet.getCell(footerRow + 2, 4), {
      alignment: { horizontal: 'right' },
      fontSize: 10,
    })

    // Set column widths
    worksheet.getColumn(1).width = 30 // Description
    worksheet.getColumn(2).width = 10 // Quantity
    worksheet.getColumn(3).width = 12 // Unit Price
    worksheet.getColumn(4).width = 12 // Total

    // Generate Excel file as buffer
    const buffer = await workbook.xlsx.writeBuffer()
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  /**
   * Helper to get Excel cell reference (1-based row/col to A1 notation)
   * Converts 1-based row/column to Excel A1 notation (e.g., row=1, col=1 -> "A1")
   */
  private getCellRef(row: number, col: number): string {
    // ExcelJS uses 0-based indexing internally, but we're using 1-based
    // Convert column number to letter (1=A, 2=B, etc.)
    let colLetter = ''
    let colNum = col
    while (colNum > 0) {
      const remainder = (colNum - 1) % 26
      colLetter = String.fromCharCode(65 + remainder) + colLetter
      colNum = Math.floor((colNum - 1) / 26)
    }
    return `${colLetter}${row}`
  }

  downloadExcel(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

// Export a singleton instance
export const excelRenderer = new ClientSideExcelRenderer()
