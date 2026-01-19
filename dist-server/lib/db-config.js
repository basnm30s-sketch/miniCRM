"use strict";
/**
 * Database Configuration
 * Abstracts database path resolution for both Electron and browser dev environments
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
exports.getDatabaseDir = getDatabaseDir;
exports.getDatabasePath = getDatabasePath;
exports.getBackupsDir = getBackupsDir;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Get the database directory path
 * - In Electron: Uses app.getPath('userData') when available
 * - In browser dev: Uses process.cwd() + '/data'
 * - Can be overridden with DB_PATH environment variable
 */
function getDatabaseDir() {
    // Environment variable override (highest priority)
    if (process.env.DB_PATH) {
        const dbPath = process.env.DB_PATH;
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        return dbDir;
    }
    // Try to detect Electron environment
    // In Electron main process, 'electron' module is available
    try {
        // Check if we're in Electron main process
        const electron = require('electron');
        if (electron && electron.app) {
            const userDataPath = electron.app.getPath('userData');
            const dbDir = path.join(userDataPath, 'data');
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            return dbDir;
        }
    }
    catch (error) {
        // Not in Electron or electron module not available
        // Fall through to browser dev mode
    }
    // Browser dev mode: use project folder
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    return dbDir;
}
/**
 * Get the full database file path
 */
function getDatabasePath() {
    const dbDir = getDatabaseDir();
    const filename = process.env.DB_FILENAME || 'imanage.db';
    return path.join(dbDir, filename);
}
/**
 * Get the backups directory path
 */
function getBackupsDir() {
    const dbDir = getDatabaseDir();
    const backupsDir = path.join(dbDir, 'backups');
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }
    return backupsDir;
}
