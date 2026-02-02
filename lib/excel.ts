/**
 * Excel Renderer abstraction layer
 * Provides Excel export functionality for invoices and quotes with formatting, images, and formulas
 */

import { Quote, AdminSettings, PurchaseOrder } from '@/lib/types'
import {
  DEFAULT_INVOICE_COLUMNS,
  DEFAULT_PO_COLUMNS,
  DEFAULT_QUOTE_COLUMNS,
} from '@/lib/doc-generator/line-item-columns'
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
  renderQuoteToExcel(
    quote: Quote,
    adminSettings: AdminSettings,
    options?: { visibleColumns?: Record<string, boolean> }
  ): Promise<Blob>

  /**
   * Render an invoice to Excel blob
   * @param invoice - Invoice object
   * @param adminSettings - Admin company settings
   * @param customerName - Customer name for display
   * @returns Promise<Blob> - Excel file as blob
   */
  renderInvoiceToExcel(
    invoice: Invoice,
    adminSettings: AdminSettings,
    customerName: string,
    options?: { visibleColumns?: Record<string, boolean> }
  ): Promise<Blob>

  /**
   * Render a purchase order to Excel blob
   * @param po - Purchase Order object
   * @param adminSettings - Admin company settings
   * @param vendorName - Vendor name for display
   * @returns Promise<Blob> - Excel file as blob
   */
  renderPurchaseOrderToExcel(
    po: PurchaseOrder,
    adminSettings: AdminSettings,
    vendorName: string,
    options?: { visibleColumns?: Record<string, boolean> }
  ): Promise<Blob>

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

  private async getImageDimensions(
    image: ExcelJS.Image
  ): Promise<{ width: number; height: number } | null> {
    try {
      const mimeType = image.extension === 'jpeg' ? 'image/jpeg' : `image/${image.extension}`
      const blob = new Blob([image.buffer], { type: mimeType })

      if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(blob)
        const size = { width: bitmap.width, height: bitmap.height }
        if (typeof bitmap.close === 'function') {
          bitmap.close()
        }
        return size
      }

      return await new Promise((resolve) => {
        const img = new Image()
        const url = URL.createObjectURL(blob)
        img.onload = () => {
          URL.revokeObjectURL(url)
          resolve({ width: img.width, height: img.height })
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          resolve(null)
        }
        img.src = url
      })
    } catch (error) {
      console.error('Failed to read image dimensions:', error)
      return null
    }
  }

  private async getScaledImageSize(
    image: ExcelJS.Image,
    maxWidth: number,
    maxHeight: number
  ): Promise<{ width: number; height: number }> {
    const size = await this.getImageDimensions(image)
    if (!size || !size.width || !size.height) {
      return { width: maxWidth, height: maxHeight }
    }

    const scale = Math.min(maxWidth / size.width, maxHeight / size.height, 1)
    return {
      width: Math.round(size.width * scale),
      height: Math.round(size.height * scale),
    }
  }

  private formatRentalBasis(basis?: string): string {
    if (!basis) return '-'
    if (basis === 'hourly') return 'Hourly'
    if (basis === 'monthly') return 'Monthly'
    return String(basis)
  }

  private getGross(item: any): number {
    if (typeof item.grossAmount === 'number') return item.grossAmount
    return (item.quantity || 0) * (item.unitPrice || 0)
  }

  private getTaxAmount(item: any, gross: number): number {
    if (typeof item.lineTaxAmount === 'number') return item.lineTaxAmount
    if (typeof item.tax === 'number') return item.tax
    const pct = typeof item.taxPercent === 'number' ? item.taxPercent : 0
    return gross * (pct / 100)
  }

  private getTaxPercent(item: any, gross: number): number {
    if (typeof item.taxPercent === 'number') return item.taxPercent
    const taxAmount = this.getTaxAmount(item, gross)
    if (!gross || gross <= 0) return 0
    return (taxAmount / gross) * 100
  }

  private getNet(item: any, gross: number): number {
    if (typeof item.lineTotal === 'number') return item.lineTotal
    if (typeof item.total === 'number') return item.total
    return gross + this.getTaxAmount(item, gross)
  }

  private buildLineItemColumns(
    variant: 'quote' | 'invoice' | 'purchaseOrder',
    visibleColumns: Record<string, boolean>
  ) {
    const columns = [
      {
        key: 'serialNumber',
        label: '#',
        width: 5,
        align: 'center',
        value: (_item: any, index: number) => index + 1,
      },
      {
        key: 'vehicleNumber',
        label: 'Vehicle',
        width: 14,
        align: 'left',
        value: (item: any) => item.vehicleNumber || item.vehicleTypeLabel || '-',
      },
      {
        key: 'vehicleType',
        label: 'Type',
        width: 12,
        align: 'left',
        value: (item: any) => item.vehicleType || '-',
      },
      {
        key: 'makeModel',
        label: 'Make/Model',
        width: 16,
        align: 'left',
        value: (item: any) =>
          item.make && item.model ? `${item.make} ${item.model}` : item.make || item.model || '-',
      },
      {
        key: 'year',
        label: 'Year',
        width: 8,
        align: 'center',
        value: (item: any) => item.year ?? '-',
      },
      {
        key: 'basePrice',
        label: 'Base Price',
        width: 12,
        align: 'right',
        numFmt: '#,##0.00',
        value: (item: any) => (typeof item.basePrice === 'number' ? item.basePrice : null),
      },
      {
        key: 'description',
        label: 'Description',
        width: 22,
        align: 'left',
        value: (item: any) => item.description || item.vehicleTypeLabel || '-',
      },
      {
        key: 'rentalBasis',
        label: 'Basis',
        width: 12,
        align: 'center',
        value: (item: any) => this.formatRentalBasis(item.rentalBasis),
      },
      {
        key: 'quantity',
        label: 'Qty',
        width: 8,
        align: 'right',
        numFmt: '#,##0',
        value: (item: any) => item.quantity || 0,
      },
      {
        key: 'rate',
        label: 'Rate',
        width: 12,
        align: 'right',
        numFmt: '#,##0.00',
        value: (item: any) => item.unitPrice || 0,
      },
      {
        key: 'grossAmount',
        label: 'Gross',
        width: 12,
        align: 'right',
        numFmt: '#,##0.00',
        value: (_item: any, _index: number, ctx: any) => ctx.gross,
      },
      {
        key: 'tax',
        label: 'Tax',
        width: 8,
        align: 'right',
        numFmt: '0.00',
        value: (_item: any, _index: number, ctx: any) => ctx.taxPercent,
      },
      {
        key: 'netAmount',
        label: 'Net',
        width: 12,
        align: 'right',
        numFmt: '#,##0.00',
        value: (_item: any, _index: number, ctx: any) => ctx.net,
      },
    ]

    if (variant === 'invoice') {
      columns.push({
        key: 'amountReceived',
        label: 'Received',
        width: 12,
        align: 'right',
        numFmt: '#,##0.00',
        value: (item: any) => item.amountReceived || 0,
      })
    }

    return columns.filter((col) => visibleColumns[col.key] !== false)
  }

  async renderQuoteToExcel(
    quote: Quote,
    adminSettings: AdminSettings,
    options?: { visibleColumns?: Record<string, boolean> }
  ): Promise<Blob> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Quote')

    let currentRow = 1

    // Load branding URLs from fixed file locations
    const brandingUrls = await loadBrandingUrls()
    
    // Load images
    const logoImage = await this.loadImageAsBuffer(brandingUrls.logoUrl)
    const sealImage = await this.loadImageAsBuffer(brandingUrls.sealUrl)
    const signatureImage = await this.loadImageAsBuffer(brandingUrls.signatureUrl)

    const visibleColumns = {
      ...DEFAULT_QUOTE_COLUMNS,
      ...(options?.visibleColumns || {}),
    }
    const columns = this.buildLineItemColumns('quote', visibleColumns)
    const tableColumnCount = Math.max(columns.length, 1)

    // Header section with logo
    if (logoImage) {
      const logoId = workbook.addImage({
        buffer: logoImage.buffer,
        extension: logoImage.extension,
      })
      const logoSize = await this.getScaledImageSize(logoImage, 250, 80)
      worksheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: logoSize,
      })

      const logoRowSpan = Math.max(1, Math.ceil(logoSize.height / 20))
      currentRow = Math.max(currentRow, logoRowSpan + 1)
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
    worksheet.mergeCells(currentRow, 1, currentRow, tableColumnCount)
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
    columns.forEach((col, index) => {
      const cell = worksheet.getCell(currentRow, index + 1)
      cell.value = col.label
      this.applyCellStyle(cell, {
        bold: true,
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } },
        alignment: {
          horizontal: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left',
          vertical: 'middle',
        },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      })
    })
    currentRow++

    // Line items
    const firstItemRow = currentRow
    quote.items.forEach((item, index) => {
      const row = currentRow + index
      const gross = this.getGross(item)
      const taxPercent = this.getTaxPercent(item, gross)
      const net = this.getNet(item, gross)
      const ctx = { gross, taxPercent, net }

      columns.forEach((col, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1)
        cell.value = col.value(item, index, ctx)
        if (col.numFmt) cell.numFmt = col.numFmt
        cell.alignment = {
          horizontal: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left',
          vertical: 'middle',
        }
        this.applyCellStyle(cell, {
          border: {
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          },
        })
      })
    })
    currentRow += quote.items.length

    // Totals section
    currentRow++ // Empty row
    const lastItemRow = currentRow - 1

    const netColIndex = columns.findIndex((col) => col.key === 'netAmount') + 1
    const totalValueCol = netColIndex > 0 ? netColIndex : columns.length || 1
    const computedTotalTax =
      typeof quote.totalTax === 'number'
        ? quote.totalTax
        : quote.items.reduce((sum, item) => {
            const gross = this.getGross(item)
            return sum + this.getTaxAmount(item, gross)
          }, 0)
    const computedTotal =
      typeof quote.total === 'number'
        ? quote.total
        : quote.items.reduce((sum, item) => {
            const gross = this.getGross(item)
            return sum + this.getNet(item, gross)
          }, 0)

    const taxRow = currentRow
    worksheet.getCell(currentRow, 1).value = 'Total Tax:'
    worksheet.getCell(currentRow, totalValueCol).value = computedTotalTax
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, totalValueCol), {
      numFmt: '#,##0.00',
      bold: true,
      alignment: { horizontal: 'right', vertical: 'middle' },
    })
    currentRow++

    const totalRow = currentRow
    worksheet.getCell(currentRow, 1).value = 'TOTAL:'
    worksheet.getCell(currentRow, totalValueCol).value = computedTotal
    this.applyCellStyle(worksheet.getCell(currentRow, 1), {
      bold: true,
      fontSize: 12,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, totalValueCol), {
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
      worksheet.mergeCells(currentRow, 1, currentRow, tableColumnCount)
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
        worksheet.mergeCells(currentRow, 1, currentRow, tableColumnCount)
        currentRow++
      })
    }

    // Footer with signature and seal
    currentRow += 2 // Extra space
    const footerTextRow = currentRow
    const footerImageRow = footerTextRow + 1

    worksheet.getCell(footerTextRow, 1).value = 'Authorized By:'
    this.applyCellStyle(worksheet.getCell(footerTextRow, 1), { fontSize: 10 })

    worksheet.getCell(footerTextRow, tableColumnCount).value = `Date: ${quote.date}`
    this.applyCellStyle(worksheet.getCell(footerTextRow, tableColumnCount), {
      alignment: { horizontal: 'right' },
      fontSize: 10,
    })

    // Signature
    if (signatureImage) {
      const sigId = workbook.addImage({
        buffer: signatureImage.buffer,
        extension: signatureImage.extension,
      })
      worksheet.addImage(sigId, {
        tl: { col: 0, row: footerImageRow - 1 },
        ext: { width: 180, height: 80 },
      })
      worksheet.getRow(footerImageRow).height = 60
    }

    // Seal (right side)
    if (sealImage) {
      const sealId = workbook.addImage({
        buffer: sealImage.buffer,
        extension: sealImage.extension,
      })
      const sealColIndex = tableColumnCount > 4 ? tableColumnCount - 1 : tableColumnCount
      worksheet.addImage(sealId, {
        tl: { col: Math.max(sealColIndex - 1, 0), row: footerImageRow - 1 },
        ext: { width: 150, height: 100 },
      })
    }

    // Set column widths
    columns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width
    })

    // Generate Excel file as buffer
    const buffer = await workbook.xlsx.writeBuffer()
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  async renderInvoiceToExcel(
    invoice: Invoice,
    adminSettings: AdminSettings,
    customerName: string,
    options?: { visibleColumns?: Record<string, boolean> }
  ): Promise<Blob> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Invoice')

    let currentRow = 1

    // Load branding URLs from fixed file locations
    const brandingUrls = await loadBrandingUrls()
    
    // Load images
    const logoImage = await this.loadImageAsBuffer(brandingUrls.logoUrl)
    const sealImage = await this.loadImageAsBuffer(brandingUrls.sealUrl)
    const signatureImage = await this.loadImageAsBuffer(brandingUrls.signatureUrl)

    const visibleColumns = {
      ...DEFAULT_INVOICE_COLUMNS,
      ...(options?.visibleColumns || {}),
    }
    const columns = this.buildLineItemColumns('invoice', visibleColumns)
    const tableColumnCount = Math.max(columns.length, 1)

    // Header section with logo
    if (logoImage) {
      const logoId = workbook.addImage({
        buffer: logoImage.buffer,
        extension: logoImage.extension,
      })
      const logoSize = await this.getScaledImageSize(logoImage, 250, 80)
      worksheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: logoSize,
      })

      const logoRowSpan = Math.max(1, Math.ceil(logoSize.height / 20))
      currentRow = Math.max(currentRow, logoRowSpan + 1)
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
    worksheet.mergeCells(currentRow, 1, currentRow, tableColumnCount)
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
    columns.forEach((col, index) => {
      const cell = worksheet.getCell(currentRow, index + 1)
      cell.value = col.label
      this.applyCellStyle(cell, {
        bold: true,
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } },
        alignment: {
          horizontal: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left',
          vertical: 'middle',
        },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      })
    })
    currentRow++

    // Line items
    const firstItemRow = currentRow
    invoice.items.forEach((item, index) => {
      const row = currentRow + index
      const gross = this.getGross(item)
      const taxPercent = this.getTaxPercent(item, gross)
      const net = this.getNet(item, gross)
      const ctx = { gross, taxPercent, net }

      columns.forEach((col, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1)
        cell.value = col.value(item, index, ctx)
        if (col.numFmt) cell.numFmt = col.numFmt
        cell.alignment = {
          horizontal: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left',
          vertical: 'middle',
        }
        this.applyCellStyle(cell, {
          border: {
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          },
        })
      })
    })
    currentRow += invoice.items.length

    // Totals section
    currentRow++ // Empty row
    const netColIndex = columns.findIndex((col) => col.key === 'netAmount') + 1
    const totalValueCol = netColIndex > 0 ? netColIndex : columns.length || 1

    const taxRow = currentRow
    worksheet.getCell(currentRow, 1).value = 'Tax:'
    worksheet.getCell(currentRow, totalValueCol).value = invoice.tax || 0
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, totalValueCol), {
      numFmt: '#,##0.00',
      bold: true,
      alignment: { horizontal: 'right', vertical: 'middle' },
    })
    currentRow++

    const totalRow = currentRow
    worksheet.getCell(currentRow, 1).value = 'TOTAL:'
    worksheet.getCell(currentRow, totalValueCol).value = invoice.total || 0
    this.applyCellStyle(worksheet.getCell(currentRow, 1), {
      bold: true,
      fontSize: 12,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, totalValueCol), {
      numFmt: '#,##0.00',
      bold: true,
      fontSize: 12,
      alignment: { horizontal: 'right', vertical: 'middle' },
    })
    currentRow++

    if (invoice.amountReceived !== undefined && invoice.amountReceived > 0) {
      worksheet.getCell(currentRow, 1).value = 'Amount Received:'
      worksheet.getCell(currentRow, totalValueCol).value = invoice.amountReceived
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
        bold: true,
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      this.applyCellStyle(worksheet.getCell(currentRow, totalValueCol), {
        numFmt: '#,##0.00',
        bold: true,
        alignment: { horizontal: 'right', vertical: 'middle' },
      })
      currentRow++

      worksheet.getCell(currentRow, 1).value = 'Pending:'
      worksheet.getCell(currentRow, totalValueCol).value = {
        formula: `${this.getCellRef(totalRow, totalValueCol)}-${this.getCellRef(currentRow - 1, totalValueCol)}`,
      }
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
        bold: true,
        alignment: { horizontal: 'left', vertical: 'middle' },
      })
      this.applyCellStyle(worksheet.getCell(currentRow, totalValueCol), {
        numFmt: '#,##0.00',
        bold: true,
        alignment: { horizontal: 'right', vertical: 'middle' },
      })
      currentRow++
    }

    const invoiceDefaultTerms = adminSettings.defaultInvoiceTerms ?? adminSettings.defaultTerms

    // Terms section
    if (invoice.terms || invoiceDefaultTerms) {
      currentRow++ // Empty row
      worksheet.getCell(currentRow, 1).value = 'Terms and Conditions:'
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { bold: true })
      currentRow++

      const terms = invoice.terms || invoiceDefaultTerms || ''
      const termsText = terms
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/div>/gi, '\n')
        .replace(/<div[^>]*>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim()

      termsText.split('\n').forEach((line) => {
        if (!line.trim()) return
        worksheet.getCell(currentRow, 1).value = line.trim()
        worksheet.mergeCells(currentRow, 1, currentRow, tableColumnCount)
        currentRow++
      })
    }

    // Notes section
    if (invoice.notes) {
      currentRow++ // Empty row
      worksheet.getCell(currentRow, 1).value = 'Notes:'
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { bold: true })
      currentRow++
      worksheet.getCell(currentRow, 1).value = invoice.notes
      worksheet.mergeCells(currentRow, 1, currentRow, tableColumnCount)
      currentRow++
    }

    // Footer with signature and seal
    currentRow += 2 // Extra space
    const footerTextRow = currentRow
    const footerImageRow = footerTextRow + 1

    worksheet.getCell(footerTextRow, 1).value = 'Authorized By:'
    this.applyCellStyle(worksheet.getCell(footerTextRow, 1), { fontSize: 10 })

    worksheet.getCell(footerTextRow, tableColumnCount).value = `Date: ${invoice.date}`
    this.applyCellStyle(worksheet.getCell(footerTextRow, tableColumnCount), {
      alignment: { horizontal: 'right' },
      fontSize: 10,
    })

    // Signature
    if (signatureImage) {
      const sigId = workbook.addImage({
        buffer: signatureImage.buffer,
        extension: signatureImage.extension,
      })
      worksheet.addImage(sigId, {
        tl: { col: 0, row: footerImageRow - 1 },
        ext: { width: 180, height: 80 },
      })
      worksheet.getRow(footerImageRow).height = 60
    }

    // Seal (right side)
    if (sealImage) {
      const sealId = workbook.addImage({
        buffer: sealImage.buffer,
        extension: sealImage.extension,
      })
      const sealColIndex = tableColumnCount > 4 ? tableColumnCount - 1 : tableColumnCount
      worksheet.addImage(sealId, {
        tl: { col: Math.max(sealColIndex - 1, 0), row: footerImageRow - 1 },
        ext: { width: 150, height: 100 },
      })
    }

    // Set column widths
    columns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width
    })

    // Generate Excel file as buffer
    const buffer = await workbook.xlsx.writeBuffer()
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  async renderPurchaseOrderToExcel(
    po: PurchaseOrder,
    adminSettings: AdminSettings,
    vendorName: string,
    options?: { visibleColumns?: Record<string, boolean> }
  ): Promise<Blob> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Purchase Order')

    let currentRow = 1

    // Load branding URLs from fixed file locations
    const brandingUrls = await loadBrandingUrls()
    
    // Load images
    const logoImage = await this.loadImageAsBuffer(brandingUrls.logoUrl)
    const sealImage = await this.loadImageAsBuffer(brandingUrls.sealUrl)
    const signatureImage = await this.loadImageAsBuffer(brandingUrls.signatureUrl)

    const visibleColumns = {
      ...DEFAULT_PO_COLUMNS,
      ...(options?.visibleColumns || {}),
    }
    const columns = this.buildLineItemColumns('purchaseOrder', visibleColumns)
    const tableColumnCount = Math.max(columns.length, 1)

    // Header section with logo
    if (logoImage) {
      const logoId = workbook.addImage({
        buffer: logoImage.buffer,
        extension: logoImage.extension,
      })
      const logoSize = await this.getScaledImageSize(logoImage, 250, 80)
      worksheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: logoSize,
      })

      const logoRowSpan = Math.max(1, Math.ceil(logoSize.height / 20))
      currentRow = Math.max(currentRow, logoRowSpan + 1)
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
    worksheet.getCell(currentRow, 1).value = 'PURCHASE ORDER'
    this.applyCellStyle(worksheet.getCell(currentRow, 1), {
      bold: true,
      fontSize: 16,
      alignment: { horizontal: 'center' },
    })
    worksheet.mergeCells(currentRow, 1, currentRow, tableColumnCount)
    currentRow++

    // Document metadata
    currentRow++ // Empty row
    worksheet.getCell(currentRow, 1).value = 'PO #:'
    worksheet.getCell(currentRow, 2).value = po.number
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 2), {
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    worksheet.getCell(currentRow, 1).value = 'Date:'
    worksheet.getCell(currentRow, 2).value = po.date
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, 2), {
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    const statusDisplay =
      po.status === 'accepted'
        ? 'Accepted'
        : po.status === 'sent'
          ? 'Sent'
          : po.status === 'draft'
            ? 'Draft'
            : po.status || 'Draft'
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

    // Vendor info section
    currentRow++ // Empty row
    worksheet.getCell(currentRow, 1).value = 'VENDOR'
    this.applyCellStyle(worksheet.getCell(currentRow, 1), {
      bold: true,
      fontSize: 12,
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    currentRow++

    worksheet.getCell(currentRow, 1).value = 'Name:'
    worksheet.getCell(currentRow, 2).value = vendorName
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
    columns.forEach((col, index) => {
      const cell = worksheet.getCell(currentRow, index + 1)
      cell.value = col.label
      this.applyCellStyle(cell, {
        bold: true,
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } },
        alignment: {
          horizontal: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left',
          vertical: 'middle',
        },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      })
    })
    currentRow++

    // Line items
    const firstItemRow = currentRow
    po.items.forEach((item, index) => {
      const row = currentRow + index
      const gross = this.getGross(item)
      const taxPercent = this.getTaxPercent(item, gross)
      const net = this.getNet(item, gross)
      const ctx = { gross, taxPercent, net }

      columns.forEach((col, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1)
        cell.value = col.value(item, index, ctx)
        if (col.numFmt) cell.numFmt = col.numFmt
        cell.alignment = {
          horizontal: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left',
          vertical: 'middle',
        }
        this.applyCellStyle(cell, {
          border: {
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          },
        })
      })
    })
    currentRow += po.items.length

    // Totals section
    currentRow++ // Empty row
    const netColIndex = columns.findIndex((col) => col.key === 'netAmount') + 1
    const totalValueCol = netColIndex > 0 ? netColIndex : columns.length || 1

    const taxRow = currentRow
    worksheet.getCell(currentRow, 1).value = 'Tax:'
    worksheet.getCell(currentRow, totalValueCol).value = po.tax || 0
    this.applyCellStyle(worksheet.getCell(currentRow, 1), { 
      bold: true,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, totalValueCol), {
      numFmt: '#,##0.00',
      bold: true,
      alignment: { horizontal: 'right', vertical: 'middle' },
    })
    currentRow++

    const totalRow = currentRow
    worksheet.getCell(currentRow, 1).value = 'TOTAL:'
    worksheet.getCell(currentRow, totalValueCol).value = po.amount || 0
    this.applyCellStyle(worksheet.getCell(currentRow, 1), {
      bold: true,
      fontSize: 12,
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    this.applyCellStyle(worksheet.getCell(currentRow, totalValueCol), {
      numFmt: '#,##0.00',
      bold: true,
      fontSize: 12,
      alignment: { horizontal: 'right', vertical: 'middle' },
    })
    currentRow++

    const poDefaultTerms = adminSettings.defaultPurchaseOrderTerms ?? adminSettings.defaultTerms

    // Terms section
    if (po.terms || poDefaultTerms) {
      currentRow++ // Empty row
      worksheet.getCell(currentRow, 1).value = 'Terms and Conditions:'
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { bold: true })
      currentRow++

      const terms = po.terms || poDefaultTerms || ''
      const termsText = terms
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/div>/gi, '\n')
        .replace(/<div[^>]*>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim()

      termsText.split('\n').forEach((line) => {
        if (!line.trim()) return
        worksheet.getCell(currentRow, 1).value = line.trim()
        worksheet.mergeCells(currentRow, 1, currentRow, tableColumnCount)
        currentRow++
      })
    }

    // Notes section
    if (po.notes) {
      currentRow++ // Empty row
      worksheet.getCell(currentRow, 1).value = 'Notes:'
      this.applyCellStyle(worksheet.getCell(currentRow, 1), { bold: true })
      currentRow++
      worksheet.getCell(currentRow, 1).value = po.notes
      worksheet.mergeCells(currentRow, 1, currentRow, tableColumnCount)
      currentRow++
    }

    // Footer with signature and seal
    currentRow += 2 // Extra space
    const footerTextRow = currentRow
    const footerImageRow = footerTextRow + 1

    worksheet.getCell(footerTextRow, 1).value = 'Authorized By:'
    this.applyCellStyle(worksheet.getCell(footerTextRow, 1), { fontSize: 10 })

    worksheet.getCell(footerTextRow, tableColumnCount).value = `Date: ${po.date}`
    this.applyCellStyle(worksheet.getCell(footerTextRow, tableColumnCount), {
      alignment: { horizontal: 'right' },
      fontSize: 10,
    })

    // Signature
    if (signatureImage) {
      const sigId = workbook.addImage({
        buffer: signatureImage.buffer,
        extension: signatureImage.extension,
      })
      worksheet.addImage(sigId, {
        tl: { col: 0, row: footerImageRow - 1 },
        ext: { width: 180, height: 80 },
      })
      worksheet.getRow(footerImageRow).height = 60
    }

    // Seal (right side)
    if (sealImage) {
      const sealId = workbook.addImage({
        buffer: sealImage.buffer,
        extension: sealImage.extension,
      })
      const sealColIndex = tableColumnCount > 4 ? tableColumnCount - 1 : tableColumnCount
      worksheet.addImage(sealId, {
        tl: { col: Math.max(sealColIndex - 1, 0), row: footerImageRow - 1 },
        ext: { width: 150, height: 100 },
      })
    }

    // Set column widths
    columns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width
    })

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
