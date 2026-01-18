/**
 * Database Backup Script
 * Creates a timestamped backup of the SQLite database before migrations
 */

import * as fs from 'fs'
import * as path from 'path'
import { getDatabasePath, getBackupsDir } from '../lib/db-config'

/**
 * Create a backup of the database
 * @returns The path to the backup file, or null if backup failed
 */
export function backupDatabase(): string | null {
  try {
    const dbPath = getDatabasePath()
    
    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      console.log('Database file does not exist, skipping backup')
      return null
    }

    // Get backups directory
    const backupsDir = getBackupsDir()
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dbFilename = path.basename(dbPath)
    const backupFilename = `${dbFilename}.backup.${timestamp}`
    const backupPath = path.join(backupsDir, backupFilename)

    // Copy database file
    fs.copyFileSync(dbPath, backupPath)
    
    console.log(`Database backed up to: ${backupPath}`)
    return backupPath
  } catch (error) {
    console.error('Failed to backup database:', error)
    return null
  }
}

/**
 * Clean up old backups, keeping only the most recent N backups
 * @param keepCount Number of recent backups to keep (default: 10)
 */
export function cleanupOldBackups(keepCount: number = 10): void {
  try {
    const backupsDir = getBackupsDir()
    
    // Get all backup files
    const files = fs.readdirSync(backupsDir)
      .filter(file => file.endsWith('.backup.'))
      .map(file => ({
        name: file,
        path: path.join(backupsDir, file),
        mtime: fs.statSync(path.join(backupsDir, file)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()) // Sort by newest first

    // Delete old backups beyond keepCount
    if (files.length > keepCount) {
      const toDelete = files.slice(keepCount)
      for (const file of toDelete) {
        fs.unlinkSync(file.path)
        console.log(`Deleted old backup: ${file.name}`)
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old backups:', error)
  }
}

// CLI usage
if (require.main === module) {
  const backupPath = backupDatabase()
  if (backupPath) {
    cleanupOldBackups()
    console.log('Backup completed successfully')
    process.exit(0)
  } else {
    console.error('Backup failed')
    process.exit(1)
  }
}
