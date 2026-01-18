/**
 * Database Migration Runner
 * Applies Drizzle migrations to the database
 */

import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { getDb } from './index'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Run pending migrations
 */
export function runMigrations() {
  try {
    const db = getDb()
    const migrationsFolder = path.join(process.cwd(), 'drizzle', 'migrations')
    
    // Check if migrations folder exists
    if (!fs.existsSync(migrationsFolder)) {
      console.log('No migrations folder found, skipping migrations')
      return
    }

    console.log('Running database migrations...')
    migrate(db, { migrationsFolder })
    console.log('Migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

// Auto-run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
}
