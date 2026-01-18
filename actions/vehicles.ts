'use server'

import { db, vehicles, quoteItems, quotes, vehicleTransactions, invoices, customers } from '@/src/db'
import { eq, desc, and, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

/**
 * Get all vehicles
 */
export async function getAllVehicles() {
  try {
    const result = await db.select().from(vehicles).orderBy(desc(vehicles.createdAt))
    return result
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    throw new Error('Failed to fetch vehicles')
  }
}

/**
 * Get vehicle by ID
 */
export async function getVehicleById(id: string) {
  try {
    const result = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1)
    return result[0] || null
  } catch (error) {
    console.error('Error fetching vehicle:', error)
    throw new Error('Failed to fetch vehicle')
  }
}

/**
 * Create a new vehicle
 */
export async function createVehicle(data: {
  id: string
  vehicleNumber: string
  vehicleType?: string | null
  make?: string | null
  model?: string | null
  year?: number | null
  color?: string | null
  purchasePrice?: number | null
  purchaseDate?: string | null
  currentValue?: number | null
  insuranceCostMonthly?: number | null
  financingCostMonthly?: number | null
  odometerReading?: number | null
  lastServiceDate?: string | null
  nextServiceDue?: string | null
  fuelType?: string | null
  status?: string | null
  registrationExpiry?: string | null
  insuranceExpiry?: string | null
  description?: string | null
  basePrice?: number | null
  notes?: string | null
}) {
  try {
    const now = new Date().toISOString()
    
    // Log the data being inserted for debugging
    console.log('Creating vehicle with data:', {
      id: data.id,
      vehicleNumber: data.vehicleNumber,
      vehicleNumberTrimmed: data.vehicleNumber.trim(),
      vehicleNumberLength: data.vehicleNumber.trim().length,
      hasVehicleNumber: !!data.vehicleNumber && data.vehicleNumber.trim().length > 0,
      createdAt: now,
    })
    
    // Validate required field
    if (!data.vehicleNumber || data.vehicleNumber.trim().length === 0) {
      return { success: false, error: 'Vehicle Number is required' }
    }
    
    // Check uniqueness of vehicle number
    const existing = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.vehicleNumber, data.vehicleNumber.trim()))
      .limit(1)
    
    if (existing.length > 0) {
      return { success: false, error: `Vehicle Number "${data.vehicleNumber}" already exists` }
    }

    // Helper to safely trim strings
    const safeTrim = (value: string | null | undefined): string | null => {
      if (value === null || value === undefined) return null
      const trimmed = value.trim()
      return trimmed.length === 0 ? null : trimmed
    }
    
    const insertData = {
      id: data.id,
      vehicleNumber: data.vehicleNumber.trim(),
      type: data.vehicleNumber.trim(), // Legacy field - set to vehicleNumber for backward compatibility (NOT NULL constraint)
      vehicleType: safeTrim(data.vehicleType),
      make: safeTrim(data.make),
      model: safeTrim(data.model),
      year: data.year ?? null,
      color: safeTrim(data.color),
      purchasePrice: data.purchasePrice ?? null,
      purchaseDate: safeTrim(data.purchaseDate),
      currentValue: data.currentValue ?? null,
      insuranceCostMonthly: data.insuranceCostMonthly ?? null,
      financingCostMonthly: data.financingCostMonthly ?? null,
      odometerReading: data.odometerReading ?? null,
      lastServiceDate: safeTrim(data.lastServiceDate),
      nextServiceDue: safeTrim(data.nextServiceDue),
      fuelType: safeTrim(data.fuelType),
      status: data.status || 'active',
      registrationExpiry: safeTrim(data.registrationExpiry),
      insuranceExpiry: safeTrim(data.insuranceExpiry),
      description: safeTrim(data.description),
      basePrice: data.basePrice ?? null,
      notes: safeTrim(data.notes),
      createdAt: now,
    }
    
    console.log('Insert data prepared:', JSON.stringify(insertData, null, 2))
    console.log('Type field value:', insertData.type)
    console.log('Type field included:', 'type' in insertData)
    
    await db.insert(vehicles).values(insertData)
    
    console.log('Vehicle inserted successfully')

    revalidatePath('/vehicles')
    return { success: true }
  } catch (error: any) {
    console.error('Error creating vehicle:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
      name: error?.name,
      cause: error?.cause,
      stack: error?.stack?.substring(0, 1000), // First 1000 chars of stack
    })
    
    // Check for specific error types
    if (error?.message?.includes('UNIQUE constraint') || error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, error: 'Vehicle number must be unique' }
    }
    if (error?.message?.includes('no such table') || error?.message?.includes('SQLITE_ERROR')) {
      return { success: false, error: 'Database table not found. Please run migrations: npm run db:migrate' }
    }
    if (error?.message?.includes('NOT NULL constraint')) {
      // Try to extract which field is missing - SQLite error format
      let fieldName = 'unknown field'
      const patterns = [
        /NOT NULL constraint failed: vehicles\.(\w+)/i,
        /NOT NULL constraint failed: (\w+)/i,
        /constraint failed.*vehicles\.(\w+)/i,
        /column (\w+) is not null/i,
      ]
      
      for (const pattern of patterns) {
        const match = error?.message?.match(pattern)
        if (match && match[1]) {
          fieldName = match[1]
          break
        }
      }
      
      console.error(`NOT NULL constraint failed on field: ${fieldName}`)
      console.error(`Full error message: ${error?.message}`)
      return { 
        success: false, 
        error: `Required field "${fieldName}" is missing. Please check all required fields.` 
      }
    }
    
    // Return the actual error message if available
    const errorMessage = error?.message || error?.toString() || 'Failed to create vehicle'
    console.error('Full error message:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Update an existing vehicle
 */
export async function updateVehicle(id: string, data: Partial<typeof vehicles.$inferInsert>) {
  try {
    await db.update(vehicles).set(data).where(eq(vehicles.id, id))

    revalidatePath('/vehicles')
    return { success: true }
  } catch (error) {
    console.error('Error updating vehicle:', error)
    return { success: false, error: 'Failed to update vehicle' }
  }
}

/**
 * Delete a vehicle
 * Checks for references in quote items before deletion
 */
export async function deleteVehicle(id: string) {
  try {
    // Check for related quote items
    const relatedQuotes = await db
      .select({ number: quotes.number })
      .from(quoteItems)
      .innerJoin(quotes, eq(quoteItems.quoteId, quotes.id))
      .where(eq(quoteItems.vehicleTypeId, id))

    if (relatedQuotes.length > 0) {
      let errorMessage = 'Cannot delete Vehicle as it is referenced in'
      if (relatedQuotes.length === 1) {
        errorMessage += ` Quote ${relatedQuotes[0].number}`
      } else {
        errorMessage += ':\n' + relatedQuotes.map((q) => `- Quote ${q.number}`).join('\n')
      }
      return { success: false, error: errorMessage }
    }

    // Delete the vehicle
    await db.delete(vehicles).where(eq(vehicles.id, id))

    revalidatePath('/vehicles')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting vehicle:', error)
    if (error.message?.includes('FOREIGN KEY') || error.message?.includes('constraint')) {
      return { success: false, error: 'Cannot delete Vehicle as it is referenced in other records' }
    }
    return { success: false, error: 'Failed to delete vehicle' }
  }
}

/**
 * Get vehicle profitability data
 */
export async function getVehicleProfitability(vehicleId: string) {
  try {
    const transactions = await db
      .select()
      .from(vehicleTransactions)
      .where(eq(vehicleTransactions.vehicleId, vehicleId))
      .orderBy(desc(vehicleTransactions.date))

    // Group by month
    const monthlyData: Record<string, { revenue: number; expenses: number; count: number }> = {}
    
    transactions.forEach(tx => {
      const month = tx.month || tx.date.substring(0, 7)
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, expenses: 0, count: 0 }
      }
      if (tx.transactionType === 'revenue') {
        monthlyData[month].revenue += tx.amount
      } else {
        monthlyData[month].expenses += tx.amount
      }
      monthlyData[month].count++
    })

    const months = Object.keys(monthlyData).sort()
    const profitability = months.map(month => ({
      vehicleId,
      month,
      totalRevenue: monthlyData[month].revenue,
      totalExpenses: monthlyData[month].expenses,
      profit: monthlyData[month].revenue - monthlyData[month].expenses,
      transactionCount: monthlyData[month].count,
    }))

    const allTimeRevenue = transactions
      .filter(t => t.transactionType === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0)
    const allTimeExpenses = transactions
      .filter(t => t.transactionType === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

    return {
      vehicleId,
      currentMonth: profitability.find(p => p.month === currentMonth) || null,
      lastMonth: profitability.find(p => p.month === lastMonth) || null,
      allTimeRevenue,
      allTimeExpenses,
      allTimeProfit: allTimeRevenue - allTimeExpenses,
      months: profitability,
    }
  } catch (error) {
    console.error('Error fetching vehicle profitability:', error)
    throw new Error('Failed to fetch vehicle profitability')
  }
}

/**
 * Get all vehicle transactions
 */
export async function getAllVehicleTransactions(vehicleId?: string, month?: string) {
  try {
    let query = db.select().from(vehicleTransactions)
    
    if (vehicleId) {
      query = query.where(eq(vehicleTransactions.vehicleId, vehicleId)) as any
    }
    
    if (month) {
      const condition = vehicleId 
        ? and(eq(vehicleTransactions.vehicleId, vehicleId), eq(vehicleTransactions.month, month))
        : eq(vehicleTransactions.month, month)
      query = query.where(condition) as any
    }
    
    const result = await query.orderBy(desc(vehicleTransactions.date))
    return result
  } catch (error) {
    console.error('Error fetching vehicle transactions:', error)
    throw new Error('Failed to fetch vehicle transactions')
  }
}

/**
 * Create a vehicle transaction
 */
export async function createVehicleTransaction(data: {
  id: string
  vehicleId: string
  transactionType: 'expense' | 'revenue'
  category?: string | null
  amount: number
  date: string
  month: string
  description?: string | null
  employeeId?: string | null
  invoiceId?: string | null
}) {
  try {
    const now = new Date().toISOString()
    
    await db.insert(vehicleTransactions).values({
      id: data.id,
      vehicleId: data.vehicleId,
      transactionType: data.transactionType,
      category: data.category || null,
      amount: data.amount,
      date: data.date,
      month: data.month,
      description: data.description || null,
      employeeId: data.employeeId || null,
      invoiceId: data.invoiceId || null,
      createdAt: now,
      updatedAt: now,
    })

    revalidatePath('/vehicles')
    revalidatePath(`/vehicle-finances/${data.vehicleId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error creating vehicle transaction:', error)
    return { success: false, error: 'Failed to create vehicle transaction' }
  }
}
