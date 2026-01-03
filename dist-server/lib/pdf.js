"use strict";
/**
 * PDF Renderer abstraction layer
 * Allows swapping between client-side (html2canvas+jspdf) and server-side rendering
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfRenderer = exports.ClientSidePDFRenderer = void 0;
const api_client_1 = require("@/lib/api-client");
/**
 * Client-side PDF renderer using html2canvas + jspdf
 * Renders quote preview HTML to canvas, then converts to PDF with admin branding
 */
class ClientSidePDFRenderer {
    async renderQuoteToPdf(quote, adminSettings) {
        // Dynamic imports to avoid bundling if not used
        const html2canvas = (await Promise.resolve().then(() => __importStar(require('html2canvas')))).default;
        const jsPDF = (await Promise.resolve().then(() => __importStar(require('jspdf')))).jsPDF;
        // Load branding URLs from fixed file locations
        const brandingUrls = await (0, api_client_1.loadBrandingUrls)();
        // Preload images to ensure they're loaded before rendering
        const logoUrl = brandingUrls.logoUrl;
        const sealUrl = brandingUrls.sealUrl;
        const signatureUrl = brandingUrls.signatureUrl;
        const imagePromises = [];
        if (logoUrl) {
            imagePromises.push(this.preloadImage(logoUrl));
        }
        if (sealUrl) {
            imagePromises.push(this.preloadImage(sealUrl));
        }
        if (signatureUrl) {
            imagePromises.push(this.preloadImage(signatureUrl));
        }
        // Wait for all images to load
        await Promise.all(imagePromises);
        // Create a temporary container to render the quote HTML
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '210mm'; // A4 width
        container.style.height = 'auto';
        container.style.padding = '20px';
        container.style.backgroundColor = 'white';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.fontSize = '12px';
        container.style.color = '#333333';
        container.style.margin = '0';
        // Build the quote HTML with header (logo, company info) and footer
        const quoteHtml = this.buildQuoteHtml(quote, adminSettings, { logoUrl, sealUrl, signatureUrl });
        container.innerHTML = quoteHtml;
        document.body.appendChild(container);
        // Wait a bit for images in HTML to load
        await new Promise(resolve => setTimeout(resolve, 500));
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
                    const images = clonedDoc.querySelectorAll('img');
                    images.forEach((img) => {
                        if (!img.complete) {
                            img.style.display = 'none';
                        }
                    });
                },
                ignoreElements: (el) => {
                    // Ignore SVG, script, style, link tags that might have unsupported colors
                    return el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'SVG';
                },
            });
            // Create PDF from canvas (A4 size: 210mm x 297mm)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });
            // Add canvas to PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG for balance of quality and size
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth - 20; // margins
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            // Check if content fits on one page
            if (imgHeight > pdfHeight - 40) {
                console.warn('Quote content exceeds one page; consider using server-side PDF rendering');
            }
            pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
            // Return PDF as blob
            return pdf.output('blob');
        }
        finally {
            // Clean up
            document.body.removeChild(container);
        }
    }
    preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Resolve even on error to not block rendering
            img.src = url;
        });
    }
    downloadPdf(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    async renderPurchaseOrderToPdf(po, adminSettings, vendorName) {
        const html2canvas = (await Promise.resolve().then(() => __importStar(require('html2canvas')))).default;
        const jsPDF = (await Promise.resolve().then(() => __importStar(require('jspdf')))).jsPDF;
        // Preload images
        // Load branding URLs from fixed file locations
        const brandingUrls = await (0, api_client_1.loadBrandingUrls)();
        const logoUrl = brandingUrls.logoUrl;
        const sealUrl = brandingUrls.sealUrl;
        const signatureUrl = brandingUrls.signatureUrl;
        const imagePromises = [];
        if (logoUrl)
            imagePromises.push(this.preloadImage(logoUrl));
        if (sealUrl)
            imagePromises.push(this.preloadImage(sealUrl));
        if (signatureUrl)
            imagePromises.push(this.preloadImage(signatureUrl));
        await Promise.all(imagePromises);
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '210mm';
        container.style.height = 'auto';
        container.style.padding = '20px';
        container.style.backgroundColor = 'white';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.fontSize = '12px';
        container.style.color = '#333333';
        container.style.margin = '0';
        const poHtml = this.buildPurchaseOrderHtml(po, adminSettings, vendorName, { logoUrl, sealUrl, signatureUrl });
        container.innerHTML = poHtml;
        document.body.appendChild(container);
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
            const canvas = await html2canvas(container, {
                scale: 2.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                allowTaint: true,
                foreignObjectRendering: false,
                ignoreElements: (el) => {
                    return el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'SVG';
                },
            });
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
            return pdf.output('blob');
        }
        finally {
            document.body.removeChild(container);
        }
    }
    async renderInvoiceToPdf(invoice, adminSettings, customerName) {
        const html2canvas = (await Promise.resolve().then(() => __importStar(require('html2canvas')))).default;
        const jsPDF = (await Promise.resolve().then(() => __importStar(require('jspdf')))).jsPDF;
        // Preload images
        // Load branding URLs from fixed file locations
        const brandingUrls = await (0, api_client_1.loadBrandingUrls)();
        const logoUrl = brandingUrls.logoUrl;
        const sealUrl = brandingUrls.sealUrl;
        const signatureUrl = brandingUrls.signatureUrl;
        const imagePromises = [];
        if (logoUrl)
            imagePromises.push(this.preloadImage(logoUrl));
        if (sealUrl)
            imagePromises.push(this.preloadImage(sealUrl));
        if (signatureUrl)
            imagePromises.push(this.preloadImage(signatureUrl));
        await Promise.all(imagePromises);
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '210mm';
        container.style.height = 'auto';
        container.style.padding = '20px';
        container.style.backgroundColor = 'white';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.fontSize = '12px';
        container.style.color = '#333333';
        container.style.margin = '0';
        const invoiceHtml = this.buildInvoiceHtml(invoice, adminSettings, customerName, { logoUrl, sealUrl, signatureUrl });
        container.innerHTML = invoiceHtml;
        document.body.appendChild(container);
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
            const canvas = await html2canvas(container, {
                scale: 2.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                allowTaint: true,
                foreignObjectRendering: false,
                ignoreElements: (el) => {
                    return el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'SVG';
                },
            });
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
            return pdf.output('blob');
        }
        finally {
            document.body.removeChild(container);
        }
    }
    buildQuoteHtml(quote, adminSettings, branding) {
        // Use branding URLs passed from caller (already loaded from fixed file locations)
        const { logoUrl, sealUrl, signatureUrl } = branding;
        const logoImg = logoUrl ? `<img src="${logoUrl}" style="height: 80px; margin-right: 20px; object-fit: contain;" />` : '';
        // Seal and signature are rendered in the footer so they move dynamically with document content
        const sealImg = sealUrl ? `<img src="${sealUrl}" style="height: 100px; object-fit: contain;" />` : '';
        const signatureImg = signatureUrl ? `<img src="${signatureUrl}" style="height: 80px; object-fit: contain;" />` : '';
        const itemsHtml = quote.items
            .map((item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ccc;">${item.vehicleTypeLabel}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.taxPercent}%</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${(item.lineTaxAmount || 0).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${(item.lineTotal || 0).toFixed(2)}</td>
      </tr>
    `)
            .join('');
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
        <h2 style="text-align: center; margin: 20px 0; font-size: 20px;">QUOTE</h2>

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
              <th style="padding: 8px; text-align: left;">Description</th>
              <th style="padding: 8px; text-align: right;">Qty</th>
              <th style="padding: 8px; text-align: right;">Unit Price (${quote.currency})</th>
              <th style="padding: 8px; text-align: right;">Tax %</th>
              <th style="padding: 8px; text-align: right;">Tax (${quote.currency})</th>
              <th style="padding: 8px; text-align: right;">Total (${quote.currency})</th>
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
            function htmlToFormattedWithNewlines(html) {
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
          <!-- Terms -->
      </div>
    `;
    }
    buildPurchaseOrderHtml(po, adminSettings, vendorName, branding) {
        // Use branding URLs passed from caller (already loaded from fixed file locations)
        const { logoUrl, sealUrl, signatureUrl } = branding;
        const logoImg = logoUrl ? `<img src="${logoUrl}" style="height: 80px; margin-right: 20px; object-fit: contain;" />` : '';
        const sealImg = sealUrl ? `<img src="${sealUrl}" style="height: 100px; object-fit: contain;" />` : '';
        const signatureImg = signatureUrl ? `<img src="${signatureUrl}" style="height: 80px; object-fit: contain;" />` : '';
        const itemsHtml = po.items
            .map((item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ccc;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${(item.tax || 0).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${(item.total || 0).toFixed(2)}</td>
      </tr>
    `)
            .join('');
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
      </div>
    `;
    }
    buildInvoiceHtml(invoice, adminSettings, customerName, branding) {
        // Use branding URLs passed from caller (already loaded from fixed file locations)
        const { logoUrl, sealUrl, signatureUrl } = branding;
        const logoImg = logoUrl ? `<img src="${logoUrl}" style="height: 80px; margin-right: 20px; object-fit: contain;" />` : '';
        const sealImg = sealUrl ? `<img src="${sealUrl}" style="height: 100px; object-fit: contain;" />` : '';
        const signatureImg = signatureUrl ? `<img src="${signatureUrl}" style="height: 80px; object-fit: contain;" />` : '';
        const itemsHtml = invoice.items
            .map((item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ccc;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${(item.total || 0).toFixed(2)}</td>
      </tr>
    `)
            .join('');
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
      </div>
    `;
    }
}
exports.ClientSidePDFRenderer = ClientSidePDFRenderer;
// Export a singleton instance
exports.pdfRenderer = new ClientSidePDFRenderer();
