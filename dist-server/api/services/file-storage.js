"use strict";
/**
 * File Storage Service
 * Handles file uploads, organizes by type, and stores relative paths
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureBrandingDirectory = ensureBrandingDirectory;
exports.saveFile = saveFile;
exports.getFilePath = getFilePath;
exports.readFile = readFile;
exports.deleteFile = deleteFile;
exports.fileExists = fileExists;
exports.saveBrandingFile = saveBrandingFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
<<<<<<< Updated upstream
const UPLOAD_BASE_DIR = path.join(process.cwd(), 'data', 'uploads');
const BRANDING_BASE_DIR = path.join(process.cwd(), 'data', 'branding');
=======
/**
 * Get the data directory path
 * Uses Render persistent disk if available, otherwise uses project folder
 */
function getDataDirectory() {
    // Check for Render persistent disk path (set via environment variable)
    const renderDiskPath = process.env.RENDER_DISK_PATH;
    if (renderDiskPath) {
        // Use Render persistent disk for data persistence across deployments
        const dataDir = path.join(renderDiskPath, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        return dataDir;
    }
    // Fall back to project folder for local development/Electron
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    return dataDir;
}
/**
 * Get the repo data directory path (where default files from git are located)
 * Always uses process.cwd() regardless of RENDER_DISK_PATH
 */
function getRepoDataDirectory() {
    return path.join(process.cwd(), 'data');
}
/**
 * Initialize default branding files from repo to persistent disk
 * Copies files from repo location to persistent disk if they don't exist in persistent disk
 * This ensures default branding files are available on first Render deployment
 */
function initializeDefaultBrandingFiles() {
    const renderDiskPath = process.env.RENDER_DISK_PATH;
    // Only run this if RENDER_DISK_PATH is set (Render deployment)
    if (!renderDiskPath) {
        return; // Local/Electron: files are already in the right place
    }
    const persistentBrandingDir = path.join(renderDiskPath, 'data', 'branding');
    const repoBrandingDir = path.join(getRepoDataDirectory(), 'branding');
    // Ensure persistent branding directory exists
    if (!fs.existsSync(persistentBrandingDir)) {
        fs.mkdirSync(persistentBrandingDir, { recursive: true });
    }
    // Log paths for debugging
    console.log(`[Branding Init] RENDER_DISK_PATH: ${renderDiskPath}`);
    console.log(`[Branding Init] process.cwd(): ${process.cwd()}`);
    console.log(`[Branding Init] Repo branding dir: ${repoBrandingDir}`);
    console.log(`[Branding Init] Persistent branding dir: ${persistentBrandingDir}`);
    console.log(`[Branding Init] Repo dir exists: ${fs.existsSync(repoBrandingDir)}`);
    // List files in repo branding dir if it exists
    if (fs.existsSync(repoBrandingDir)) {
        try {
            const files = fs.readdirSync(repoBrandingDir);
            console.log(`[Branding Init] Files in repo branding dir: ${files.join(', ')}`);
        }
        catch (err) {
            console.error(`[Branding Init] Error reading repo branding dir:`, err);
        }
    }
    // List of default branding files that might exist in repo
    const brandingTypes = ['logo', 'seal', 'signature'];
    const possibleExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    let copiedCount = 0;
    for (const type of brandingTypes) {
        for (const ext of possibleExtensions) {
            const repoFilePath = path.join(repoBrandingDir, `${type}${ext}`);
            const persistentFilePath = path.join(persistentBrandingDir, `${type}${ext}`);
            // If file exists in repo but not in persistent disk, copy it
            if (fs.existsSync(repoFilePath) && !fs.existsSync(persistentFilePath)) {
                try {
                    fs.copyFileSync(repoFilePath, persistentFilePath);
                    console.log(`[Branding Init] Copied: ${type}${ext} from ${repoFilePath} to ${persistentFilePath}`);
                    copiedCount++;
                }
                catch (error) {
                    console.error(`[Branding Init] Error copying ${type}${ext}:`, error?.message || error);
                }
            }
        }
    }
    if (copiedCount > 0) {
        console.log(`[Branding Init] Successfully copied ${copiedCount} default branding file(s)`);
    }
    else {
        console.log(`[Branding Init] No files copied (may already exist or not found in repo)`);
    }
}
// Get base directories using persistent storage on Render
const dataDir = getDataDirectory();
const UPLOAD_BASE_DIR = path.join(dataDir, 'uploads');
const BRANDING_BASE_DIR = path.join(dataDir, 'branding');
>>>>>>> Stashed changes
// Ensure upload directories exist
function ensureDirectories() {
    const dirs = [
        path.join(UPLOAD_BASE_DIR, 'logos'),
        path.join(UPLOAD_BASE_DIR, 'documents'),
        path.join(UPLOAD_BASE_DIR, 'signatures'),
    ];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}
// Ensure branding directory exists and initialize default files
function ensureBrandingDirectory() {
    if (!fs.existsSync(BRANDING_BASE_DIR)) {
        fs.mkdirSync(BRANDING_BASE_DIR, { recursive: true });
    }
    // Initialize default branding files from repo (for Render deployments)
    initializeDefaultBrandingFiles();
}
// Initialize directories on module load
ensureDirectories();
ensureBrandingDirectory();
/**
 * Save uploaded file
 * @param file Buffer or file data
 * @param filename Original filename
 * @param type File type: 'logos', 'documents', or 'signatures'
 * @returns Relative path to saved file
 */
function saveFile(file, filename, type) {
    ensureDirectories();
    // Generate unique filename
    const ext = path.extname(filename);
    const uniqueFilename = `${(0, uuid_1.v4)()}${ext}`;
    const uploadDir = path.join(UPLOAD_BASE_DIR, type);
    const filePath = path.join(uploadDir, uniqueFilename);
    // Save file
    fs.writeFileSync(filePath, file);
    // Return relative path
    return `./data/uploads/${type}/${uniqueFilename}`;
}
/**
 * Get file path (absolute)
 * @param relativePath Relative path from database
 * @returns Absolute file path
 */
function getFilePath(relativePath) {
    // If already absolute, return as is
    if (path.isAbsolute(relativePath)) {
        return relativePath;
    }
<<<<<<< Updated upstream
    // Convert relative path to absolute
=======
    // Convert relative path to absolute using data directory
    const dataDir = getDataDirectory();
    // Special handling for paths starting with './data/' - strip both './' and 'data/'
    // since dataDir already includes 'data'
    if (relativePath.startsWith('./data/')) {
        return path.join(dataDir, relativePath.substring(7)); // Skip './data/'
    }
>>>>>>> Stashed changes
    if (relativePath.startsWith('./')) {
        return path.join(process.cwd(), relativePath.substring(2));
    }
    return path.join(process.cwd(), relativePath);
}
/**
 * Read file with fallback to repo location for branding files
 * @param relativePath Relative path from database
 * @returns File buffer
 */
function readFile(relativePath) {
    const filePath = getFilePath(relativePath);
    // If file exists at resolved path, read it
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
    }
    // Fallback: For branding files, check repo location
    if (relativePath.includes('branding/')) {
        const repoDataDir = getRepoDataDirectory();
        // Handle './data/' paths correctly - strip both './' and 'data/' since repoDataDir already includes 'data'
        let repoFilePath;
        if (relativePath.startsWith('./data/')) {
            repoFilePath = path.join(repoDataDir, relativePath.substring(7)); // Skip './data/'
        }
        else if (relativePath.startsWith('./')) {
            repoFilePath = path.join(repoDataDir, relativePath.substring(2));
        }
        else {
            repoFilePath = path.join(repoDataDir, relativePath);
        }
        console.log(`[File Storage] Checking repo location: ${repoFilePath}, exists: ${fs.existsSync(repoFilePath)}`);
        if (fs.existsSync(repoFilePath)) {
            // If using persistent disk, copy to persistent disk for future requests
            const renderDiskPath = process.env.RENDER_DISK_PATH;
            if (renderDiskPath) {
                try {
                    const persistentFilePath = getFilePath(relativePath);
                    const persistentDir = path.dirname(persistentFilePath);
                    if (!fs.existsSync(persistentDir)) {
                        fs.mkdirSync(persistentDir, { recursive: true });
                    }
                    fs.copyFileSync(repoFilePath, persistentFilePath);
                    console.log(`[File Storage] Copied branding file from repo to persistent disk: ${relativePath}`);
                }
                catch (copyError) {
                    console.warn(`[File Storage] Could not copy to persistent disk, serving from repo: ${copyError?.message}`);
                }
            }
            // Serve from repo location
            return fs.readFileSync(repoFilePath);
        }
    }
    // If still not found, throw error with more context
    const renderDiskPath = process.env.RENDER_DISK_PATH;
    const expectedPath = renderDiskPath
        ? path.join(renderDiskPath, 'data', relativePath.replace('./', ''))
        : path.join(process.cwd(), relativePath.replace('./', ''));
    throw new Error(`File not found: ${relativePath}. Checked: ${filePath}, Expected: ${expectedPath}`);
}
/**
 * Delete file
 * @param relativePath Relative path from database
 */
function deleteFile(relativePath) {
    try {
        const filePath = getFilePath(relativePath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    catch (error) {
        console.error('Error deleting file:', error);
    }
}
/**
 * Check if file exists with fallback to repo location for branding files
 * @param relativePath Relative path from database
 * @returns True if file exists
 */
function fileExists(relativePath) {
    try {
        const filePath = getFilePath(relativePath);
        if (fs.existsSync(filePath)) {
            return true;
        }
        // Fallback: For branding files, always check repo location
        if (relativePath.includes('branding/')) {
            const repoDataDir = getRepoDataDirectory();
            // Handle './data/' paths correctly - strip both './' and 'data/' since repoDataDir already includes 'data'
            let repoFilePath;
            if (relativePath.startsWith('./data/')) {
                repoFilePath = path.join(repoDataDir, relativePath.substring(7)); // Skip './data/'
            }
            else if (relativePath.startsWith('./')) {
                repoFilePath = path.join(repoDataDir, relativePath.substring(2));
            }
            else {
                repoFilePath = path.join(repoDataDir, relativePath);
            }
            const exists = fs.existsSync(repoFilePath);
            if (exists) {
                console.log(`[File Storage] Found branding file in repo location: ${repoFilePath}`);
            }
            return exists;
        }
        return false;
    }
    catch {
        return false;
    }
}
/**
<<<<<<< Updated upstream
=======
 * Check which branding files exist and their extensions
 * Ensures default files are initialized before checking
 * @returns Object with existence flags and extensions for each branding type
 */
function checkBrandingFiles() {
    ensureBrandingDirectory(); // This will initialize default files if needed
    const possibleExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const result = {
        logo: false,
        seal: false,
        signature: false,
        extensions: { logo: null, seal: null, signature: null }
    };
    const brandingTypes = ['logo', 'seal', 'signature'];
    for (const type of brandingTypes) {
        for (const ext of possibleExtensions) {
            const filePath = path.join(BRANDING_BASE_DIR, `${type}${ext}`);
            if (fs.existsSync(filePath)) {
                result[type] = true;
                result.extensions[type] = ext.substring(1); // Remove leading dot
                break;
            }
        }
    }
    return result;
}
/**
>>>>>>> Stashed changes
 * Save branding file (logo, seal, or signature) to static location
 * @param file Buffer or file data
 * @param filename Original filename
 * @param brandingType 'logo', 'seal', or 'signature'
 * @returns Relative path to saved file
 */
function saveBrandingFile(file, filename, brandingType) {
    ensureBrandingDirectory();
    // Get file extension from original filename
    const ext = path.extname(filename).toLowerCase();
    // Use fixed filename based on branding type
    const fixedFilename = `${brandingType}${ext}`;
    const filePath = path.join(BRANDING_BASE_DIR, fixedFilename);
    // Delete old file if it exists (might have different extension)
    const possibleExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    possibleExtensions.forEach(oldExt => {
        if (oldExt !== ext) {
            const oldFilePath = path.join(BRANDING_BASE_DIR, `${brandingType}${oldExt}`);
            if (fs.existsSync(oldFilePath)) {
                try {
                    fs.unlinkSync(oldFilePath);
                }
                catch (error) {
                    console.error(`Error deleting old branding file ${oldFilePath}:`, error);
                }
            }
        }
    });
    // Save new file
    fs.writeFileSync(filePath, file);
    // Return relative path
    return `./data/branding/${fixedFilename}`;
}
