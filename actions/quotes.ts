'use server'

import { db, quotes, quoteItems, customers, invoices } from '@/src/db'
import { eq, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

/**
 * Get all quotes with customer and items
 */
export async function getAllQuotes() {
  try {
    const quotesList = await db
      .select()
      .from(quotes)
      .orderBy(desc(quotes.createdAt))

    // Fetch items and customers for each quote
    const quotesWithDetails = await Promise.all(
      quotesList.map(async (quote) => {
        const items = await db
          .select()
          .from(quoteItems)
          .where(eq(quoteItems.quoteId, quote.id))

        const customer = quote.customerId
          ? await db
              .select()
              .from(customers)
              .where(eq(customers.id, quote.customerId))
              .limit(1)
          : []

        return {
          ...quote,
          customer: customer[0] || null,
          items: items.map(item => ({
            id: item.id,
            serialNumber: item.serialNumber || undefined,
            vehicleTypeId: item.vehicleTypeId || '',
            vehicleTypeLabel: item.vehicleTypeLabel || '',
            vehicleNumber: item.vehicleNumber || undefined,
            description: item.description || undefined,
            rentalBasis: item.rentalBasis || undefined,
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            taxPercent: item.taxPercent || 0,
            grossAmount: item.grossAmount || undefined,
            lineTaxAmount: item.lineTaxAmount || 0,
            lineTotal: item.lineTotal || 0,
          })),
        }
      })
    )

    return quotesWithDetails
  } catch (error) {
    console.error('Error fetching quotes:', error)
    throw new Error('Failed to fetch quotes')
  }
}

/**
 * Get quote by ID
 */
export async function getQuoteById(id: string) {
  try {
    const quote = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, id))
      .limit(1)

    if (quote.length === 0) {
      return null
    }

    const quoteData = quote[0]
    const items = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, id))

    const customer = quoteData.customerId
      ? await db
          .select()
          .from(customers)
          .where(eq(customers.id, quoteData.customerId))
          .limit(1)
      : []

    return {
      ...quoteData,
      customer: customer[0] || null,
      items: items.map(item => ({
        id: item.id,
        serialNumber: item.serialNumber || undefined,
        vehicleTypeId: item.vehicleTypeId || '',
        vehicleTypeLabel: item.vehicleTypeLabel || '',
        vehicleNumber: item.vehicleNumber || undefined,
        description: item.description || undefined,
        rentalBasis: item.rentalBasis || undefined,
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        taxPercent: item.taxPercent || 0,
        grossAmount: item.grossAmount || undefined,
        lineTaxAmount: item.lineTaxAmount || 0,
        lineTotal: item.lineTotal || 0,
      })),
    }
  } catch (error) {
    console.error('Error fetching quote:', error)
    throw new Error('Failed to fetch quote')
  }
}

/**
 * Create a new quote
 */
export async function createQuote(data: {
  id: string
  number: string
  date: string
  validUntil?: string | null
  currency?: string
  customerId: string
  items: Array<{
    id: string
    vehicleTypeId?: string | null
    vehicleTypeLabel?: string | null
    vehicleNumber?: string | null
    description?: string | null
    rentalBasis?: string | null
    serialNumber?: number | null
    quantity: number
    unitPrice: number
    taxPercent?: number
    grossAmount?: number | null
    lineTaxAmount?: number
    lineTotal?: number
  }>
  subTotal: number
  totalTax: number
  total: number
  terms?: string | null
  notes?: string | null
}) {
  try {
    const now = new Date().toISOString()

    // Check uniqueness of quote number
    const existing = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(eq(quotes.number, data.number))
      .limit(1)

    if (existing.length > 0) {
      return { success: false, error: `Quote number "${data.number}" already exists` }
    }

    // Validate customer exists
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

    // Insert quote
    await db.insert(quotes).values({
      id: data.id,
      number: data.number,
      date: data.date,
      validUntil: data.validUntil || null,
      currency: data.currency || 'AED',
      customerId: data.customerId,
      subTotal: data.subTotal || 0,
      totalTax: data.totalTax || 0,
      total: data.total || 0,
      terms: data.terms || null,
      notes: data.notes || null,
      createdAt: now,
      updatedAt: now,
    })

    // Insert items
    if (data.items && data.items.length > 0) {
      await db.insert(quoteItems).values(
        data.items.map(item => ({
          id: item.id,
          quoteId: data.id,
          vehicleTypeId: item.vehicleTypeId || null,
          vehicleTypeLabel: item.vehicleTypeLabel || null,
          vehicleNumber: item.vehicleNumber || null,
          description: item.description || null,
          rentalBasis: item.rentalBasis || null,
          serialNumber: item.serialNumber || null,
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          taxPercent: item.taxPercent || 0,
          grossAmount: item.grossAmount || null,
          lineTaxAmount: item.lineTaxAmount || 0,
          lineTotal: item.lineTotal || 0,
        }))
      )
    }

    revalidatePath('/quotations')
    revalidatePath('/quotes')
    return { success: true }
  } catch (error: any) {
    console.error('Error creating quote:', error)
    if (error.message?.includes('UNIQUE constraint')) {
      return { success: false, error: 'Quote number must be unique' }
    }
    return { success: false, error: 'Failed to create quote' }
  }
}

/**
 * Update an existing quote
 */
export async function updateQuote(
  id: string,
  data: {
    number?: string
    date?: string
    validUntil?: string | null
    currency?: string
    customerId?: string
    items?: Array<{
      id: string
      vehicleTypeId?: string | null
      vehicleTypeLabel?: string | null
      vehicleNumber?: string | null
      description?: string | null
      rentalBasis?: string | null
      serialNumber?: number | null
      quantity: number
      unitPrice: number
      taxPercent?: number
      grossAmount?: number | null
      lineTaxAmount?: number
      lineTotal?: number
    }>
    subTotal?: number
    totalTax?: number
    total?: number
    terms?: string | null
    notes?: string | null
  }
) {
  try {
    const now = new Date().toISOString()

    // Check uniqueness of quote number (excluding current quote)
    if (data.number) {
      const existing = await db
        .select({ id: quotes.id })
        .from(quotes)
        .where(eq(quotes.number, data.number))
        .limit(1)

      if (existing.length > 0 && existing[0].id !== id) {
        return { success: false, error: `Quote number "${data.number}" already exists` }
      }
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

    // Update quote
    const updateData: any = { updatedAt: now }
    if (data.number !== undefined) updateData.number = data.number
    if (data.date !== undefined) updateData.date = data.date
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil
    if (data.currency !== undefined) updateData.currency = data.currency
    if (data.customerId !== undefined) updateData.customerId = data.customerId
    if (data.subTotal !== undefined) updateData.subTotal = data.subTotal
    if (data.totalTax !== undefined) updateData.totalTax = data.totalTax
    if (data.total !== undefined) updateData.total = data.total
    if (data.terms !== undefined) updateData.terms = data.terms
    if (data.notes !== undefined) updateData.notes = data.notes

    await db.update(quotes).set(updateData).where(eq(quotes.id, id))

    // Update items: delete existing and insert new ones
    if (data.items !== undefined) {
      await db.delete(quoteItems).where(eq(quoteItems.quoteId, id))

      if (data.items.length > 0) {
        await db.insert(quoteItems).values(
          data.items.map(item => ({
            id: item.id,
            quoteId: id,
            vehicleTypeId: item.vehicleTypeId || null,
            vehicleTypeLabel: item.vehicleTypeLabel || null,
            vehicleNumber: item.vehicleNumber || null,
            description: item.description || null,
            rentalBasis: item.rentalBasis || null,
            serialNumber: item.serialNumber || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxPercent: item.taxPercent || 0,
            grossAmount: item.grossAmount || null,
            lineTaxAmount: item.lineTaxAmount || 0,
            lineTotal: item.lineTotal || 0,
          }))
        )
      }
    }

    revalidatePath('/quotations')
    revalidatePath('/quotes')
    return { success: true }
  } catch (error) {
    console.error('Error updating quote:', error)
    return { success: false, error: 'Failed to update quote' }
  }
}

/**
 * Delete a quote
 * Checks for references in invoices before deletion
 */
export async function deleteQuote(id: string) {
  try {
    // Check for related invoices
    const relatedInvoices = await db
      .select({ number: invoices.number })
      .from(invoices)
      .where(eq(invoices.quoteId, id))

    if (relatedInvoices.length > 0) {
      let errorMessage = 'Cannot delete Quote as it is referenced in'
      if (relatedInvoices.length === 1) {
        errorMessage += ` Invoice ${relatedInvoices[0].number}`
      } else {
        errorMessage += ':\n' + relatedInvoices.map((i) => `- Invoice ${i.number}`).join('\n')
      }
      return { success: false, error: errorMessage }
    }

    // Delete the quote (items will be deleted via CASCADE)
    await db.delete(quotes).where(eq(quotes.id, id))

    revalidatePath('/quotations')
    revalidatePath('/quotes')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting quote:', error)
    if (error.message?.includes('FOREIGN KEY') || error.message?.includes('constraint')) {
      return { success: false, error: 'Cannot delete Quote as it is referenced in other records' }
    }
    return { success: false, error: 'Failed to delete quote' }
  }
}
