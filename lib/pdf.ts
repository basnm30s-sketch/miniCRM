/**
 * PDF Renderer abstraction layer
 * Allows swapping between client-side (html2canvas+jspdf) and server-side rendering
 */

import { loadBrandingUrls } from '@/lib/api-client'
import {
  DEFAULT_QUOTE_COLUMNS,
  DEFAULT_INVOICE_COLUMNS,
  DEFAULT_PO_COLUMNS,
} from '@/lib/doc-generator/line-item-columns'

/**
 * NOTE: `lib/types.ts` currently exports both Drizzle-inferred model types and legacy interfaces
 * with the same names (e.g. `export type Quote = ...` and `export interface Quote { ... }`).
 * That causes type ambiguity in consumers. For PDF rendering we only need the legacy *shape*,
 * so we define local structural types here to avoid the collision.
 */
type PdfAdminSettings = {
  companyName: string
  address: string
  vatNumber: string
  currency?: string | null
  defaultTerms?: string | null
  defaultInvoiceTerms?: string | null
  defaultPurchaseOrderTerms?: string | null
  footerAddressEnglish?: string | null
  footerAddressArabic?: string | null
  footerContactEnglish?: string | null
  footerContactArabic?: string | null
}

type PdfCustomer = {
  name: string
  company?: string | null
  address?: string | null
  email?: string | null
  phone?: string | null
  trn?: string | null
}

export type PdfVendor = {
  name: string
  contactPerson?: string | null
  address?: string | null
  email?: string | null
  phone?: string | null
}

type PdfQuoteLineItem = {
  serialNumber?: number | null
  vehicleNumber?: string | null
  vehicleType?: string | null
  vehicleTypeLabel?: string | null
  make?: string | null
  model?: string | null
  year?: number | null
  basePrice?: number | null
  description?: string | null
  rentalBasis?: string | null
  quantity: number
  unitPrice: number
  grossAmount?: number | null
  lineTaxAmount?: number | null
  lineTotal?: number | null
}

type PdfQuote = {
  number: string
  date: string
  validUntil?: string | null
  currency: string
  customer: PdfCustomer
  items: PdfQuoteLineItem[]
  totalTax: number
  total: number
  terms?: string | null
  notes?: string | null
}

type PdfPurchaseOrderItem = {
  serialNumber?: number | null
  vehicleNumber?: string | null
  vehicleType?: string | null
  vehicleTypeLabel?: string | null
  make?: string | null
  model?: string | null
  year?: number | null
  basePrice?: number | null
  description?: string | null
  rentalBasis?: string | null
  quantity: number
  unitPrice: number
  grossAmount?: number | null
  tax?: number | null
  lineTaxAmount?: number | null
  total?: number | null
  lineTotal?: number | null
}

type PdfPurchaseOrder = {
  number: string
  date: string
  currency: string
  status?: string | null
  items: PdfPurchaseOrderItem[]
  tax?: number | null
  amount?: number | null
  terms?: string | null
  notes?: string | null
}

type PdfInvoiceItem = {
  serialNumber?: number | null
  vehicleNumber?: string | null
  vehicleType?: string | null
  vehicleTypeLabel?: string | null
  make?: string | null
  model?: string | null
  year?: number | null
  basePrice?: number | null
  description?: string | null
  rentalBasis?: string | null
  quantity: number
  unitPrice: number
  grossAmount?: number | null
  tax?: number | null
  lineTaxAmount?: number | null
  total?: number | null
  lineTotal?: number | null
  amountReceived?: number | null
}

type PdfInvoice = {
  number: string
  date: string
  dueDate?: string | null
  status?: string | null
  poNumbers?: string | null
  items: PdfInvoiceItem[]
  subtotal?: number | null
  tax?: number | null
  total?: number | null
  terms?: string | null
  notes?: string | null
}

export type PdfVisibleColumnsOptions = { visibleColumns?: Record<string, boolean> }

export interface PDFRenderer {
  /**
   * Render a quote to PDF blob
   * @param quote - Quote object
   * @param adminSettings - Admin company settings (logo, seal, signature, etc.)
   * @param options - Optional visibleColumns to control which line-item columns appear in the PDF
   * @returns Promise<Blob> - PDF file as blob
   */
  renderQuoteToPdf(quote: PdfQuote, adminSettings: PdfAdminSettings, options?: PdfVisibleColumnsOptions): Promise<Blob>

  /**
   * Render a purchase order to PDF blob
   * @param po - Purchase Order object
   * @param adminSettings - Admin company settings
   * @param vendor - Vendor details for display (or null for fallback)
   * @param options - Optional visibleColumns to control which line-item columns appear in the PDF
   * @returns Promise<Blob> - PDF file as blob
   */
  renderPurchaseOrderToPdf(po: PdfPurchaseOrder, adminSettings: PdfAdminSettings, vendor: PdfVendor | null, options?: PdfVisibleColumnsOptions): Promise<Blob>

  /**
   * Render an invoice to PDF blob
   * @param invoice - Invoice object
   * @param adminSettings - Admin company settings
   * @param customer - Customer details for display (or null for fallback)
   * @param options - Optional visibleColumns to control which line-item columns appear in the PDF
   * @returns Promise<Blob> - PDF file as blob
   */
  renderInvoiceToPdf(invoice: PdfInvoice, adminSettings: PdfAdminSettings, customer: PdfCustomer | null, options?: PdfVisibleColumnsOptions): Promise<Blob>

  /**
   * Trigger download of a PDF blob in the browser
   * @param blob - PDF blob
   * @param filename - Filename for download (e.g., "quote-AAT-20251118-0001.pdf")
   */
  downloadPdf(blob: Blob, filename: string): void
}

/**
 * Client-side PDF renderer using html2canvas + jspdf
 * Renders quote preview HTML to canvas, then converts to PDF with admin branding
 */
export class ClientSidePDFRenderer implements PDFRenderer {
  private addCanvasToPdf(
    pdf: any,
    canvas: HTMLCanvasElement,
    footerStamp?: { imgData: string; pixelWidth: number; pixelHeight: number } | null
  ): void {
    // Add the rendered canvas to the PDF, supporting multi-page output when content exceeds one page.
    const imgData = canvas.toDataURL('image/jpeg', 0.85) // Balance of quality and size
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()

    const margin = 10
    const imgWidth = pdfWidth - margin * 2
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    const footerHeightMm =
      footerStamp ? (footerStamp.pixelHeight * imgWidth) / footerStamp.pixelWidth : 0
    const pageContentHeight = pdfHeight - margin * 2 - footerHeightMm
    let heightLeft = imgHeight
    let pageOffsetY = margin

    const stampFooter = () => {
      if (!footerStamp || footerHeightMm <= 0) return
      const footerY = pdfHeight - margin - footerHeightMm
      // Cover any underlying content to avoid overlap
      pdf.setFillColor(255, 255, 255)
      pdf.rect(margin, footerY, imgWidth, footerHeightMm, 'F')
      pdf.addImage(footerStamp.imgData, 'PNG', margin, footerY, imgWidth, footerHeightMm)
    }

    // First page
    pdf.addImage(imgData, 'JPEG', margin, pageOffsetY, imgWidth, imgHeight)
    stampFooter()
    heightLeft -= pageContentHeight

    // Additional pages (draw the same image with a negative offset to show the next slice)
    while (heightLeft > 0) {
      pdf.addPage()
      pageOffsetY = margin - (imgHeight - heightLeft)
      pdf.addImage(imgData, 'JPEG', margin, pageOffsetY, imgWidth, imgHeight)
      stampFooter()
      heightLeft -= pageContentHeight
    }
  }

  private async renderFooterToStamp(
    adminSettings: PdfAdminSettings,
    html2canvas: any,
    scale: number
  ): Promise<{ imgData: string; pixelWidth: number; pixelHeight: number } | null> {
    const footerHtml = this.buildFooterHtml(adminSettings)
    if (!footerHtml) return null

    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '210mm'
    container.style.height = 'auto'
    // Keep horizontal padding for alignment; add a small bottom buffer to avoid html2canvas clipping text descenders
    container.style.padding = '0 20px 6px'
    container.style.backgroundColor = 'white'
    container.style.fontFamily = 'Arial, sans-serif'
    container.style.fontSize = '10px'
    container.style.color = '#333333'
    container.style.margin = '0'
    container.innerHTML = footerHtml

    document.body.appendChild(container)

    try {
      await new Promise(resolve => setTimeout(resolve, 50))
      const canvas = await html2canvas(container, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        foreignObjectRendering: false,
        ignoreElements: (el: Element) => {
          return el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'SVG'
        },
      })

      // Prefer PNG for sharper small text in the footer
      const imgData = canvas.toDataURL('image/png')
      return { imgData, pixelWidth: canvas.width, pixelHeight: canvas.height }
    } finally {
      document.body.removeChild(container)
    }
  }

  async renderQuoteToPdf(quote: PdfQuote, adminSettings: PdfAdminSettings, options?: PdfVisibleColumnsOptions): Promise<Blob> {
    // Dynamic imports to avoid bundling if not used
    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).jsPDF

    // Load branding URLs from fixed file locations
    const brandingUrls = await loadBrandingUrls()
    
    // Preload images to ensure they're loaded before rendering
    const logoUrl = brandingUrls.logoUrl
    const sealUrl = brandingUrls.sealUrl
    const signatureUrl = brandingUrls.signatureUrl
    
    const imagePromises: Promise<void>[] = []
    if (logoUrl) {
      imagePromises.push(this.preloadImage(logoUrl))
    }
    if (sealUrl) {
      imagePromises.push(this.preloadImage(sealUrl))
    }
    if (signatureUrl) {
      imagePromises.push(this.preloadImage(signatureUrl))
    }
    
    // Wait for all images to load
    await Promise.all(imagePromises)

    // Create a temporary container to render the quote HTML
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '210mm' // A4 width
    container.style.height = 'auto'
    container.style.padding = '20px'
    container.style.backgroundColor = 'white'
    container.style.fontFamily = 'Arial, sans-serif'
    container.style.fontSize = '12px'
    container.style.color = '#333333'
    container.style.margin = '0'

    const visibleColumns = { ...DEFAULT_QUOTE_COLUMNS, ...(options?.visibleColumns || {}) }
    const quoteHtml = this.buildQuoteHtml(quote, adminSettings, { logoUrl, sealUrl, signatureUrl }, visibleColumns)
    container.innerHTML = quoteHtml

    document.body.appendChild(container)

    // Wait a bit for images in HTML to load
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      const footerStamp = await this.renderFooterToStamp(adminSettings, html2canvas, 2.5)
      // Render container to canvas
      const canvas = await html2canvas(container, {
        scale: 2.5, // Higher DPI for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        foreignObjectRendering: false,
        onclone: (clonedDoc) => {
          // Ensure images are loaded in cloned document
          const images = clonedDoc.querySelectorAll('img')
          images.forEach((img) => {
            if (!img.complete) {
              img.style.display = 'none'
            }
          })
        },
        ignoreElements: (el: Element) => {
          // Ignore SVG, script, style, link tags that might have unsupported colors
          return el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'SVG'
        },
      })

      // Create PDF from canvas (A4 size: 210mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      this.addCanvasToPdf(pdf, canvas, footerStamp)

      // Return PDF as blob
      return pdf.output('blob') as unknown as Promise<Blob>
    } finally {
      // Clean up
      document.body.removeChild(container)
    }
  }

  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve()
      img.onerror = () => resolve() // Resolve even on error to not block rendering
      img.src = url
    })
  }

  downloadPdf(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async renderPurchaseOrderToPdf(po: PdfPurchaseOrder, adminSettings: PdfAdminSettings, vendor: PdfVendor | null, options?: PdfVisibleColumnsOptions): Promise<Blob> {
    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).jsPDF

    // Preload images
    // Load branding URLs from fixed file locations
    const brandingUrls = await loadBrandingUrls()
    const logoUrl = brandingUrls.logoUrl
    const sealUrl = brandingUrls.sealUrl
    const signatureUrl = brandingUrls.signatureUrl
    
    const imagePromises: Promise<void>[] = []
    if (logoUrl) imagePromises.push(this.preloadImage(logoUrl))
    if (sealUrl) imagePromises.push(this.preloadImage(sealUrl))
    if (signatureUrl) imagePromises.push(this.preloadImage(signatureUrl))
    await Promise.all(imagePromises)

    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '210mm'
    container.style.height = 'auto'
    container.style.padding = '20px'
    container.style.backgroundColor = 'white'
    container.style.fontFamily = 'Arial, sans-serif'
    container.style.fontSize = '12px'
    container.style.color = '#333333'
    container.style.margin = '0'

    const visibleColumns = { ...DEFAULT_PO_COLUMNS, ...(options?.visibleColumns || {}) }
    const poHtml = this.buildPurchaseOrderHtml(po, adminSettings, vendor, { logoUrl, sealUrl, signatureUrl }, visibleColumns)
    container.innerHTML = poHtml
    document.body.appendChild(container)

    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      const footerStamp = await this.renderFooterToStamp(adminSettings, html2canvas, 2.5)
      const canvas = await html2canvas(container, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        foreignObjectRendering: false,
        ignoreElements: (el: Element) => {
          return el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'SVG'
        },
      })

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      this.addCanvasToPdf(pdf, canvas, footerStamp)
      return pdf.output('blob') as unknown as Promise<Blob>
    } finally {
      document.body.removeChild(container)
    }
  }

  async renderInvoiceToPdf(invoice: PdfInvoice, adminSettings: PdfAdminSettings, customer: PdfCustomer | null, options?: PdfVisibleColumnsOptions): Promise<Blob> {
    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).jsPDF

    // Preload images
    // Load branding URLs from fixed file locations
    const brandingUrls = await loadBrandingUrls()
    const logoUrl = brandingUrls.logoUrl
    const sealUrl = brandingUrls.sealUrl
    const signatureUrl = brandingUrls.signatureUrl
    
    const imagePromises: Promise<void>[] = []
    if (logoUrl) imagePromises.push(this.preloadImage(logoUrl))
    if (sealUrl) imagePromises.push(this.preloadImage(sealUrl))
    if (signatureUrl) imagePromises.push(this.preloadImage(signatureUrl))
    await Promise.all(imagePromises)

    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '210mm'
    container.style.height = 'auto'
    container.style.padding = '20px'
    container.style.backgroundColor = 'white'
    container.style.fontFamily = 'Arial, sans-serif'
    container.style.fontSize = '12px'
    container.style.color = '#333333'
    container.style.margin = '0'

    const visibleColumns = { ...DEFAULT_INVOICE_COLUMNS, ...(options?.visibleColumns || {}) }
    const invoiceHtml = this.buildInvoiceHtml(invoice, adminSettings, customer, { logoUrl, sealUrl, signatureUrl }, visibleColumns)
    container.innerHTML = invoiceHtml
    document.body.appendChild(container)

    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      const footerStamp = await this.renderFooterToStamp(adminSettings, html2canvas, 2.5)
      const canvas = await html2canvas(container, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        foreignObjectRendering: false,
        ignoreElements: (el: Element) => {
          return el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'SVG'
        },
      })

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      this.addCanvasToPdf(pdf, canvas, footerStamp)
      return pdf.output('blob') as unknown as Promise<Blob>
    } finally {
      document.body.removeChild(container)
    }
  }

  private buildFooterHtml(adminSettings: PdfAdminSettings): string {
    const footerAddressEn = (adminSettings.footerAddressEnglish || '').trim()
    const footerAddressAr = (adminSettings.footerAddressArabic || '').trim()
    const footerContactEn = (adminSettings.footerContactEnglish || '').trim()
    const footerContactAr = (adminSettings.footerContactArabic || '').trim()
    
    if (!footerAddressEn && !footerAddressAr && !footerContactEn && !footerContactAr) {
      return '';
    }
    
    const dividerGapPx = 1
    const footerBottomBufferPx = 6
    return `
    <div style="padding-top: ${dividerGapPx}px; padding-bottom: ${footerBottomBufferPx}px; border-top: 1px solid #ccc; font-size: 10px; line-height: 1.25; overflow: visible;">
      <div style="display: flex; justify-content: space-between; gap: 12px; margin-top: 0;">
        <div style="flex: 1; white-space: pre-wrap; display: flex; flex-direction: column; gap: ${dividerGapPx}px; overflow: visible;">
          ${footerAddressEn ? `<div style="margin: 0; padding: 0;">${footerAddressEn}</div>` : ''}
          ${footerContactEn ? `<div style="margin: 0; padding: 0;">${footerContactEn}</div>` : ''}
        </div>
        <div style="flex: 1; direction: rtl; text-align: right; white-space: pre-wrap; display: flex; flex-direction: column; gap: ${dividerGapPx}px; overflow: visible;">
          ${footerAddressAr ? `<div style="margin: 0; padding: 0;">${footerAddressAr}</div>` : ''}
          ${footerContactAr ? `<div style="margin: 0; padding: 0;">${footerContactAr}</div>` : ''}
        </div>
      </div>
    </div>
    `
  }

  /** Column key order and labels for line-item tables; matches Excel/UI. */
  private static LINE_ITEM_COLUMNS: { key: string; label: string; align: 'left' | 'right' | 'center' }[] = [
    { key: 'serialNumber', label: 'Sl. no.', align: 'center' },
    { key: 'vehicleNumber', label: 'Vehicle', align: 'left' },
    { key: 'vehicleType', label: 'Type', align: 'left' },
    { key: 'makeModel', label: 'Make/Model', align: 'left' },
    { key: 'year', label: 'Year', align: 'center' },
    { key: 'basePrice', label: 'Base Price', align: 'right' },
    { key: 'description', label: 'Description', align: 'left' },
    { key: 'rentalBasis', label: 'Basis', align: 'center' },
    { key: 'quantity', label: 'Qty', align: 'right' },
    { key: 'rate', label: 'Rate', align: 'right' },
    { key: 'grossAmount', label: 'Gross', align: 'right' },
    { key: 'tax', label: 'Tax', align: 'right' },
    { key: 'netAmount', label: 'Net', align: 'right' },
    { key: 'amountReceived', label: 'Received', align: 'right' },
  ]

  private buildLineItemsTableHtml(
    variant: 'quote' | 'invoice' | 'purchaseOrder',
    items: (PdfQuoteLineItem | PdfInvoiceItem | PdfPurchaseOrderItem)[],
    visibleColumns: Record<string, boolean>,
    currency?: string
  ): string {
    const columns = ClientSidePDFRenderer.LINE_ITEM_COLUMNS.filter(
      (c) => c.key !== 'amountReceived' || variant === 'invoice'
    ).filter((c) => visibleColumns[c.key] !== false)

    const thStyle = 'padding: 6px 8px; vertical-align: top; white-space: normal; overflow-wrap: break-word; word-break: break-word;'
    const tdBase = 'padding: 6px 8px; border-bottom: 1px solid #ccc; vertical-align: top;'
    const tdWrap = `${tdBase} white-space: normal; overflow-wrap: break-word; word-break: break-word;`
    const tdNowrap = `${tdBase} white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`

    const theadCells = columns
      .map(
        (c) =>
          `<th style="${thStyle} text-align: ${c.align};">${c.label}${currency && (c.key === 'rate' || c.key === 'grossAmount' || c.key === 'tax' || c.key === 'netAmount') ? ` (${currency})` : ''}</th>`
      )
      .join('')

    const colgroup = columns.map(() => '<col style="width: auto;" />').join('')

    const rows = items.map((item, index) => {
      const gross = (item as any).grossAmount ?? (item.quantity * item.unitPrice)
      const lineTax = (item as any).lineTaxAmount ?? (item as any).tax ?? 0
      const net = (item as any).lineTotal ?? (item as any).total ?? gross + lineTax
      const taxPct = gross ? (lineTax / gross) * 100 : 0
      const makeModel = (item as any).make && (item as any).model
        ? `${(item as any).make} ${(item as any).model}`
        : (item as any).make || (item as any).model || '-'
      const rentalBasis = (item as any).rentalBasis === 'hourly' ? 'Hourly' : (item as any).rentalBasis === 'monthly' ? 'Monthly' : (item as any).rentalBasis || '-'

      const cellValues: Record<string, string> = {
        serialNumber: String((item as any).serialNumber ?? index + 1),
        vehicleNumber: String((item as any).vehicleNumber || (item as any).vehicleTypeLabel || '-'),
        vehicleType: String((item as any).vehicleType || '-'),
        makeModel,
        year: String((item as any).year ?? '-'),
        basePrice: typeof (item as any).basePrice === 'number' ? (item as any).basePrice.toFixed(2) : '-',
        description: String((item as any).description || (item as any).vehicleTypeLabel || '-'),
        rentalBasis,
        quantity: String(item.quantity),
        rate: item.unitPrice.toFixed(2),
        grossAmount: gross.toFixed(2),
        tax: variant === 'quote' ? taxPct.toFixed(2) : lineTax.toFixed(2),
        netAmount: net.toFixed(2),
        amountReceived: String((item as any).amountReceived ?? 0),
      }

      const cells = columns.map((c) => {
        const val = cellValues[c.key] ?? '-'
        const isNum = c.align === 'right' && val !== '-'
        const style = c.align === 'left' && (c.key === 'vehicleNumber' || c.key === 'description') ? tdWrap : isNum ? tdNowrap : tdWrap
        return `<td style="${style} text-align: ${c.align};">${val}</td>`
      })
      return `<tr>${cells.join('')}</tr>`
    })

    return `
        <table style="width: 100%; margin-bottom: 20px; font-size: 12px; border-collapse: collapse; table-layout: fixed;">
          <colgroup>${colgroup}</colgroup>
          <thead>
            <tr style="background-color: #e0e0e0; border-bottom: 2px solid #333;">${theadCells}</tr>
          </thead>
          <tbody>${rows.join('')}</tbody>
        </table>`
  }

  private buildQuoteHtml(quote: PdfQuote, adminSettings: PdfAdminSettings, branding: { logoUrl: string | null; sealUrl: string | null; signatureUrl: string | null }, visibleColumns: Record<string, boolean> = DEFAULT_QUOTE_COLUMNS): string {
  // Use branding URLs passed from caller (already loaded from fixed file locations)
  const { logoUrl, sealUrl, signatureUrl } = branding
  
  const logoImg = logoUrl ? `<img src="${logoUrl}" style="height: 80px; margin-right: 20px; object-fit: contain;" />` : ''
  // Seal and signature are rendered in the footer so they move dynamically with document content
  const sealImg = sealUrl ? `<img src="${sealUrl}" style="height: 150px; object-fit: contain;" />` : ''
  const signatureImg = signatureUrl ? `<img src="${signatureUrl}" style="height: 80px; object-fit: contain;" />` : ''

    const itemsTableHtml = this.buildLineItemsTableHtml('quote', quote.items, visibleColumns, quote.currency)

    return `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
          <div style="display: flex; align-items: center;">
            ${logoImg}
            <div>
              <h1 style="margin: 0; font-size: 22px;">${adminSettings.companyName}</h1>
              <p style="margin: 5px 0; font-size: 13px;">${adminSettings.address}</p>
              <p style="margin: 5px 0; font-size: 13px;">TRN: ${adminSettings.vatNumber}</p>
            </div>
          </div>
          <div style="text-align: right;">
            <!-- intentionally left blank: seal will be rendered in the footer so it follows the content -->
          </div>
        </div>

        <!-- Title -->
        <h2 style="text-align: center; margin: 20px 0; font-size: 20px;">QUOTATION</h2>

        <!-- Quote Meta -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;">
          <div>
            <p style="margin: 3px 0;"><strong>Quote #:</strong> ${quote.number}</p>
            <p style="margin: 3px 0;"><strong>Date:</strong> ${quote.date}</p>
            ${quote.validUntil ? `<p style="margin: 3px 0;"><strong>Valid Up To:</strong> ${quote.validUntil}</p>` : ''}
          </div>
          <div style="text-align: right;">
            <p style="margin: 3px 0;"><strong>Currency:</strong> ${quote.currency}</p>
          </div>
        </div>

        <!-- Customer Info -->
        <div style="margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; font-size: 14px;">
          <h3 style="margin: 0 0 10px 0; font-size: 15px;">CUSTOMER</h3>
          <p style="margin: 3px 0; font-size: 18px; font-weight: bold;">${quote.customer.name}</p>
          ${quote.customer.company ? `<p style="margin: 3px 0; font-size: 12px;">Contact: ${quote.customer.company}</p>` : ''}
          ${quote.customer.address ? `<p style="margin: 3px 0; font-size: 12px;">${quote.customer.address}</p>` : ''}
          ${quote.customer.email ? `<p style="margin: 3px 0; font-size: 12px;">Email: ${quote.customer.email}</p>` : ''}
          ${quote.customer.phone ? `<p style="margin: 3px 0; font-size: 12px;">Phone: ${quote.customer.phone}</p>` : ''}
          ${quote.customer.trn ? `<p style="margin: 3px 0; font-size: 12px;">TRN: ${quote.customer.trn}</p>` : ''}
        </div>

        <!-- Line Items Table -->
        ${itemsTableHtml}

        <!-- Totals -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 30px; font-size: 14px;">
          <div style="width: 300px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ccc;">
              <span>Total Tax:</span>
              <span>${quote.totalTax.toFixed(2)} ${quote.currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-weight: bold; font-size: 16px;">
              <span>TOTAL:</span>
              <span>${quote.total.toFixed(2)} ${quote.currency}</span>
            </div>
          </div>
        </div>

        <!-- Terms and Notes -->
        ${(() => {
          // Utility to convert block tags to newlines, preserve inline formatting
          function htmlToFormattedWithNewlines(html: string): string {
            let text = html.replace(/<\s*div[^>]*>/gi, '\n')
                           .replace(/<\s*\/div>/gi, '')
                           .replace(/<\s*p[^>]*>/gi, '\n')
                           .replace(/<\s*\/p>/gi, '')
                           .replace(/<\s*br[^>]*>/gi, '\n');
            text = text.replace(/<(?!\/?(b|strong|i|em|u)\b)[^>]+>/gi, '');
            return text;
          }

          const termsContent = quote.terms || adminSettings.defaultTerms || '';
          let formattedTerms = htmlToFormattedWithNewlines(termsContent);
          // Replace single newlines with <br>, preserve double newlines as extra <br>
          formattedTerms = formattedTerms.replace(/\r\n|\r|\n/g, '<br>');
          // Replace consecutive <br><br> with <br><br> for double spacing (already handled)
          const termsHtml = formattedTerms && formattedTerms.length > 0
            ? `
              <div style="margin-bottom: 20px; padding: 10px; background-color: #f0f0f0; font-size: 14px; line-height: 1.4;">
                <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: bold; line-height: 1.2;">Terms and Conditions:</h4>
                <div style="margin: 0; white-space: pre-line; line-height: 1.4;">${formattedTerms}</div>
              </div>
            `
            : '';

          const notesHtml = quote.notes
            ? `
        <div style="margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; font-size: 14px; line-height: 1.4;">
          <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: bold; line-height: 1.2;">Notes:</h4>
          <p style="margin: 0; white-space: pre-wrap; line-height: 1.4;">${quote.notes}</p>
        </div>
        `
            : '';

          return termsHtml + notesHtml;
        })()}

        <!-- Footer with Signature and Seal (placed after items so position follows content) -->
        <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; font-size: 13px;">
          <div style="flex: 1;">
            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold;">Authorized By:</p>
            <div style="margin-top: 6px;">${signatureImg}</div>
          </div>
          <div style="width: 240px; text-align: right;">
            <div style="margin-bottom: 6px;">${sealImg}</div>
              <div style="margin-top: 18px;"> <p style="margin: 0; font-weight: bold; font-size: 13px;">Date: ${quote.date}</p> </div>
          </div>
        </div>
        
        <!-- Address/contact footer is stamped at bottom of every PDF page -->
          <!-- Terms -->
      </div>
    `
  }

  private buildPurchaseOrderHtml(po: PdfPurchaseOrder, adminSettings: PdfAdminSettings, vendor: PdfVendor | null, branding: { logoUrl: string | null; sealUrl: string | null; signatureUrl: string | null }, visibleColumns: Record<string, boolean> = DEFAULT_PO_COLUMNS): string {
    // Use branding URLs passed from caller (already loaded from fixed file locations)
    const { logoUrl, sealUrl, signatureUrl } = branding
    
    const logoImg = logoUrl ? `<img src="${logoUrl}" style="height: 80px; margin-right: 20px; object-fit: contain;" />` : ''
    const sealImg = sealUrl ? `<img src="${sealUrl}" style="height: 150px; object-fit: contain;" />` : ''
    const signatureImg = signatureUrl ? `<img src="${signatureUrl}" style="height: 80px; object-fit: contain;" />` : ''

    const itemsTableHtml = this.buildLineItemsTableHtml('purchaseOrder', po.items, visibleColumns, po.currency)

    return `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
          <div style="display: flex; align-items: center;">
            ${logoImg}
            <div>
              <h1 style="margin: 0; font-size: 22px;">${adminSettings.companyName}</h1>
              <p style="margin: 5px 0; font-size: 13px;">${adminSettings.address}</p>
              <p style="margin: 5px 0; font-size: 13px;">TRN: ${adminSettings.vatNumber}</p>
            </div>
          </div>
        </div>

        <!-- Title -->
        <h2 style="text-align: center; margin: 20px 0; font-size: 20px;">PURCHASE ORDER</h2>

        <!-- PO Meta -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;">
          <div>
            <p style="margin: 3px 0;"><strong>PO #:</strong> ${po.number}</p>
            <p style="margin: 3px 0;"><strong>Date:</strong> ${po.date}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 3px 0;"><strong>Status:</strong> ${po.status || 'draft'}</p>
            <p style="margin: 3px 0;"><strong>Currency:</strong> ${po.currency}</p>
          </div>
        </div>

        <!-- Vendor Info -->
        <div style="margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; font-size: 14px;">
          <h3 style="margin: 0 0 10px 0; font-size: 15px;">VENDOR</h3>
          ${vendor && vendor.name?.trim()
            ? `
          <p style="margin: 3px 0; font-size: 18px; font-weight: bold;">${vendor.name}</p>
          ${vendor.contactPerson ? `<p style="margin: 3px 0; font-size: 12px;">Contact: ${vendor.contactPerson}</p>` : ''}
          ${vendor.address ? `<p style="margin: 3px 0; font-size: 12px;">${vendor.address}</p>` : ''}
          ${vendor.email ? `<p style="margin: 3px 0; font-size: 12px;">Email: ${vendor.email}</p>` : ''}
          ${vendor.phone ? `<p style="margin: 3px 0; font-size: 12px;">Phone: ${vendor.phone}</p>` : ''}
          `
            : '<p style="margin: 3px 0; font-size: 12px;">Unknown Vendor</p>'}
        </div>

        <!-- Line Items Table -->
        ${itemsTableHtml}

        <!-- Totals -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 30px; font-size: 14px;">
          <div style="width: 300px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ccc;">
              <span>Total Tax:</span>
              <span>${(po.tax || 0).toFixed(2)} ${po.currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-weight: bold; font-size: 16px;">
              <span>TOTAL:</span>
              <span>${(po.amount || 0).toFixed(2)} ${po.currency}</span>
            </div>
          </div>
        </div>

        <!-- Terms and Notes -->
        ${(() => {
          // Utility to convert block tags to newlines, preserve inline formatting
          function htmlToFormattedWithNewlines(html: string): string {
            let text = html.replace(/<\s*div[^>]*>/gi, '\n')
                           .replace(/<\s*\/div>/gi, '')
                           .replace(/<\s*p[^>]*>/gi, '\n')
                           .replace(/<\s*\/p>/gi, '')
                           .replace(/<\s*br[^>]*>/gi, '\n');
            text = text.replace(/<(?!\/?(b|strong|i|em|u)\b)[^>]+>/gi, '');
            return text;
          }

          const poDefaultTerms = adminSettings.defaultPurchaseOrderTerms ?? adminSettings.defaultTerms;
          const termsContent = po.terms || poDefaultTerms || '';
          let formattedTerms = htmlToFormattedWithNewlines(termsContent);
          formattedTerms = formattedTerms.replace(/\r\n|\r|\n/g, '<br>');

          const termsHtml = formattedTerms && formattedTerms.length > 0
            ? `
              <div style="margin-bottom: 20px; padding: 10px; background-color: #f0f0f0; font-size: 14px; line-height: 1.4;">
                <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: bold; line-height: 1.2;">Terms and Conditions:</h4>
                <div style="margin: 0; white-space: pre-line; line-height: 1.4;">${formattedTerms}</div>
              </div>
            `
            : '';

          const notesHtml = po.notes
            ? `
          <div style="margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; font-size: 14px; line-height: 1.4;">
            <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: bold; line-height: 1.2;">Notes:</h4>
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.4;">${po.notes}</p>
          </div>
          `
            : '';

          return termsHtml + notesHtml;
        })()}

        <!-- Footer with Signature and Seal -->
        <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; font-size: 13px;">
          <div style="flex: 1;">
            <p style="margin: 0 0 6px 0; font-size: 13px;">Authorized By:</p>
            <div style="margin-top: 6px;">${signatureImg}</div>
          </div>
          <div style="width: 240px; text-align: right;">
            <div style="margin-bottom: 6px;">${sealImg}</div>
            <div style="margin-top: 18px;"><p style="margin: 0;">Date: ${po.date}</p></div>
          </div>
        </div>
        
        <!-- Address/contact footer is stamped at bottom of every PDF page -->
      </div>
    `
  }

  private buildInvoiceHtml(invoice: PdfInvoice, adminSettings: PdfAdminSettings, customer: PdfCustomer | null, branding: { logoUrl: string | null; sealUrl: string | null; signatureUrl: string | null }, visibleColumns: Record<string, boolean> = DEFAULT_INVOICE_COLUMNS): string {
    // Use branding URLs passed from caller (already loaded from fixed file locations)
    const { logoUrl, sealUrl, signatureUrl } = branding
    
    const logoImg = logoUrl ? `<img src="${logoUrl}" style="height: 80px; margin-right: 20px; object-fit: contain;" />` : ''
    const sealImg = sealUrl ? `<img src="${sealUrl}" style="height: 150px; object-fit: contain;" />` : ''
    const signatureImg = signatureUrl ? `<img src="${signatureUrl}" style="height: 80px; object-fit: contain;" />` : ''

    const itemsTableHtml = this.buildLineItemsTableHtml('invoice', invoice.items, visibleColumns)

    return `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
          <div style="display: flex; align-items: center;">
            ${logoImg}
            <div>
              <h1 style="margin: 0; font-size: 22px;">${adminSettings.companyName}</h1>
              <p style="margin: 5px 0; font-size: 13px;">${adminSettings.address}</p>
              <p style="margin: 5px 0; font-size: 13px;">TRN: ${adminSettings.vatNumber}</p>
            </div>
          </div>
        </div>

        <!-- Title -->
        <h2 style="text-align: center; margin: 20px 0; font-size: 20px;">INVOICE</h2>

        <!-- Invoice Meta -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;">
          <div>
            <p style="margin: 3px 0;"><strong>Invoice #:</strong> ${invoice.number}</p>
            <p style="margin: 3px 0;"><strong>Date:</strong> ${invoice.date}</p>
            ${invoice.dueDate ? `<p style="margin: 3px 0;"><strong>Due Date:</strong> ${invoice.dueDate}</p>` : ''}
            ${invoice.poNumbers && String(invoice.poNumbers).trim() ? `<p style="margin: 3px 0;"><strong>PO #:</strong> ${String(invoice.poNumbers).trim()}</p>` : ''}
          </div>
          <div style="text-align: right;">
            <p style="margin: 3px 0;"><strong>Status:</strong> ${invoice.status === 'payment_received' ? 'Payment Received' : invoice.status === 'invoice_sent' ? 'Invoice Sent' : invoice.status === 'draft' ? 'Draft' : invoice.status || 'Draft'}</p>
          </div>
        </div>

        <!-- Customer Info -->
        <div style="margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; font-size: 14px;">
          <h3 style="margin: 0 0 10px 0; font-size: 15px;">CUSTOMER</h3>
          ${customer && customer.name?.trim()
            ? `
          <p style="margin: 3px 0; font-size: 18px; font-weight: bold;">${customer.name}</p>
          ${customer.company ? `<p style="margin: 3px 0; font-size: 12px;">Contact: ${customer.company}</p>` : ''}
          ${customer.address ? `<p style="margin: 3px 0; font-size: 12px;">${customer.address}</p>` : ''}
          ${customer.email ? `<p style="margin: 3px 0; font-size: 12px;">Email: ${customer.email}</p>` : ''}
          ${customer.phone ? `<p style="margin: 3px 0; font-size: 12px;">Phone: ${customer.phone}</p>` : ''}
          ${customer.trn ? `<p style="margin: 3px 0; font-size: 12px;">TRN: ${customer.trn}</p>` : ''}
          `
            : '<p style="margin: 3px 0; font-size: 12px;">Unknown Customer</p>'}
        </div>

        <!-- Line Items Table -->
        ${itemsTableHtml}

        <!-- Totals -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 30px; font-size: 14px;">
          <div style="width: 300px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ccc;">
              <span>Tax:</span>
              <span>${invoice.tax?.toFixed(2) || '0.00'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-weight: bold; font-size: 16px;">
              <span>TOTAL:</span>
              <span>${invoice.total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>

        <!-- Terms and Notes -->
        ${(() => {
          // Utility to convert block tags to newlines, preserve inline formatting
          function htmlToFormattedWithNewlines(html: string): string {
            let text = html.replace(/<\s*div[^>]*>/gi, '\n')
                           .replace(/<\s*\/div>/gi, '')
                           .replace(/<\s*p[^>]*>/gi, '\n')
                           .replace(/<\s*\/p>/gi, '')
                           .replace(/<\s*br[^>]*>/gi, '\n');
            text = text.replace(/<(?!\/?(b|strong|i|em|u)\b)[^>]+>/gi, '');
            return text;
          }

          const invoiceDefaultTerms = adminSettings.defaultInvoiceTerms ?? adminSettings.defaultTerms;
          const termsContent = invoice.terms || invoiceDefaultTerms || '';
          let formattedTerms = htmlToFormattedWithNewlines(termsContent);
          formattedTerms = formattedTerms.replace(/\r\n|\r|\n/g, '<br>');

          const termsHtml = formattedTerms && formattedTerms.length > 0
            ? `
              <div style="margin-bottom: 20px; padding: 10px; background-color: #f0f0f0; font-size: 14px; line-height: 1.4;">
                <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: bold; line-height: 1.2;">Terms and Conditions:</h4>
                <div style="margin: 0; white-space: pre-line; line-height: 1.4;">${formattedTerms}</div>
              </div>
            `
            : '';

          const notesHtml = invoice.notes
            ? `
          <div style="margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; font-size: 14px; line-height: 1.4;">
            <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: bold; line-height: 1.2;">Notes:</h4>
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.4;">${invoice.notes}</p>
          </div>
          `
            : '';

          return termsHtml + notesHtml;
        })()}

        <!-- Footer with Signature and Seal -->
        <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; font-size: 13px;">
          <div style="flex: 1;">
            <p style="margin: 0 0 6px 0; font-size: 13px;">Authorized By:</p>
            <div style="margin-top: 6px;">${signatureImg}</div>
          </div>
          <div style="width: 240px; text-align: right;">
            <div style="margin-bottom: 6px;">${sealImg}</div>
            <div style="margin-top: 18px;"><p style="margin: 0;">Date: ${invoice.date}</p></div>
          </div>
        </div>
        
        <!-- Address/contact footer is stamped at bottom of every PDF page -->
      </div>
    `
  }
}

// Export a singleton instance
export const pdfRenderer = new ClientSidePDFRenderer()
