/**
 * Drizzle Database Connection
 * Singleton instance for database access
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as path from 'path'
import { getDatabasePath } from '../../lib/db-config'
import * as schema from './schema'

let dbInstance: ReturnType<typeof drizzle> | null = null
let sqliteInstance: Database.Database | null = null

/**
 * Get or create the Drizzle database instance
 */
export function getDb() {
  if (dbInstance) {
    return dbInstance
  }

  try {
    const dbPath = getDatabasePath()
    sqliteInstance = new Database(dbPath)
    
    // Enable foreign keys
    sqliteInstance.pragma('foreign_keys = ON')
    
    // Create Drizzle instance
    dbInstance = drizzle(sqliteInstance, { schema })
    
    console.log(`Drizzle database initialized at: ${dbPath}`)
    return dbInstance
  } catch (error) {
    console.error('Failed to initialize Drizzle database:', error)
    throw error
  }
}

/**
 * Close the database connection
 */
export function closeDb() {
  if (sqliteInstance) {
    sqliteInstance.close()
    sqliteInstance = null
    dbInstance = null
  }
}

// Export singleton instance
export const db = getDb()

// Export schema for convenience
export * from './schema'
