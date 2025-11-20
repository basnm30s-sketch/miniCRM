/**
 * PDF Renderer abstraction layer
 * Handles PDF generation using html2canvas + jsPDF (client-side)
 */

import type { Quote, AdminSettings } from '@/lib/types'

export interface PDFRenderer {
  renderQuoteToPdf(quote: Quote, adminSettings: AdminSettings): Promise<Blob>
  downloadPdf(blob: Blob, filename: string): void
}

export class ClientSidePDFRenderer implements PDFRenderer {
  async renderQuoteToPdf(quote: Quote, adminSettings: AdminSettings): Promise<Blob> {
    // Dynamic imports to avoid bundling if not used
    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).jsPDF

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
    const quoteHtml = this.buildQuoteHtml(quote, adminSettings)
    container.innerHTML = quoteHtml

    document.body.appendChild(container)

    try {
      // Render container to canvas
      const canvas = await html2canvas(container, {
        scale: 2, // Higher DPI for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: (el: Element) => {
          // Ignore style and link tags to avoid oklch parsing errors
          return el.tagName === 'STYLE' || el.tagName === 'LINK'
        },
      })

      // Create PDF from canvas (A4 size: 210mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      // Add canvas to PDF
      const imgData = canvas.toDataURL('image/png')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20 // margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Check if content fits on one page
      if (imgHeight > pdfHeight - 40) {
        console.warn('Quote content exceeds one page; consider using server-side PDF rendering')
      }

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)

      // Return PDF as blob
      return pdf.output('blob') as unknown as Promise<Blob>
    } finally {
      // Clean up
      document.body.removeChild(container)
    }
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

  private buildQuoteHtml(quote: Quote, adminSettings: AdminSettings): string {
    const logoImg = adminSettings.logoUrl ? `<img src="${adminSettings.logoUrl}" style="height: 60px; margin-right: 20px;" />` : ''
    const sealImg = adminSettings.sealUrl ? `<img src="${adminSettings.sealUrl}" style="height: 80px; float: right;" />` : ''
    const signatureImg = adminSettings.signatureUrl ? `<img src="${adminSettings.signatureUrl}" style="height: 40px;" />` : ''

    const itemsHtml = quote.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #cccccc;">${item.vehicleTypeLabel}</td>
        <td style="padding: 8px; border-bottom: 1px solid #cccccc; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #cccccc; text-align: right;">${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #cccccc; text-align: right;">${item.taxPercent}%</td>
        <td style="padding: 8px; border-bottom: 1px solid #cccccc; text-align: right;">${(item.lineTaxAmount || 0).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #cccccc; text-align: right;">${(item.lineTotal || 0).toFixed(2)}</td>
      </tr>
    `
      )
      .join('')

    return `
      <div style="font-family: Arial, sans-serif; color: #333333;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #333333; padding-bottom: 10px;">
          <div style="display: flex; align-items: center;">
            ${logoImg}
            <div>
              <h1 style="margin: 0; font-size: 20px; color: #000000;">${adminSettings.companyName}</h1>
              <p style="margin: 5px 0; font-size: 11px; color: #333333;">${adminSettings.address}</p>
              <p style="margin: 5px 0; font-size: 11px; color: #333333;">VAT: ${adminSettings.vatNumber}</p>
            </div>
          </div>
          <div style="text-align: right;">
            ${sealImg}
          </div>
        </div>

        <!-- Title -->
        <h2 style="text-align: center; margin: 20px 0; font-size: 18px; color: #000000;">QUOTE</h2>

        <!-- Quote Meta -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px;">
          <div>
            <p style="margin: 3px 0; color: #333333;"><strong>Quote #:</strong> ${quote.number}</p>
            <p style="margin: 3px 0; color: #333333;"><strong>Date:</strong> ${quote.date}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 3px 0; color: #333333;"><strong>Currency:</strong> ${quote.currency}</p>
          </div>
        </div>

        <!-- Customer Info -->
        <div style="margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; font-size: 12px;">
          <h3 style="margin: 0 0 10px 0; font-size: 13px; color: #000000;">CUSTOMER</h3>
          <p style="margin: 3px 0; color: #333333;"><strong>${quote.customer.name}</strong></p>
          ${quote.customer.company ? `<p style="margin: 3px 0; color: #333333;">${quote.customer.company}</p>` : ''}
          ${quote.customer.address ? `<p style="margin: 3px 0; color: #333333;">${quote.customer.address}</p>` : ''}
          ${quote.customer.email ? `<p style="margin: 3px 0; color: #333333;">Email: ${quote.customer.email}</p>` : ''}
          ${quote.customer.phone ? `<p style="margin: 3px 0; color: #333333;">Phone: ${quote.customer.phone}</p>` : ''}
        </div>

        <!-- Line Items Table -->
        <table style="width: 100%; margin-bottom: 20px; font-size: 12px; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #e0e0e0; border-bottom: 2px solid #333333;">
              <th style="padding: 8px; text-align: left; color: #000000;">Description</th>
              <th style="padding: 8px; text-align: right; color: #000000;">Qty</th>
              <th style="padding: 8px; text-align: right; color: #000000;">Unit Price (${quote.currency})</th>
              <th style="padding: 8px; text-align: right; color: #000000;">Tax %</th>
              <th style="padding: 8px; text-align: right; color: #000000;">Tax (${quote.currency})</th>
              <th style="padding: 8px; text-align: right; color: #000000;">Total (${quote.currency})</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 30px; font-size: 12px;">
          <div style="width: 300px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #cccccc;">
              <span style="color: #333333;">Subtotal:</span>
              <span style="color: #333333;">${quote.subTotal.toFixed(2)} ${quote.currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #cccccc;">
              <span style="color: #333333;">Total Tax:</span>
              <span style="color: #333333;">${quote.totalTax.toFixed(2)} ${quote.currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-weight: bold; font-size: 14px;">
              <span style="color: #000000;">TOTAL:</span>
              <span style="color: #000000;">${quote.total.toFixed(2)} ${quote.currency}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${
          quote.notes
            ? `
        <div style="margin-bottom: 20px; padding: 10px; background-color: #f0f0f0; font-size: 12px;">
          <h4 style="margin: 0 0 5px 0; color: #000000;">Notes:</h4>
          <p style="margin: 0; white-space: pre-wrap; color: #333333;">${quote.notes}</p>
        </div>
        `
            : ''
        }

        <!-- Footer with Signature -->
        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px;">
          <div>
            <p style="margin: 0; color: #333333;">Authorized By:</p>
            ${signatureImg}
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; color: #333333;">Date: ________________</p>
          </div>
        </div>

        <!-- Terms -->
        <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #dddddd; font-size: 10px; color: #666666;">
          <p style="margin: 0;">Thank you for your business. This quote is valid for 30 days from the date above.</p>
        </div>
      </div>
    `
  }
}
