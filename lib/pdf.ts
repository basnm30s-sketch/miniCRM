/**
 * PDF Renderer abstraction layer
 * Allows swapping between client-side (html2canvas+jspdf) and server-side rendering
 */

import { loadBrandingUrls } from '@/lib/api-client'

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
}

type PdfQuoteLineItem = {
  serialNumber?: number | null
  vehicleNumber?: string | null
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
  description: string
  quantity: number
  unitPrice: number
  tax?: number | null
  total?: number | null
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
  description: string
  quantity: number
  unitPrice: number
  tax?: number | null
  total?: number | null
}

type PdfInvoice = {
  number: string
  date: string
  dueDate?: string | null
  status?: string | null
  items: PdfInvoiceItem[]
  subtotal?: number | null
  tax?: number | null
  total?: number | null
  terms?: string | null
  notes?: string | null
}

export interface PDFRenderer {
  /**
   * Render a quote to PDF blob
   * @param quote - Quote object
   * @param adminSettings - Admin company settings (logo, seal, signature, etc.)
   * @returns Promise<Blob> - PDF file as blob
   */
  renderQuoteToPdf(quote: PdfQuote, adminSettings: PdfAdminSettings): Promise<Blob>

  /**
   * Render a purchase order to PDF blob
   * @param po - Purchase Order object
   * @param adminSettings - Admin company settings
   * @param vendorName - Vendor name for display
   * @returns Promise<Blob> - PDF file as blob
   */
  renderPurchaseOrderToPdf(po: PdfPurchaseOrder, adminSettings: PdfAdminSettings, vendorName: string): Promise<Blob>

  /**
   * Render an invoice to PDF blob
   * @param invoice - Invoice object
   * @param adminSettings - Admin company settings
   * @param customerName - Customer name for display
   * @returns Promise<Blob> - PDF file as blob
   */
  renderInvoiceToPdf(invoice: PdfInvoice, adminSettings: PdfAdminSettings, customerName: string): Promise<Blob>

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

  async renderQuoteToPdf(quote: PdfQuote, adminSettings: PdfAdminSettings): Promise<Blob> {
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

    // Build the quote HTML with header (logo, company info) and footer
    const quoteHtml = this.buildQuoteHtml(quote, adminSettings, { logoUrl, sealUrl, signatureUrl })
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

  async renderPurchaseOrderToPdf(po: PdfPurchaseOrder, adminSettings: PdfAdminSettings, vendorName: string): Promise<Blob> {
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

    const poHtml = this.buildPurchaseOrderHtml(po, adminSettings, vendorName, { logoUrl, sealUrl, signatureUrl })
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

  async renderInvoiceToPdf(invoice: PdfInvoice, adminSettings: PdfAdminSettings, customerName: string): Promise<Blob> {
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

    const invoiceHtml = this.buildInvoiceHtml(invoice, adminSettings, customerName, { logoUrl, sealUrl, signatureUrl })
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

  private buildQuoteHtml(quote: PdfQuote, adminSettings: PdfAdminSettings, branding: { logoUrl: string | null; sealUrl: string | null; signatureUrl: string | null }): string {
  // Use branding URLs passed from caller (already loaded from fixed file locations)
  const { logoUrl, sealUrl, signatureUrl } = branding
  
  const logoImg = logoUrl ? `<img src="${logoUrl}" style="height: 80px; margin-right: 20px; object-fit: contain;" />` : ''
  // Seal and signature are rendered in the footer so they move dynamically with document content
  const sealImg = sealUrl ? `<img src="${sealUrl}" style="height: 150px; object-fit: contain;" />` : ''
  const signatureImg = signatureUrl ? `<img src="${signatureUrl}" style="height: 80px; object-fit: contain;" />` : ''

    // Table styles: ensure long text wraps within cells, while numeric values don't split (e.g. "250.00")
    const thStyle =
      'padding: 6px; vertical-align: top; white-space: normal; overflow-wrap: break-word; word-break: break-word;'
    const tdBaseStyle = 'padding: 6px; border-bottom: 1px solid #ccc; vertical-align: top;'
    const tdTextWrapStyle =
      `${tdBaseStyle} white-space: normal; overflow-wrap: break-word; word-break: break-word;`
    const tdVehicleWrapStyle =
      `${tdBaseStyle} white-space: normal; overflow-wrap: anywhere; word-break: break-all;`
    const tdNumberStyle =
      `${tdBaseStyle} white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`

    const itemsHtml = quote.items
      .map((item, index) => {
        // Calculate grossAmount if not present
        const grossAmount = item.grossAmount ?? (item.quantity * item.unitPrice)
        
        return `
      <tr>
        <td style="${tdNumberStyle} text-align: center;">${item.serialNumber ?? index + 1}</td>
        <td style="${tdVehicleWrapStyle} text-align: left;">${item.vehicleNumber || ''}</td>
        <td style="${tdTextWrapStyle} text-align: left;">${item.description || ''}</td>
        <td style="${tdTextWrapStyle} text-align: center;">${item.rentalBasis || ''}</td>
        <td style="${tdNumberStyle} text-align: right;">${item.quantity}</td>
        <td style="${tdNumberStyle} text-align: right;">${item.unitPrice.toFixed(2)}</td>
        <td style="${tdNumberStyle} text-align: right;">${grossAmount.toFixed(2)}</td>
        <td style="${tdNumberStyle} text-align: right;">${(item.lineTaxAmount || 0).toFixed(2)}</td>
        <td style="${tdNumberStyle} text-align: right;">${(item.lineTotal || 0).toFixed(2)}</td>
      </tr>
    `
      })
      .join('')

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
          <p style="margin: 3px 0;"><strong>${quote.customer.name}</strong></p>
          ${quote.customer.company ? `<p style="margin: 3px 0;">${quote.customer.company}</p>` : ''}
          ${quote.customer.address ? `<p style="margin: 3px 0;">${quote.customer.address}</p>` : ''}
          ${quote.customer.email ? `<p style="margin: 3px 0;">Email: ${quote.customer.email}</p>` : ''}
          ${quote.customer.phone ? `<p style="margin: 3px 0;">Phone: ${quote.customer.phone}</p>` : ''}
        </div>

        <!-- Line Items Table -->
        <table style="width: 100%; margin-bottom: 20px; font-size: 12px; border-collapse: collapse; table-layout: fixed;">
          <colgroup>
            <col style="width: 5%;" />
            <col style="width: 15%;" />
            <col style="width: 32%;" />
            <col style="width: 10%;" />
            <col style="width: 6%;" />
            <col style="width: 8%;" />
            <col style="width: 9%;" />
            <col style="width: 7%;" />
            <col style="width: 8%;" />
          </colgroup>
          <thead>
            <tr style="background-color: #e0e0e0; border-bottom: 2px solid #333;">
              <th style="${thStyle} text-align: center;">Sl. no.</th>
              <th style="${thStyle} text-align: left;">Vehicle number</th>
              <th style="${thStyle} text-align: left;">Description</th>
              <th style="${thStyle} text-align: center;">Rental basis</th>
              <th style="${thStyle} text-align: right;">Qty</th>
              <th style="${thStyle} text-align: right;">Rate</th>
              <th style="${thStyle} text-align: right;">Gross amount</th>
              <th style="${thStyle} text-align: right;">Tax</th>
              <th style="${thStyle} text-align: right;">Net amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

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

  private buildPurchaseOrderHtml(po: PdfPurchaseOrder, adminSettings: PdfAdminSettings, vendorName: string, branding: { logoUrl: string | null; sealUrl: string | null; signatureUrl: string | null }): string {
    // Use branding URLs passed from caller (already loaded from fixed file locations)
    const { logoUrl, sealUrl, signatureUrl } = branding
    
    const logoImg = logoUrl ? `<img src="${logoUrl}" style="height: 80px; margin-right: 20px; object-fit: contain;" />` : ''
    const sealImg = sealUrl ? `<img src="${sealUrl}" style="height: 150px; object-fit: contain;" />` : ''
    const signatureImg = signatureUrl ? `<img src="${signatureUrl}" style="height: 80px; object-fit: contain;" />` : ''

    const thStyle = 'padding: 8px; vertical-align: top;'
    const tdWrapStyle = 'padding: 8px; border-bottom: 1px solid #ccc; white-space: normal; overflow-wrap: anywhere; word-break: break-word; vertical-align: top;'

    const itemsHtml = po.items
      .map(
        (item) => `
      <tr>
        <td style="${tdWrapStyle} text-align: left;">${item.description}</td>
        <td style="${tdWrapStyle} text-align: right;">${item.quantity}</td>
        <td style="${tdWrapStyle} text-align: right;">${item.unitPrice.toFixed(2)}</td>
        <td style="${tdWrapStyle} text-align: right;">${(item.tax || 0).toFixed(2)}</td>
        <td style="${tdWrapStyle} text-align: right;">${(item.total || 0).toFixed(2)}</td>
      </tr>
    `
      )
      .join('')

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
          <p style="margin: 3px 0;"><strong>${vendorName}</strong></p>
        </div>

        <!-- Line Items Table -->
        <table style="width: 100%; margin-bottom: 20px; font-size: 14px; border-collapse: collapse; table-layout: fixed;">
          <colgroup>
            <col style="width: 55%;" />
            <col style="width: 10%;" />
            <col style="width: 15%;" />
            <col style="width: 10%;" />
            <col style="width: 10%;" />
          </colgroup>
          <thead>
            <tr style="background-color: #e0e0e0; border-bottom: 2px solid #333;">
              <th style="${thStyle} text-align: left;">Description</th>
              <th style="${thStyle} text-align: right;">Qty</th>
              <th style="${thStyle} text-align: right;">Unit Price (${po.currency})</th>
              <th style="${thStyle} text-align: right;">Tax (${po.currency})</th>
              <th style="${thStyle} text-align: right;">Total (${po.currency})</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

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

          const termsContent = po.terms || adminSettings.defaultTerms || '';
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

  private buildInvoiceHtml(invoice: PdfInvoice, adminSettings: PdfAdminSettings, customerName: string, branding: { logoUrl: string | null; sealUrl: string | null; signatureUrl: string | null }): string {
    // Use branding URLs passed from caller (already loaded from fixed file locations)
    const { logoUrl, sealUrl, signatureUrl } = branding
    
    const logoImg = logoUrl ? `<img src="${logoUrl}" style="height: 80px; margin-right: 20px; object-fit: contain;" />` : ''
    const sealImg = sealUrl ? `<img src="${sealUrl}" style="height: 150px; object-fit: contain;" />` : ''
    const signatureImg = signatureUrl ? `<img src="${signatureUrl}" style="height: 80px; object-fit: contain;" />` : ''

    const thStyle = 'padding: 8px; vertical-align: top;'
    const tdWrapStyle = 'padding: 8px; border-bottom: 1px solid #ccc; white-space: normal; overflow-wrap: anywhere; word-break: break-word; vertical-align: top;'

    const itemsHtml = invoice.items
      .map(
        (item) => `
      <tr>
        <td style="${tdWrapStyle} text-align: left;">${item.description}</td>
        <td style="${tdWrapStyle} text-align: right;">${item.quantity}</td>
        <td style="${tdWrapStyle} text-align: right;">${item.unitPrice.toFixed(2)}</td>
        <td style="${tdWrapStyle} text-align: right;">${(item.total || 0).toFixed(2)}</td>
      </tr>
    `
      )
      .join('')

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
          </div>
          <div style="text-align: right;">
            <p style="margin: 3px 0;"><strong>Status:</strong> ${invoice.status === 'payment_received' ? 'Payment Received' : invoice.status === 'invoice_sent' ? 'Invoice Sent' : invoice.status === 'draft' ? 'Draft' : invoice.status || 'Draft'}</p>
          </div>
        </div>

        <!-- Customer Info -->
        <div style="margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; font-size: 14px;">
          <h3 style="margin: 0 0 10px 0; font-size: 15px;">CUSTOMER</h3>
          <p style="margin: 3px 0;"><strong>${customerName}</strong></p>
        </div>

        <!-- Line Items Table -->
        <table style="width: 100%; margin-bottom: 20px; font-size: 14px; border-collapse: collapse; table-layout: fixed;">
          <colgroup>
            <col style="width: 60%;" />
            <col style="width: 10%;" />
            <col style="width: 15%;" />
            <col style="width: 15%;" />
          </colgroup>
          <thead>
            <tr style="background-color: #e0e0e0; border-bottom: 2px solid #333;">
              <th style="${thStyle} text-align: left;">Description</th>
              <th style="${thStyle} text-align: right;">Qty</th>
              <th style="${thStyle} text-align: right;">Unit Price</th>
              <th style="${thStyle} text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

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

          const termsContent = invoice.terms || adminSettings.defaultTerms || '';
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
