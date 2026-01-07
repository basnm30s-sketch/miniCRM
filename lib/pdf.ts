/**
 * PDF Renderer abstraction layer
 * Allows swapping between client-side (html2canvas+jspdf) and server-side rendering
 */

import { Quote, AdminSettings } from '@/lib/types'
import type { PurchaseOrder } from '@/lib/types'
import type { Invoice } from '@/lib/storage'
import { getFileUrl, loadBrandingUrls } from '@/lib/api-client'

export interface PDFRenderer {
  /**
   * Render a quote to PDF blob
   * @param quote - Quote object
   * @param adminSettings - Admin company settings (logo, seal, signature, etc.)
   * @returns Promise<Blob> - PDF file as blob
   */
  renderQuoteToPdf(quote: Quote, adminSettings: AdminSettings): Promise<Blob>

  /**
   * Render a purchase order to PDF blob
   * @param po - Purchase Order object
   * @param adminSettings - Admin company settings
   * @param vendorName - Vendor name for display
   * @returns Promise<Blob> - PDF file as blob
   */
  renderPurchaseOrderToPdf(po: PurchaseOrder, adminSettings: AdminSettings, vendorName: string): Promise<Blob>

  /**
   * Render an invoice to PDF blob
   * @param invoice - Invoice object
   * @param adminSettings - Admin company settings
   * @param customerName - Customer name for display
   * @returns Promise<Blob> - PDF file as blob
   */
  renderInvoiceToPdf(invoice: Invoice, adminSettings: AdminSettings, customerName: string): Promise<Blob>

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
  async renderQuoteToPdf(quote: Quote, adminSettings: AdminSettings): Promise<Blob> {
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

      // Add canvas to PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.85) // Use JPEG for balance of quality and size
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20 // margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Check if content fits on one page
      if (imgHeight > pdfHeight - 40) {
        console.warn('Quote content exceeds one page; consider using server-side PDF rendering')
      }

      pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight)

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

  async renderPurchaseOrderToPdf(po: PurchaseOrder, adminSettings: AdminSettings, vendorName: string): Promise<Blob> {
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

      const imgData = canvas.toDataURL('image/jpeg', 0.85)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight)
      return pdf.output('blob') as unknown as Promise<Blob>
    } finally {
      document.body.removeChild(container)
    }
  }

  async renderInvoiceToPdf(invoice: Invoice, adminSettings: AdminSettings, customerName: string): Promise<Blob> {
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

      const imgData = canvas.toDataURL('image/jpeg', 0.85)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight)
      return pdf.output('blob') as unknown as Promise<Blob>
    } finally {
      document.body.removeChild(container)
    }
  }

  private buildFooterHtml(adminSettings: AdminSettings): string {
    const footerAddressEn = adminSettings.footerAddressEnglish || '';
    const footerAddressAr = adminSettings.footerAddressArabic || '';
    const footerContactEn = adminSettings.footerContactEnglish || '';
    const footerContactAr = adminSettings.footerContactArabic || '';
    
    if (!footerAddressEn && !footerAddressAr && !footerContactEn && !footerContactAr) {
      return '';
    }
    
    return `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px;">
      ${footerAddressEn || footerAddressAr ? `
        <div style="margin-bottom: 10px;">
          ${footerAddressEn ? `<div style="margin-bottom: 5px;">${footerAddressEn}</div>` : ''}
          ${footerAddressAr ? `<div style="margin-bottom: 5px; direction: rtl; text-align: right;">${footerAddressAr}</div>` : ''}
        </div>
      ` : ''}
      ${footerContactEn || footerContactAr ? `
        <div>
          ${footerContactEn ? `<div style="margin-bottom: 5px;">${footerContactEn}</div>` : ''}
          ${footerContactAr ? `<div style="margin-bottom: 5px; direction: rtl; text-align: right;">${footerContactAr}</div>` : ''}
        </div>
      ` : ''}
    </div>
    `;
  }

  private buildQuoteHtml(quote: Quote, adminSettings: AdminSettings, branding: { logoUrl: string | null; sealUrl: string | null; signatureUrl: string | null }): string {
  // Use branding URLs passed from caller (already loaded from fixed file locations)
  const { logoUrl, sealUrl, signatureUrl } = branding
  
  const logoImg = logoUrl ? `<img src="${logoUrl}" style="height: 80px; margin-right: 20px; object-fit: contain;" />` : ''
  // Seal and signature are rendered in the footer so they move dynamically with document content
  const sealImg = sealUrl ? `<img src="${sealUrl}" style="height: 150px; object-fit: contain;" />` : ''
  const signatureImg = signatureUrl ? `<img src="${signatureUrl}" style="height: 80px; object-fit: contain;" />` : ''

    const itemsHtml = quote.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ccc;">${item.vehicleTypeLabel}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.taxPercent}%</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${(item.lineTaxAmount || 0).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${(item.lineTotal || 0).toFixed(2)}</td>
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
        <table style="width: 100%; margin-bottom: 20px; font-size: 14px; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #e0e0e0; border-bottom: 2px solid #333;">
              <th style="padding: 8px; text-align: center;">Sl. no.</th>
              <th style="padding: 8px; text-align: left;">Item name</th>
              <th style="padding: 8px; text-align: left;">Vehicle number</th>
              <th style="padding: 8px; text-align: left;">Description</th>
              <th style="padding: 8px; text-align: center;">Rental basis</th>
              <th style="padding: 8px; text-align: right;">Qty</th>
              <th style="padding: 8px; text-align: right;">Rate</th>
              <th style="padding: 8px; text-align: right;">Gross amount</th>
              <th style="padding: 8px; text-align: right;">Tax</th>
              <th style="padding: 8px; text-align: right;">Net amount</th>
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
              <div style="margin-bottom: 20px; padding: 10px; background-color: #f0f0f0; font-size: 13px;">
                <h4 style="margin: 0 0 5px 0;">Terms and Conditions:</h4>
                <div style="margin: 0; white-space: pre-line;">${formattedTerms}</div>
              </div>
            `
            : '';

          const notesHtml = quote.notes
            ? `
        <div style="margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; font-size: 13px;">
          <h4 style="margin: 0 0 5px 0;">Notes:</h4>
          <p style="margin: 0; white-space: pre-wrap;">${quote.notes}</p>
        </div>
        `
            : '';

          return termsHtml + notesHtml;
        })()}

        <!-- Footer with Signature and Seal (placed after items so position follows content) -->
        <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; font-size: 13px;">
          <div style="flex: 1;">
            <p style="margin: 0 0 6px 0; font-size: 13px;">Authorized By:</p>
            <div style="margin-top: 6px;">${signatureImg}</div>
          </div>
          <div style="width: 240px; text-align: right;">
            <div style="margin-bottom: 6px;">${sealImg}</div>
              <div style="margin-top: 18px;"> <p style="margin: 0;">Date: ${quote.date}</p> </div>
          </div>
        </div>
        
        <!-- Footer with Address and Contact Details -->
        ${this.buildFooterHtml(adminSettings)}
          <!-- Terms -->
      </div>
    `
  }

  private buildPurchaseOrderHtml(po: PurchaseOrder, adminSettings: AdminSettings, vendorName: string, branding: { logoUrl: string | null; sealUrl: string | null; signatureUrl: string | null }): string {
    // Use branding URLs passed from caller (already loaded from fixed file locations)
    const { logoUrl, sealUrl, signatureUrl } = branding
    
    const logoImg = logoUrl ? `<img src="${logoUrl}" style="height: 80px; margin-right: 20px; object-fit: contain;" />` : ''
    const sealImg = sealUrl ? `<img src="${sealUrl}" style="height: 150px; object-fit: contain;" />` : ''
    const signatureImg = signatureUrl ? `<img src="${signatureUrl}" style="height: 80px; object-fit: contain;" />` : ''

    const itemsHtml = po.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ccc;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${(item.tax || 0).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${(item.total || 0).toFixed(2)}</td>
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
        <table style="width: 100%; margin-bottom: 20px; font-size: 14px; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #e0e0e0; border-bottom: 2px solid #333;">
              <th style="padding: 8px; text-align: left;">Description</th>
              <th style="padding: 8px; text-align: right;">Qty</th>
              <th style="padding: 8px; text-align: right;">Unit Price (${po.currency})</th>
              <th style="padding: 8px; text-align: right;">Tax (${po.currency})</th>
              <th style="padding: 8px; text-align: right;">Total (${po.currency})</th>
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
        
        <!-- Footer with Address and Contact Details -->
        ${this.buildFooterHtml(adminSettings)}
      </div>
    `
  }

  private buildInvoiceHtml(invoice: Invoice, adminSettings: AdminSettings, customerName: string, branding: { logoUrl: string | null; sealUrl: string | null; signatureUrl: string | null }): string {
    // Use branding URLs passed from caller (already loaded from fixed file locations)
    const { logoUrl, sealUrl, signatureUrl } = branding
    
    const logoImg = logoUrl ? `<img src="${logoUrl}" style="height: 80px; margin-right: 20px; object-fit: contain;" />` : ''
    const sealImg = sealUrl ? `<img src="${sealUrl}" style="height: 150px; object-fit: contain;" />` : ''
    const signatureImg = signatureUrl ? `<img src="${signatureUrl}" style="height: 80px; object-fit: contain;" />` : ''

    const itemsHtml = invoice.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ccc;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${(item.total || 0).toFixed(2)}</td>
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
        <table style="width: 100%; margin-bottom: 20px; font-size: 14px; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #e0e0e0; border-bottom: 2px solid #333;">
              <th style="padding: 8px; text-align: left;">Description</th>
              <th style="padding: 8px; text-align: right;">Qty</th>
              <th style="padding: 8px; text-align: right;">Unit Price</th>
              <th style="padding: 8px; text-align: right;">Total</th>
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

        <!-- Notes -->
        ${invoice.notes ? `
          <div style="margin-bottom: 20px; padding: 10px; background-color: #f0f0f0; font-size: 13px;">
            <h4 style="margin: 0 0 5px 0;">Notes:</h4>
            <p style="margin: 0; white-space: pre-wrap;">${invoice.notes}</p>
          </div>
        ` : ''}

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
        
        <!-- Footer with Address and Contact Details -->
        ${this.buildFooterHtml(adminSettings)}
      </div>
    `
  }
}

// Export a singleton instance
export const pdfRenderer = new ClientSidePDFRenderer()
