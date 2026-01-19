'use server'

import { db, invoices, invoiceItems, customers, vendors, purchaseOrders, quotes } from '@/src/db'
import { eq, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

/**
 * Get all invoices with items
 */
export async function getAllInvoices() {
  try {
    // Check if database is available
    if (!db) {
      console.error('Database instance is not available')
      return []
    }

    // Fetch invoices list
    let invoicesList
    try {
      invoicesList = await db
        .select()
        .from(invoices)
        .orderBy(desc(invoices.createdAt))
    } catch (dbError: any) {
      console.error('Error querying invoices table:', dbError)
      // If table doesn't exist or query fails, return empty array
      if (dbError.message?.includes('no such table') || dbError.message?.includes('SQLITE_ERROR')) {
        console.warn('Invoices table may not exist yet, returning empty array')
        return []
      }
      throw dbError
    }

    // If no invoices, return empty array early
    if (!invoicesList || invoicesList.length === 0) {
      return []
    }

    // Fetch items for each invoice
    const invoicesWithItems = await Promise.all(
      invoicesList.map(async (invoice) => {
        try {
          const items = await db
            .select()
            .from(invoiceItems)
            .where(eq(invoiceItems.invoiceId, invoice.id))

          return {
            ...invoice,
            items: items.map(item => ({
              id: item.id,
              serialNumber: item.serialNumber || undefined,
              vehicleTypeId: item.vehicleTypeId || undefined,
              vehicleTypeLabel: item.vehicleTypeLabel || undefined,
              vehicleNumber: item.vehicleNumber || undefined,
              description: item.description || undefined,
              rentalBasis: item.rentalBasis || undefined,
              quantity: item.quantity || 0,
              unitPrice: item.unitPrice || 0,
              taxPercent: item.taxPercent || undefined,
              tax: item.tax || undefined,
              grossAmount: item.grossAmount || undefined,
              lineTaxAmount: item.lineTaxAmount || undefined,
              lineTotal: item.lineTotal || undefined,
              total: item.total || 0,
              amountReceived: item.amountReceived || undefined,
            })),
          }
        } catch (itemError: any) {
          console.error(`Error fetching items for invoice ${invoice.id}:`, itemError)
          // Return invoice without items if items query fails
          return {
            ...invoice,
            items: [],
          }
        }
      })
    )

    return invoicesWithItems
  } catch (error: any) {
    console.error('Error fetching invoices:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    // Return empty array instead of throwing to prevent UI crashes
    // The error is logged for debugging
    return []
  }
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(id: string) {
  try {
    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1)

    if (invoice.length === 0) {
      return null
    }

    const invoiceData = invoice[0]
    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id))

    return {
      ...invoiceData,
      items: items.map(item => ({
        id: item.id,
        serialNumber: item.serialNumber || undefined,
        vehicleTypeId: item.vehicleTypeId || undefined,
        vehicleTypeLabel: item.vehicleTypeLabel || undefined,
        vehicleNumber: item.vehicleNumber || undefined,
        description: item.description || undefined,
        rentalBasis: item.rentalBasis || undefined,
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        taxPercent: item.taxPercent || undefined,
        tax: item.tax || undefined,
        grossAmount: item.grossAmount || undefined,
        lineTaxAmount: item.lineTaxAmount || undefined,
        lineTotal: item.lineTotal || undefined,
        total: item.total || 0,
        amountReceived: item.amountReceived || undefined,
      })),
    }
  } catch (error) {
    console.error('Error fetching invoice:', error)
    throw new Error('Failed to fetch invoice')
  }
}

/**
 * Create a new invoice
 */
export async function createInvoice(data: {
  id: string
  number: string
  date: string
  dueDate?: string | null
  customerId?: string | null
  vendorId?: string | null
  purchaseOrderId?: string | null
  quoteId?: string | null
  items: Array<{
    id: string
    serialNumber?: number | null
    vehicleTypeId?: string | null
    vehicleTypeLabel?: string | null
    vehicleNumber?: string | null
    description?: string | null
    rentalBasis?: string | null
    quantity: number
    unitPrice: number
    taxPercent?: number | null
    tax?: number | null
    grossAmount?: number | null
    lineTaxAmount?: number | null
    lineTotal?: number | null
    total: number
    amountReceived?: number | null
  }>
  subtotal: number
  tax: number
  total: number
  amountReceived?: number
  status?: string
  notes?: string | null
  terms?: string | null
}) {
  try {
    const now = new Date().toISOString()

    // Check uniqueness of invoice number
    const existing = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.number, data.number))
      .limit(1)

    if (existing.length > 0) {
      return { success: false, error: `Invoice number "${data.number}" already exists` }
    }

    // Validate customer exists if provided
    if (data.customerId) {
      const customer = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, data.customerId))
        .limit(1)

      if (customer.length === 0) {
        return { success: false, error: `Customer with ID "${data.customerId}" does not exist` }
      }
    }

    // Validate vendor exists if provided
    if (data.vendorId) {
      const vendor = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.id, data.vendorId))
        .limit(1)

      if (vendor.length === 0) {
        return { success: false, error: `Vendor with ID "${data.vendorId}" does not exist` }
      }
    }

    // Validate purchase order exists if provided
    if (data.purchaseOrderId) {
      const po = await db
        .select({ id: purchaseOrders.id })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, data.purchaseOrderId))
        .limit(1)

      if (po.length === 0) {
        return { success: false, error: `Purchase Order with ID "${data.purchaseOrderId}" does not exist` }
      }
    }

    // Validate quote exists if provided
    if (data.quoteId) {
      const quote = await db
        .select({ id: quotes.id })
        .from(quotes)
        .where(eq(quotes.id, data.quoteId))
        .limit(1)

      if (quote.length === 0) {
        return { success: false, error: `Quote with ID "${data.quoteId}" does not exist` }
      }
    }

    // Insert invoice
    await db.insert(invoices).values({
      id: data.id,
      number: data.number,
      date: data.date,
      dueDate: data.dueDate || null,
      customerId: data.customerId || null,
      vendorId: data.vendorId || null,
      purchaseOrderId: data.purchaseOrderId || null,
      quoteId: data.quoteId || null,
      subtotal: data.subtotal || 0,
      tax: data.tax || 0,
      total: data.total || 0,
      amountReceived: data.amountReceived || 0,
      status: data.status || 'draft',
      notes: data.notes || null,
      terms: data.terms || null,
      createdAt: now,
    })

    // Insert items
    if (data.items && data.items.length > 0) {
      await db.insert(invoiceItems).values(
        data.items.map(item => ({
          id: item.id,
          invoiceId: data.id,
          serialNumber: item.serialNumber || null,
          vehicleTypeId: item.vehicleTypeId || null,
          vehicleTypeLabel: item.vehicleTypeLabel || null,
          vehicleNumber: item.vehicleNumber || null,
          description: item.description || null,
          rentalBasis: item.rentalBasis || null,
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          taxPercent: item.taxPercent || null,
          tax: item.tax || null,
          grossAmount: item.grossAmount || null,
          lineTaxAmount: item.lineTaxAmount || null,
          lineTotal: item.lineTotal || null,
          total: item.total || 0,
          amountReceived: item.amountReceived || null,
        }))
      )
    }

    revalidatePath('/invoices')
    return { success: true }
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    if (error.message?.includes('UNIQUE constraint')) {
      return { success: false, error: 'Invoice number must be unique' }
    }
    if (error.message?.includes('FOREIGN KEY')) {
      return { success: false, error: 'Foreign key constraint failed. Please ensure all referenced records exist.' }
    }
    return { success: false, error: 'Failed to create invoice' }
  }
}

/**
 * Update an existing invoice
 */
export async function updateInvoice(
  id: string,
  data: {
    number?: string
    date?: string
    dueDate?: string | null
    customerId?: string | null
    vendorId?: string | null
    purchaseOrderId?: string | null
    quoteId?: string | null
    items?: Array<{
      id: string
      serialNumber?: number | null
      vehicleTypeId?: string | null
      vehicleTypeLabel?: string | null
      vehicleNumber?: string | null
      description?: string | null
      rentalBasis?: string | null
      quantity: number
      unitPrice: number
      taxPercent?: number | null
      tax?: number | null
      grossAmount?: number | null
      lineTaxAmount?: number | null
      lineTotal?: number | null
      total: number
      amountReceived?: number | null
    }>
    subtotal?: number
    tax?: number
    total?: number
    amountReceived?: number
    status?: string
    notes?: string | null
    terms?: string | null
  }
) {
  try {
    const now = new Date().toISOString()

    // Check uniqueness of invoice number (excluding current invoice)
    if (data.number) {
      const existing = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.number, data.number))
        .limit(1)

      if (existing.length > 0 && existing[0].id !== id) {
        return { success: false, error: `Invoice number "${data.number}" already exists` }
      }
    }

    // Validate foreign keys if provided
    if (data.customerId) {
      const customer = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, data.customerId))
        .limit(1)

      if (customer.length === 0) {
        return { success: false, error: `Customer with ID "${data.customerId}" does not exist` }
      }
    }

    if (data.vendorId) {
      const vendor = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.id, data.vendorId))
        .limit(1)

      if (vendor.length === 0) {
        return { success: false, error: `Vendor with ID "${data.vendorId}" does not exist` }
      }
    }

    // Update invoice
    const updateData: any = {}
    if (data.number !== undefined) updateData.number = data.number
    if (data.date !== undefined) updateData.date = data.date
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate
    if (data.customerId !== undefined) updateData.customerId = data.customerId
    if (data.vendorId !== undefined) updateData.vendorId = data.vendorId
    if (data.purchaseOrderId !== undefined) updateData.purchaseOrderId = data.purchaseOrderId
    if (data.quoteId !== undefined) updateData.quoteId = data.quoteId
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal
    if (data.tax !== undefined) updateData.tax = data.tax
    if (data.total !== undefined) updateData.total = data.total
    if (data.amountReceived !== undefined) updateData.amountReceived = data.amountReceived
    if (data.status !== undefined) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.terms !== undefined) updateData.terms = data.terms

    await db.update(invoices).set(updateData).where(eq(invoices.id, id))

    // Update items: delete existing and insert new ones
    if (data.items !== undefined) {
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id))

      if (data.items.length > 0) {
        await db.insert(invoiceItems).values(
          data.items.map(item => ({
            id: item.id,
            invoiceId: id,
            serialNumber: item.serialNumber || null,
            vehicleTypeId: item.vehicleTypeId || null,
            vehicleTypeLabel: item.vehicleTypeLabel || null,
            vehicleNumber: item.vehicleNumber || null,
            description: item.description || null,
            rentalBasis: item.rentalBasis || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxPercent: item.taxPercent || null,
            tax: item.tax || null,
            grossAmount: item.grossAmount || null,
            lineTaxAmount: item.lineTaxAmount || null,
            lineTotal: item.lineTotal || null,
            total: item.total || 0,
            amountReceived: item.amountReceived || null,
          }))
        )
      }
    }

    revalidatePath('/invoices')
    return { success: true }
  } catch (error) {
    console.error('Error updating invoice:', error)
    return { success: false, error: 'Failed to update invoice' }
  }
}

/**
 * Delete an invoice
 */
export async function deleteInvoice(id: string) {
  try {
    // Delete the invoice (items will be deleted via CASCADE)
    await db.delete(invoices).where(eq(invoices.id, id))

    revalidatePath('/invoices')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting invoice:', error)
    if (error.message?.includes('FOREIGN KEY') || error.message?.includes('constraint')) {
      return { success: false, error: 'Cannot delete Invoice as it is referenced in other records' }
    }
    return { success: false, error: 'Failed to delete invoice' }
  }
}
