/**
 * Drizzle Database Connection
 * Singleton instance for database access
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
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
    
    // Check if database directory exists, create if it doesn't
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      console.log(`Creating database directory: ${dbDir}`)
      fs.mkdirSync(dbDir, { recursive: true })
    }
    
    // Check if database file exists
    const dbExists = fs.existsSync(dbPath)
    if (!dbExists) {
      console.warn(`Database file does not exist at: ${dbPath}. It will be created on first write.`)
    }
    
    // Initialize database connection
    sqliteInstance = new Database(dbPath)
    
    // Enable foreign keys
    sqliteInstance.pragma('foreign_keys = ON')
    
    // Create Drizzle instance
    dbInstance = drizzle(sqliteInstance, { schema })
    
    console.log(`Drizzle database initialized at: ${dbPath}`)
    return dbInstance
  } catch (error: any) {
    console.error('Failed to initialize Drizzle database:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      name: error?.name,
    })
    // Re-throw with more context
    throw new Error(`Database initialization failed: ${error?.message || 'Unknown error'}`)
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
