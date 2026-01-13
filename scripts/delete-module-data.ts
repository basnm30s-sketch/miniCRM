/**
 * Module-Wise Database Deletion Script
 * 
 * This script allows selective deletion of database entries by module.
 * Users can select which modules to delete (e.g., only quotations) while
 * keeping all other data intact.
 * 
 * Usage: npm run delete:module-data
 *        or: npx tsx scripts/delete-module-data.ts
 */

import * as readline from 'readline'
import { initDatabase, getDatabase, closeDatabase } from '../lib/database'

// Module definitions with table names and dependencies
interface Module {
  id: string
  name: string
  tables: string[]
  dependencies?: string[] // Modules that depend on this one
  warnings?: string[] // Warnings to show before deletion
  cascadeDelete?: boolean // Whether child tables are deleted automatically
}

const MODULES: Module[] = [
  {
    id: 'quotes',
    name: 'Quotations',
    tables: ['quotes', 'quote_items'],
    dependencies: ['invoices'], // Invoices may reference quotes
    warnings: ['Deleting quotations may affect invoices that reference them'],
    cascadeDelete: true, // quote_items deleted automatically
  },
  {
    id: 'invoices',
    name: 'Invoices',
    tables: ['invoices', 'invoice_items'],
    dependencies: ['vehicle_transactions'], // Transactions may reference invoices
    warnings: ['Deleting invoices may affect vehicle transactions that reference them'],
    cascadeDelete: true, // invoice_items deleted automatically
  },
  {
    id: 'purchase_orders',
    name: 'Purchase Orders',
    tables: ['purchase_orders', 'po_items'],
    dependencies: ['invoices'], // Invoices may reference purchase orders
    warnings: ['Deleting purchase orders may affect invoices that reference them'],
    cascadeDelete: true, // po_items deleted automatically
  },
  {
    id: 'customers',
    name: 'Customers',
    tables: ['customers'],
    dependencies: ['quotes', 'invoices'],
    warnings: [
      'Deleting customers will fail if they have associated quotes or invoices',
      'Delete quotations and invoices first if you want to remove customers',
    ],
  },
  {
    id: 'vendors',
    name: 'Vendors',
    tables: ['vendors'],
    dependencies: ['purchase_orders', 'invoices'],
    warnings: [
      'Deleting vendors will fail if they have associated purchase orders or invoices',
      'Delete purchase orders and invoices first if you want to remove vendors',
    ],
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    tables: ['vehicles', 'vehicle_transactions'],
    dependencies: ['quotes', 'invoices'],
    warnings: [
      'Deleting vehicles will also delete all vehicle transactions (CASCADE)',
      'Deleting vehicles may affect quotes and invoices that reference them',
    ],
    cascadeDelete: true, // vehicle_transactions deleted automatically
  },
  {
    id: 'employees',
    name: 'Employees',
    tables: ['employees'],
    dependencies: ['payslips', 'vehicle_transactions'],
    warnings: [
      'Deleting employees will fail if they have associated payslips',
      'Delete payslips first if you want to remove employees',
    ],
  },
  {
    id: 'payslips',
    name: 'Payslips',
    tables: ['payslips'],
    dependencies: [],
  },
  {
    id: 'vehicle_transactions',
    name: 'Vehicle Transactions',
    tables: ['vehicle_transactions'],
    dependencies: [],
    warnings: ['Note: Vehicle transactions are automatically deleted when vehicles are deleted'],
  },
  {
    id: 'expense_categories',
    name: 'Expense Categories (Custom Only)',
    tables: ['expense_categories'],
    dependencies: ['vehicle_transactions'],
    warnings: [
      'Only custom expense categories will be deleted',
      'Predefined categories (Purchase, Maintenance, Insurance, etc.) will be preserved',
    ],
  },
]

// Create readline interface
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

// Get record counts for a module
function getRecordCounts(db: any, module: Module): Record<string, number> {
  const counts: Record<string, number> = {}
  
  for (const table of module.tables) {
    try {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as any
      counts[table] = result.count || 0
    } catch (error: any) {
      console.warn(`Warning: Could not count records in ${table}:`, error.message)
      counts[table] = 0
    }
  }
  
  // Special handling for expense_categories (only count custom ones)
  if (module.id === 'expense_categories') {
    try {
      const result = db.prepare(
        `SELECT COUNT(*) as count FROM expense_categories WHERE isCustom = 1`
      ).get() as any
      counts['expense_categories'] = result.count || 0
    } catch (error: any) {
      counts['expense_categories'] = 0
    }
  }
  
  return counts
}

// Delete module data
function deleteModuleData(db: any, module: Module): { success: boolean; deleted: Record<string, number>; errors: string[] } {
  const deleted: Record<string, number> = {}
  const errors: string[] = []
  
  // Special handling for expense_categories (only delete custom ones)
  if (module.id === 'expense_categories') {
    try {
      const result = db.prepare('DELETE FROM expense_categories WHERE isCustom = 1').run()
      deleted['expense_categories'] = result.changes || 0
    } catch (error: any) {
      errors.push(`Failed to delete from expense_categories: ${error.message}`)
    }
    return { success: errors.length === 0, deleted, errors }
  }
  
  // For modules with CASCADE, delete parent table first (children will be deleted automatically)
  // For other modules, delete all tables in the order specified
  if (module.cascadeDelete && module.tables.length > 1) {
    // Get child table counts before deletion (for reporting)
    const childCounts: Record<string, number> = {}
    for (let i = 1; i < module.tables.length; i++) {
      try {
        const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${module.tables[i]}`).get() as any
        childCounts[module.tables[i]] = countResult.count || 0
      } catch (error: any) {
        childCounts[module.tables[i]] = 0
      }
    }
    
    // Delete parent table first (first table is usually the parent)
    const parentTable = module.tables[0]
    try {
      const result = db.prepare(`DELETE FROM ${parentTable}`).run()
      deleted[parentTable] = result.changes || 0
      // Child tables are deleted automatically via CASCADE
      // Use the counts we got before deletion
      for (let i = 1; i < module.tables.length; i++) {
        deleted[module.tables[i]] = childCounts[module.tables[i]] || 0
      }
    } catch (error: any) {
      // Check if it's a foreign key constraint error
      if (error.message.includes('FOREIGN KEY constraint failed')) {
        errors.push(
          `Cannot delete ${parentTable}: There are dependent records. Delete dependent modules first.`
        )
      } else {
        errors.push(`Failed to delete from ${parentTable}: ${error.message}`)
      }
    }
  } else {
    // For modules without CASCADE or single-table modules, delete all tables
    for (const table of module.tables) {
      try {
        const result = db.prepare(`DELETE FROM ${table}`).run()
        deleted[table] = result.changes || 0
      } catch (error: any) {
        // Check if it's a foreign key constraint error
        if (error.message.includes('FOREIGN KEY constraint failed')) {
          errors.push(
            `Cannot delete ${table}: There are dependent records. Delete dependent modules first.`
          )
        } else {
          errors.push(`Failed to delete from ${table}: ${error.message}`)
        }
      }
    }
  }
  
  return { success: errors.length === 0, deleted, errors }
}

// Display menu and get user selection
async function displayMenu(rl: readline.Interface): Promise<string[]> {
  return new Promise((resolve) => {
    console.log('\n========================================')
    console.log('Module-Wise Database Deletion')
    console.log('========================================\n')
    console.log('Select modules to delete (comma-separated numbers, or "all" for all modules):\n')
    
    MODULES.forEach((module, index) => {
      console.log(`${index + 1}. ${module.name}`)
      if (module.warnings && module.warnings.length > 0) {
        module.warnings.forEach((warning) => {
          console.log(`   ⚠ ${warning}`)
        })
      }
    })
    
    console.log('\n0. Cancel')
    console.log('\n========================================\n')
    
    rl.question('Enter your selection: ', (answer) => {
      const trimmed = answer.trim().toLowerCase()
      
      if (trimmed === '0' || trimmed === 'cancel') {
        resolve([])
        return
      }
      
      if (trimmed === 'all') {
        resolve(MODULES.map((m) => m.id))
        return
      }
      
      const selections = trimmed
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0 && n <= MODULES.length)
        .map((n) => MODULES[n - 1].id)
      
      resolve(selections)
    })
  })
}

// Get confirmation
async function getConfirmation(rl: readline.Interface, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      const trimmed = answer.trim().toLowerCase()
      resolve(trimmed === 'yes' || trimmed === 'y')
    })
  })
}

// Main execution function
async function main(): Promise<void> {
  const rl = createReadlineInterface()
  
  try {
    // Initialize database
    console.log('Initializing database...')
    const db = initDatabase()
    
    if (!db) {
      console.error('❌ Failed to initialize database. Make sure better-sqlite3 is installed.')
      process.exit(1)
    }
    
    // Get user selection
    const selectedModuleIds = await displayMenu(rl)
    
    if (selectedModuleIds.length === 0) {
      console.log('\nOperation cancelled.')
      rl.close()
      return
    }
    
    // Get selected modules
    const selectedModules = MODULES.filter((m) => selectedModuleIds.includes(m.id))
    
    // Show record counts
    console.log('\n========================================')
    console.log('Current Record Counts:')
    console.log('========================================\n')
    
    const counts: Record<string, Record<string, number>> = {}
    let totalRecords = 0
    
    for (const module of selectedModules) {
      counts[module.id] = getRecordCounts(db, module)
      const moduleTotal = Object.values(counts[module.id]).reduce((sum, count) => sum + count, 0)
      totalRecords += moduleTotal
      
      console.log(`${module.name}:`)
      for (const [table, count] of Object.entries(counts[module.id])) {
        console.log(`  ${table}: ${count} records`)
      }
      console.log(`  Total: ${moduleTotal} records\n`)
    }
    
    console.log(`Total records to be deleted: ${totalRecords}\n`)
    
    if (totalRecords === 0) {
      console.log('No records found to delete.')
      rl.close()
      return
    }
    
    // Show warnings
    const allWarnings = new Set<string>()
    for (const module of selectedModules) {
      if (module.warnings) {
        module.warnings.forEach((w) => allWarnings.add(w))
      }
      if (module.dependencies && module.dependencies.length > 0) {
        const depModules = module.dependencies
          .map((depId) => MODULES.find((m) => m.id === depId)?.name)
          .filter(Boolean)
        if (depModules.length > 0) {
          allWarnings.add(
            `This module is referenced by: ${depModules.join(', ')}. Deletion may fail if dependencies exist.`
          )
        }
      }
    }
    
    if (allWarnings.size > 0) {
      console.log('========================================')
      console.log('⚠ Warnings:')
      console.log('========================================\n')
      Array.from(allWarnings).forEach((warning) => {
        console.log(`⚠ ${warning}`)
      })
      console.log('')
    }
    
    // Get confirmation
    const confirmed = await getConfirmation(
      rl,
      `\nAre you sure you want to delete ${totalRecords} record(s) from ${selectedModules.length} module(s)?`
    )
    
    if (!confirmed) {
      console.log('\nOperation cancelled.')
      rl.close()
      return
    }
    
    // Delete in proper order (respecting dependencies)
    // Order: transactions, items (handled by CASCADE), then parent tables
    const deletionOrder = [
      'vehicle_transactions',
      'payslips',
      'quote_items', // Will be handled by CASCADE, but explicit for clarity
      'invoice_items', // Will be handled by CASCADE
      'po_items', // Will be handled by CASCADE
      'quotes',
      'invoices',
      'purchase_orders',
      'employees',
      'vehicles',
      'customers',
      'vendors',
      'expense_categories',
    ]
    
    // Sort selected modules by deletion order
    const sortedModules = selectedModules.sort((a, b) => {
      const aOrder = deletionOrder.indexOf(a.tables[0])
      const bOrder = deletionOrder.indexOf(b.tables[0])
      return (aOrder === -1 ? 999 : aOrder) - (bOrder === -1 ? 999 : bOrder)
    })
    
    console.log('\n========================================')
    console.log('Deleting Data...')
    console.log('========================================\n')
    
    let totalDeleted = 0
    const allErrors: string[] = []
    
    for (const module of sortedModules) {
      console.log(`Deleting ${module.name}...`)
      const result = deleteModuleData(db, module)
      
      if (result.success) {
        const moduleDeleted = Object.values(result.deleted).reduce((sum, count) => sum + count, 0)
        totalDeleted += moduleDeleted
        console.log(`✓ Deleted ${moduleDeleted} record(s) from ${module.name}`)
        
        // Show breakdown
        for (const [table, count] of Object.entries(result.deleted)) {
          if (count > 0) {
            console.log(`  - ${table}: ${count} record(s)`)
          }
        }
      } else {
        console.log(`✗ Failed to delete ${module.name}`)
        result.errors.forEach((error) => {
          console.log(`  Error: ${error}`)
          allErrors.push(error)
        })
      }
      console.log('')
    }
    
    // Summary
    console.log('========================================')
    console.log('Deletion Summary')
    console.log('========================================\n')
    console.log(`Total records deleted: ${totalDeleted}`)
    
    if (allErrors.length > 0) {
      console.log(`\nErrors encountered: ${allErrors.length}`)
      allErrors.forEach((error) => {
        console.log(`  - ${error}`)
      })
    }
    
    if (totalDeleted > 0 && allErrors.length === 0) {
      console.log('\n✓ Deletion completed successfully!')
    } else if (allErrors.length > 0) {
      console.log('\n⚠ Deletion completed with errors. Some records may not have been deleted.')
    }
    
    console.log('\n========================================\n')
  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    rl.close()
    closeDatabase()
  }
}

// Run the script
main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

