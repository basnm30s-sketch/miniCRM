/**
 * File Storage Service
 * Handles file uploads, organizes by type, and stores relative paths
 */

import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_BASE_DIR = path.join(process.cwd(), 'data', 'uploads')

// Ensure upload directories exist
function ensureDirectories() {
  const dirs = [
    path.join(UPLOAD_BASE_DIR, 'logos'),
    path.join(UPLOAD_BASE_DIR, 'documents'),
    path.join(UPLOAD_BASE_DIR, 'signatures'),
  ]
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

// Initialize directories on module load
ensureDirectories()

/**
 * Save uploaded file
 * @param file Buffer or file data
 * @param filename Original filename
 * @param type File type: 'logos', 'documents', or 'signatures'
 * @returns Relative path to saved file
 */
export function saveFile(file: Buffer, filename: string, type: 'logos' | 'documents' | 'signatures'): string {
  ensureDirectories()
  
  // Generate unique filename
  const ext = path.extname(filename)
  const uniqueFilename = `${uuidv4()}${ext}`
  const uploadDir = path.join(UPLOAD_BASE_DIR, type)
  const filePath = path.join(uploadDir, uniqueFilename)
  
  // Save file
  fs.writeFileSync(filePath, file)
  
  // Return relative path
  return `./data/uploads/${type}/${uniqueFilename}`
}

/**
 * Get file path (absolute)
 * @param relativePath Relative path from database
 * @returns Absolute file path
 */
export function getFilePath(relativePath: string): string {
  // If already absolute, return as is
  if (path.isAbsolute(relativePath)) {
    return relativePath
  }
  
  // Convert relative path to absolute
  if (relativePath.startsWith('./')) {
    return path.join(process.cwd(), relativePath.substring(2))
  }
  
  return path.join(process.cwd(), relativePath)
}

/**
 * Read file
 * @param relativePath Relative path from database
 * @returns File buffer
 */
export function readFile(relativePath: string): Buffer {
  const filePath = getFilePath(relativePath)
  return fs.readFileSync(filePath)
}

/**
 * Delete file
 * @param relativePath Relative path from database
 */
export function deleteFile(relativePath: string): void {
  try {
    const filePath = getFilePath(relativePath)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (error) {
    console.error('Error deleting file:', error)
  }
}

/**
 * Check if file exists
 * @param relativePath Relative path from database
 * @returns True if file exists
 */
export function fileExists(relativePath: string): boolean {
  try {
    const filePath = getFilePath(relativePath)
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}

