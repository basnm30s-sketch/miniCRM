/**
 * Database Configuration
 * Abstracts database path resolution for both Electron and browser dev environments
 */

import * as path from 'path'
import * as fs from 'fs'

/**
 * Get the database directory path
 * - In Electron: Uses app.getPath('userData') when available
 * - In browser dev: Uses process.cwd() + '/data'
 * - Can be overridden with DB_PATH environment variable
 */
export function getDatabaseDir(): string {
  // Environment variable override (highest priority)
  if (process.env.DB_PATH) {
    const dbPath = process.env.DB_PATH
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    return dbDir
  }

  // Try to detect Electron environment
  // In Electron main process, 'electron' module is available
  try {
    // Check if we're in Electron main process
    const electron = require('electron')
    if (electron && electron.app) {
      const userDataPath = electron.app.getPath('userData')
      const dbDir = path.join(userDataPath, 'data')
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }
      return dbDir
    }
  } catch (error) {
    // Not in Electron or electron module not available
    // Fall through to browser dev mode
  }

  // Browser dev mode: use project folder
  const dbDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  return dbDir
}

/**
 * Get the full database file path
 */
export function getDatabasePath(): string {
  const dbDir = getDatabaseDir()
  const filename = process.env.DB_FILENAME || 'imanage.db'
  return path.join(dbDir, filename)
}

/**
 * Get the backups directory path
 */
export function getBackupsDir(): string {
  const dbDir = getDatabaseDir()
  const backupsDir = path.join(dbDir, 'backups')
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true })
  }
  return backupsDir
}
