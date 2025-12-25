import { Router, Request, Response } from 'express'
import multer from 'multer'
import { saveFile, readFile, deleteFile, fileExists } from '../services/file-storage'

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

    const { type } = req.body // 'logos', 'documents', or 'signatures'
    if (!type || !['logos', 'documents', 'signatures'].includes(type)) {
      return res.status(400).json({ error: 'Invalid file type. Must be: logos, documents, or signatures' })
    }

    const relativePath = saveFile(req.file.buffer, req.file.originalname, type as 'logos' | 'documents' | 'signatures')
    res.json({ path: relativePath })
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

