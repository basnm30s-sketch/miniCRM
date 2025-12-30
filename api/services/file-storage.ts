/**
 * File Storage Service
 * Handles file uploads, organizes by type, and stores relative paths
 */

import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

/**
 * Get the data directory path
 * Uses Render persistent disk if available, otherwise uses project folder
 */
function getDataDirectory(): string {
  // Check for Render persistent disk path (set via environment variable)
  const renderDiskPath = process.env.RENDER_DISK_PATH
  if (renderDiskPath) {
    // Use Render persistent disk for data persistence across deployments
    const dataDir = path.join(renderDiskPath, 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    return dataDir
  }
  
  // Fall back to project folder for local development/Electron
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return dataDir
}

/**
 * Get the repo data directory path (where default files from git are located)
 * Always uses process.cwd() regardless of RENDER_DISK_PATH
 */
function getRepoDataDirectory(): string {
  return path.join(process.cwd(), 'data')
}

/**
 * Initialize default branding files from repo to persistent disk
 * Copies files from repo location to persistent disk if they don't exist in persistent disk
 * This ensures default branding files are available on first Render deployment
 */
function initializeDefaultBrandingFiles(): void {
  const renderDiskPath = process.env.RENDER_DISK_PATH
  // Only run this if RENDER_DISK_PATH is set (Render deployment)
  if (!renderDiskPath) {
    return // Local/Electron: files are already in the right place
  }

  const persistentBrandingDir = path.join(renderDiskPath, 'data', 'branding')
  const repoBrandingDir = path.join(getRepoDataDirectory(), 'branding')
  
  // Ensure persistent branding directory exists
  if (!fs.existsSync(persistentBrandingDir)) {
    fs.mkdirSync(persistentBrandingDir, { recursive: true })
  }

  // Log paths for debugging
  console.log(`[Branding Init] RENDER_DISK_PATH: ${renderDiskPath}`)
  console.log(`[Branding Init] process.cwd(): ${process.cwd()}`)
  console.log(`[Branding Init] Repo branding dir: ${repoBrandingDir}`)
  console.log(`[Branding Init] Persistent branding dir: ${persistentBrandingDir}`)
  console.log(`[Branding Init] Repo dir exists: ${fs.existsSync(repoBrandingDir)}`)
  
  // List files in repo branding dir if it exists
  if (fs.existsSync(repoBrandingDir)) {
    try {
      const files = fs.readdirSync(repoBrandingDir)
      console.log(`[Branding Init] Files in repo branding dir: ${files.join(', ')}`)
    } catch (err) {
      console.error(`[Branding Init] Error reading repo branding dir:`, err)
    }
  }

  // List of default branding files that might exist in repo
  const brandingTypes = ['logo', 'seal', 'signature']
  const possibleExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']

  let copiedCount = 0
  for (const type of brandingTypes) {
    for (const ext of possibleExtensions) {
      const repoFilePath = path.join(repoBrandingDir, `${type}${ext}`)
      const persistentFilePath = path.join(persistentBrandingDir, `${type}${ext}`)
      
      // If file exists in repo but not in persistent disk, copy it
      if (fs.existsSync(repoFilePath) && !fs.existsSync(persistentFilePath)) {
        try {
          fs.copyFileSync(repoFilePath, persistentFilePath)
          console.log(`[Branding Init] Copied: ${type}${ext} from ${repoFilePath} to ${persistentFilePath}`)
          copiedCount++
        } catch (error: any) {
          console.error(`[Branding Init] Error copying ${type}${ext}:`, error?.message || error)
        }
      }
    }
  }
  
  if (copiedCount > 0) {
    console.log(`[Branding Init] Successfully copied ${copiedCount} default branding file(s)`)
  } else {
    console.log(`[Branding Init] No files copied (may already exist or not found in repo)`)
  }
}

// Get base directories using persistent storage on Render
const dataDir = getDataDirectory()
const UPLOAD_BASE_DIR = path.join(dataDir, 'uploads')
const BRANDING_BASE_DIR = path.join(dataDir, 'branding')

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

// Ensure branding directory exists and initialize default files
export function ensureBrandingDirectory() {
  if (!fs.existsSync(BRANDING_BASE_DIR)) {
    fs.mkdirSync(BRANDING_BASE_DIR, { recursive: true })
  }
  // Initialize default branding files from repo (for Render deployments)
  initializeDefaultBrandingFiles()
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
  
  // Convert relative path to absolute using data directory
  const dataDir = getDataDirectory()
  
  // Special handling for paths starting with './data/' - strip both './' and 'data/'
  // since dataDir already includes 'data'
  if (relativePath.startsWith('./data/')) {
    return path.join(dataDir, relativePath.substring(7)) // Skip './data/'
  }
  
  if (relativePath.startsWith('./')) {
    return path.join(dataDir, relativePath.substring(2))
  }
  
  // If path starts with 'data/', use data directory directly
  if (relativePath.startsWith('data/')) {
    return path.join(dataDir, relativePath.substring(5))
  }
  
  // Fallback: assume it's relative to data directory
  return path.join(dataDir, relativePath)
}

/**
 * Read file with fallback to repo location for branding files
 * @param relativePath Relative path from database
 * @returns File buffer
 */
export function readFile(relativePath: string): Buffer {
  const filePath = getFilePath(relativePath)
  
  // If file exists at resolved path, read it
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath)
  }
  
  // Fallback: For branding files, check repo location
  if (relativePath.includes('branding/')) {
    const repoDataDir = getRepoDataDirectory()
    // Handle './data/' paths correctly - strip both './' and 'data/' since repoDataDir already includes 'data'
    let repoFilePath: string
    if (relativePath.startsWith('./data/')) {
      repoFilePath = path.join(repoDataDir, relativePath.substring(7)) // Skip './data/'
    } else if (relativePath.startsWith('./')) {
      repoFilePath = path.join(repoDataDir, relativePath.substring(2))
    } else {
      repoFilePath = path.join(repoDataDir, relativePath)
    }
    
    console.log(`[File Storage] Checking repo location: ${repoFilePath}, exists: ${fs.existsSync(repoFilePath)}`)
    
    if (fs.existsSync(repoFilePath)) {
      // If using persistent disk, copy to persistent disk for future requests
      const renderDiskPath = process.env.RENDER_DISK_PATH
      if (renderDiskPath) {
        try {
          const persistentFilePath = getFilePath(relativePath)
          const persistentDir = path.dirname(persistentFilePath)
          if (!fs.existsSync(persistentDir)) {
            fs.mkdirSync(persistentDir, { recursive: true })
          }
          fs.copyFileSync(repoFilePath, persistentFilePath)
          console.log(`[File Storage] Copied branding file from repo to persistent disk: ${relativePath}`)
        } catch (copyError: any) {
          console.warn(`[File Storage] Could not copy to persistent disk, serving from repo: ${copyError?.message}`)
        }
      }
      // Serve from repo location
      return fs.readFileSync(repoFilePath)
    }
  }
  
  // If still not found, throw error with more context
  const renderDiskPath = process.env.RENDER_DISK_PATH
  const expectedPath = renderDiskPath 
    ? path.join(renderDiskPath, 'data', relativePath.replace('./', ''))
    : path.join(process.cwd(), relativePath.replace('./', ''))
  throw new Error(`File not found: ${relativePath}. Checked: ${filePath}, Expected: ${expectedPath}`)
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
 * Check if file exists with fallback to repo location for branding files
 * @param relativePath Relative path from database
 * @returns True if file exists
 */
export function fileExists(relativePath: string): boolean {
  try {
    const filePath = getFilePath(relativePath)
    if (fs.existsSync(filePath)) {
      return true
    }
    
    // Fallback: For branding files, always check repo location
    if (relativePath.includes('branding/')) {
      const repoDataDir = getRepoDataDirectory()
      // Handle './data/' paths correctly - strip both './' and 'data/' since repoDataDir already includes 'data'
      let repoFilePath: string
      if (relativePath.startsWith('./data/')) {
        repoFilePath = path.join(repoDataDir, relativePath.substring(7)) // Skip './data/'
      } else if (relativePath.startsWith('./')) {
        repoFilePath = path.join(repoDataDir, relativePath.substring(2))
      } else {
        repoFilePath = path.join(repoDataDir, relativePath)
      }
      const exists = fs.existsSync(repoFilePath)
      if (exists) {
        console.log(`[File Storage] Found branding file in repo location: ${repoFilePath}`)
      }
      return exists
    }
    
    return false
  } catch {
    return false
  }
}

/**
 * Check which branding files exist and their extensions
 * Ensures default files are initialized before checking
 * @returns Object with existence flags and extensions for each branding type
 */
export function checkBrandingFiles(): { 
  logo: boolean; 
  seal: boolean; 
  signature: boolean;
  extensions: { logo: string | null; seal: string | null; signature: string | null }
} {
  ensureBrandingDirectory() // This will initialize default files if needed
  
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

