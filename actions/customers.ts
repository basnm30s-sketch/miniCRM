'use server'

import { db, customers, quotes, invoices } from '@/src/db'
import { eq, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

/**
 * Get all customers
 */
export async function getAllCustomers() {
  try {
    const result = await db.select().from(customers).orderBy(desc(customers.createdAt))
    return result
  } catch (error) {
    console.error('Error fetching customers:', error)
    throw new Error('Failed to fetch customers')
  }
}

/**
 * Get customer by ID
 */
export async function getCustomerById(id: string) {
  try {
    const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
    return result[0] || null
  } catch (error) {
    console.error('Error fetching customer:', error)
    throw new Error('Failed to fetch customer')
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(data: {
  id: string
  name: string
  company?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
}) {
  try {
    const now = new Date().toISOString()
    await db.insert(customers).values({
      id: data.id,
      name: data.name,
      company: data.company || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      createdAt: now,
      updatedAt: now,
    })

    revalidatePath('/customers')
    return { success: true }
  } catch (error: any) {
    console.error('Error creating customer:', error)
    if (error.message?.includes('UNIQUE constraint')) {
      return { success: false, error: 'Customer with this ID already exists' }
    }
    return { success: false, error: 'Failed to create customer' }
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(
  id: string,
  data: {
    name?: string
    company?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
  }
) {
  try {
    const now = new Date().toISOString()
    const updateData: any = { updatedAt: now }
    
    if (data.name !== undefined) updateData.name = data.name
    if (data.company !== undefined) updateData.company = data.company || null
    if (data.email !== undefined) updateData.email = data.email || null
    if (data.phone !== undefined) updateData.phone = data.phone || null
    if (data.address !== undefined) updateData.address = data.address || null

    await db.update(customers).set(updateData).where(eq(customers.id, id))

    revalidatePath('/customers')
    return { success: true }
  } catch (error) {
    console.error('Error updating customer:', error)
    return { success: false, error: 'Failed to update customer' }
  }
}

/**
 * Delete a customer
 * Checks for references in quotes and invoices before deletion
 */
export async function deleteCustomer(id: string) {
  try {
    // Check for related quotes
    const relatedQuotes = await db
      .select({ number: quotes.number })
      .from(quotes)
      .where(eq(quotes.customerId, id))

    // Check for related invoices
    const relatedInvoices = await db
      .select({ number: invoices.number })
      .from(invoices)
      .where(eq(invoices.customerId, id))

    // Build references array
    const references = [
      ...relatedQuotes.map((q) => ({ type: 'Quote', number: q.number })),
      ...relatedInvoices.map((i) => ({ type: 'Invoice', number: i.number })),
    ]

    if (references.length > 0) {
      let errorMessage = 'Cannot delete Customer as it is referenced in'
      if (references.length === 1) {
        errorMessage += ` ${references[0].type} ${references[0].number}`
      } else {
        errorMessage += ':\n' + references.map((r) => `- ${r.type} ${r.number}`).join('\n')
      }
      return { success: false, error: errorMessage }
    }

    // Delete the customer
    await db.delete(customers).where(eq(customers.id, id))

    revalidatePath('/customers')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting customer:', error)
    if (error.message?.includes('FOREIGN KEY') || error.message?.includes('constraint')) {
      return { success: false, error: 'Cannot delete Customer as it is referenced in other records' }
    }
    return { success: false, error: 'Failed to delete customer' }
  }
}
