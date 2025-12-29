/**
 * File Storage Service
 * Handles file uploads, organizes by type, and stores relative paths
 */

import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_BASE_DIR = path.join(process.cwd(), 'data', 'uploads')
const BRANDING_BASE_DIR = path.join(process.cwd(), 'data', 'branding')

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

// Ensure branding directory exists
export function ensureBrandingDirectory() {
  if (!fs.existsSync(BRANDING_BASE_DIR)) {
    fs.mkdirSync(BRANDING_BASE_DIR, { recursive: true })
  }
}

// Initialize directories on module load
ensureDirectories()
ensureBrandingDirectory()

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

/**
 * Check which branding files exist and their extensions
 * @returns Object with existence flags and extensions for each branding type
 */
export function checkBrandingFiles(): { 
  logo: boolean; 
  seal: boolean; 
  signature: boolean;
  extensions: { logo: string | null; seal: string | null; signature: string | null }
} {
  ensureBrandingDirectory()
  
  const possibleExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
  const result = {
    logo: false,
    seal: false,
    signature: false,
    extensions: { logo: null as string | null, seal: null as string | null, signature: null as string | null }
  }
  
  const brandingTypes: Array<'logo' | 'seal' | 'signature'> = ['logo', 'seal', 'signature']
  
  for (const type of brandingTypes) {
    for (const ext of possibleExtensions) {
      const filePath = path.join(BRANDING_BASE_DIR, `${type}${ext}`)
      if (fs.existsSync(filePath)) {
        result[type] = true
        result.extensions[type] = ext.substring(1) // Remove leading dot
        break
      }
    }
  }
  
  return result
}

/**
 * Save branding file (logo, seal, or signature) to static location
 * @param file Buffer or file data
 * @param filename Original filename
 * @param brandingType 'logo', 'seal', or 'signature'
 * @returns Relative path to saved file
 */
export function saveBrandingFile(file: Buffer, filename: string, brandingType: 'logo' | 'seal' | 'signature'): string {
  ensureBrandingDirectory()
  
  // Get file extension from original filename
  let ext = path.extname(filename).toLowerCase()
  // If no extension, default to .png
  if (!ext || ext === '') {
    ext = '.png'
  }
  // Ensure extension starts with dot
  if (!ext.startsWith('.')) {
    ext = '.' + ext
  }
  
  // Use fixed filename based on branding type
  const fixedFilename = `${brandingType}${ext}`
  const filePath = path.join(BRANDING_BASE_DIR, fixedFilename)
  
  // Delete old file if it exists (might have different extension)
  const possibleExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
  possibleExtensions.forEach(oldExt => {
    if (oldExt !== ext) {
      const oldFilePath = path.join(BRANDING_BASE_DIR, `${brandingType}${oldExt}`)
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath)
        } catch (error) {
          console.error(`Error deleting old branding file ${oldFilePath}:`, error)
        }
      }
    }
  })
  
  // Save new file
  fs.writeFileSync(filePath, file)
  
  // Return relative path
  return `./data/branding/${fixedFilename}`
}

