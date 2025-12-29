"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const file_storage_1 = require("../services/file-storage");
const router = (0, express_1.Router)();
// Configure multer for memory storage
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});
// POST /api/uploads
// Upload a file (logo, signature, or document)
router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const { type, brandingType } = req.body; // type: 'logos', 'documents', 'signatures', or 'branding'
        // Handle branding images (logo, seal, signature)
        if (type === 'branding') {
            if (!brandingType || !['logo', 'seal', 'signature'].includes(brandingType)) {
                return res.status(400).json({ error: 'Invalid branding type. Must be: logo, seal, or signature' });
            }
            const relativePath = (0, file_storage_1.saveBrandingFile)(req.file.buffer, req.file.originalname, brandingType);
            return res.json({ path: relativePath });
        }
        // Handle regular uploads
        if (!type || !['logos', 'documents', 'signatures'].includes(type)) {
            return res.status(400).json({ error: 'Invalid file type. Must be: logos, documents, signatures, or branding' });
        }
        const relativePath = (0, file_storage_1.saveFile)(req.file.buffer, req.file.originalname, type);
        res.json({ path: relativePath });
    }
    catch (error) {
        console.error('Upload error:', error);
        // Ensure we always return valid JSON with an error message
        const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
        res.status(500).json({ error: errorMessage });
    }
});
// GET /api/uploads/branding/:filename
// Get branding file (logo, seal, or signature)
router.get('/branding/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const relativePath = `./data/branding/${filename}`;
        if (!(0, file_storage_1.fileExists)(relativePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        const fileBuffer = (0, file_storage_1.readFile)(relativePath);
        // Determine content type
        const ext = filename.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === 'png')
            contentType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg')
            contentType = 'image/jpeg';
        else if (ext === 'gif')
            contentType = 'image/gif';
        else if (ext === 'webp')
            contentType = 'image/webp';
        res.setHeader('Content-Type', contentType);
        res.send(fileBuffer);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/uploads/:type/:filename
// Get file by type and filename
router.get('/:type/:filename', (req, res) => {
    try {
        const { type, filename } = req.params;
        if (!['logos', 'documents', 'signatures'].includes(type)) {
            return res.status(400).json({ error: 'Invalid file type' });
        }
        const relativePath = `./data/uploads/${type}/${filename}`;
        if (!(0, file_storage_1.fileExists)(relativePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        const fileBuffer = (0, file_storage_1.readFile)(relativePath);
        // Determine content type
        const ext = filename.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === 'png')
            contentType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg')
            contentType = 'image/jpeg';
        else if (ext === 'pdf')
            contentType = 'application/pdf';
        res.setHeader('Content-Type', contentType);
        res.send(fileBuffer);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// DELETE /api/uploads/:type/:filename
// Delete file by type and filename
router.delete('/:type/:filename', (req, res) => {
    try {
        const { type, filename } = req.params;
        if (!['logos', 'documents', 'signatures'].includes(type)) {
            return res.status(400).json({ error: 'Invalid file type' });
        }
        const relativePath = `./data/uploads/${type}/${filename}`;
        (0, file_storage_1.deleteFile)(relativePath);
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
