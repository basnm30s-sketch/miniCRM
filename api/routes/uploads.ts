import { Router, Request, Response } from 'express'
import multer from 'multer'
import { saveFile, readFile, deleteFile, fileExists, saveBrandingFile, checkBrandingFiles } from '../services/file-storage'

const router = Router()

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

// POST /api/uploads
// Upload a file (logo, signature, or document)
router.post('/', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Get type and brandingType from form data
    // Multer stores text fields in req.body
    const type = req.body?.type as string | undefined
    const brandingType = req.body?.brandingType as string | undefined
    
    // Debug logging
    console.log('Upload request received:')
    console.log('  - File:', req.file.originalname, 'Size:', req.file.size)
    console.log('  - Type:', type)
    console.log('  - BrandingType:', brandingType)
    console.log('  - Body keys:', Object.keys(req.body || {}))
    
    // Handle branding images (logo, seal, signature)
    if (type === 'branding') {
      if (!brandingType || !['logo', 'seal', 'signature'].includes(brandingType)) {
        console.error('Invalid branding type:', brandingType)
        return res.status(400).json({ error: 'Invalid branding type. Must be: logo, seal, or signature' })
      }
      try {
        saveBrandingFile(
          req.file.buffer,
          req.file.originalname,
          brandingType as 'logo' | 'seal' | 'signature'
        )
        console.log('Branding file saved successfully:', brandingType)
        // Return simple success - no path needed since files are at fixed locations
        return res.json({ success: true, type: brandingType })
      } catch (saveError: any) {
        console.error('Error saving branding file:', saveError)
        return res.status(500).json({ error: `Failed to save branding file: ${saveError?.message || 'Unknown error'}` })
      }
    }
    
    // Handle regular uploads
    if (!type || !['logos', 'documents', 'signatures'].includes(type)) {
      console.error('Invalid file type:', type)
      return res.status(400).json({ error: 'Invalid file type. Must be: logos, documents, signatures, or branding' })
    }

    try {
      const relativePath = saveFile(req.file.buffer, req.file.originalname, type as 'logos' | 'documents' | 'signatures')
      console.log('File saved:', relativePath)
      return res.json({ path: relativePath })
    } catch (saveError: any) {
      console.error('Error saving file:', saveError)
      return res.status(500).json({ error: `Failed to save file: ${saveError?.message || 'Unknown error'}` })
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    console.error('Error stack:', error?.stack)
    // Ensure we always return valid JSON with an error message
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred'
    return res.status(500).json({ error: errorMessage })
  }
})

// GET /api/uploads/branding/check
// Check which branding files exist
router.get('/branding/check', (req: Request, res: Response) => {
  try {
    const result = checkBrandingFiles()
    res.json(result)
  } catch (error: any) {
    console.error('Error checking branding files:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/uploads/branding/:filename
// Get branding file (logo, seal, or signature)
router.get('/branding/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params
    const relativePath = `./data/branding/${filename}`
    
    if (!fileExists(relativePath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    const fileBuffer = readFile(relativePath)
    
    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === 'png') contentType = 'image/png'
    else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg'
    else if (ext === 'gif') contentType = 'image/gif'
    else if (ext === 'webp') contentType = 'image/webp'
    
    res.setHeader('Content-Type', contentType)
    res.send(fileBuffer)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/uploads/:type/:filename
// Get file by type and filename
router.get('/:type/:filename', (req: Request, res: Response) => {
  try {
    const { type, filename } = req.params
    if (!['logos', 'documents', 'signatures'].includes(type)) {
      return res.status(400).json({ error: 'Invalid file type' })
    }
    
    const relativePath = `./data/uploads/${type}/${filename}`
    
    if (!fileExists(relativePath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    const fileBuffer = readFile(relativePath)
    
    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === 'png') contentType = 'image/png'
    else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg'
    else if (ext === 'pdf') contentType = 'application/pdf'
    
    res.setHeader('Content-Type', contentType)
    res.send(fileBuffer)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/uploads/:type/:filename
// Delete file by type and filename
router.delete('/:type/:filename', (req: Request, res: Response) => {
  try {
    const { type, filename } = req.params
    if (!['logos', 'documents', 'signatures'].includes(type)) {
      return res.status(400).json({ error: 'Invalid file type' })
    }
    
    const relativePath = `./data/uploads/${type}/${filename}`
    deleteFile(relativePath)
    res.status(204).send()
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router

