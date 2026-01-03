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
exports.checkBrandingFiles = checkBrandingFiles;
exports.saveBrandingFile = saveBrandingFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const UPLOAD_BASE_DIR = path.join(process.cwd(), 'data', 'uploads');
const BRANDING_BASE_DIR = path.join(process.cwd(), 'data', 'branding');
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
// Ensure branding directory exists
function ensureBrandingDirectory() {
    if (!fs.existsSync(BRANDING_BASE_DIR)) {
        fs.mkdirSync(BRANDING_BASE_DIR, { recursive: true });
    }
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
    // Convert relative path to absolute
    if (relativePath.startsWith('./')) {
        return path.join(process.cwd(), relativePath.substring(2));
    }
    return path.join(process.cwd(), relativePath);
}
/**
 * Read file
 * @param relativePath Relative path from database
 * @returns File buffer
 */
function readFile(relativePath) {
    const filePath = getFilePath(relativePath);
    return fs.readFileSync(filePath);
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
 * Check if file exists
 * @param relativePath Relative path from database
 * @returns True if file exists
 */
function fileExists(relativePath) {
    try {
        const filePath = getFilePath(relativePath);
        return fs.existsSync(filePath);
    }
    catch {
        return false;
    }
}
/**
 * Check which branding files exist and their extensions
 * @returns Object with existence flags and extensions for each branding type
 */
function checkBrandingFiles() {
    ensureBrandingDirectory();
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
 * Save branding file (logo, seal, or signature) to static location
 * @param file Buffer or file data
 * @param filename Original filename
 * @param brandingType 'logo', 'seal', or 'signature'
 * @returns Relative path to saved file
 */
function saveBrandingFile(file, filename, brandingType) {
    ensureBrandingDirectory();
    // Get file extension from original filename
    let ext = path.extname(filename).toLowerCase();
    // If no extension, default to .png
    if (!ext || ext === '') {
        ext = '.png';
    }
    // Ensure extension starts with dot
    if (!ext.startsWith('.')) {
        ext = '.' + ext;
    }
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
