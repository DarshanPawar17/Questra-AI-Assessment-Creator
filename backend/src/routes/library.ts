import { Router, Response } from 'express';
import LibraryDocument from '../models/LibraryDocument';
import { authenticateToken, AuthRequest } from '../config/auth';
import { uploadMiddleware, extractTextFromFile } from '../utils/parser';
import fs from 'fs';
import path from 'path';

const router = Router();

// 1. Fetch all library documents for the logged-in user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: any = { creator: req.userId };
    if (req.query.subject) {
      filter.subject = req.query.subject as string;
    }
    if (req.query.grade) {
      filter.grade = req.query.grade as string;
    }
    
    const docs = await LibraryDocument.find(filter).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err: any) {
    console.error('Failed to fetch library documents:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch library documents.' });
  }
});

// 2. Upload and parse a new library document
router.post(
  '/',
  authenticateToken,
  uploadMiddleware.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Please upload a document file.' });
        return;
      }

      const { title, description, subject, grade } = req.body;

      // Define persistent library storage path
      const libraryDir = path.join(process.cwd(), 'public', 'uploads', 'library');
      if (!fs.existsSync(libraryDir)) {
        fs.mkdirSync(libraryDir, { recursive: true });
      }

      const destinationPath = path.join(libraryDir, req.file.filename);

      // Move uploaded file from temp directory to library directory
      fs.renameSync(req.file.path, destinationPath);
      const relativePath = `/uploads/library/${req.file.filename}`;

      // Extract text contents using the existing parser helper
      let extractedText = '';
      try {
        extractedText = await extractTextFromFile(destinationPath, req.file.originalname);
      } catch (err: any) {
        // Cleanup file if parsing fails
        if (fs.existsSync(destinationPath)) {
          fs.unlinkSync(destinationPath);
        }
        res.status(400).json({ error: err.message || 'Failed to parse text from the uploaded document.' });
        return;
      }

      // Save document metadata in MongoDB
      const fileExt = path.extname(req.file.originalname).substring(1).toLowerCase();
      const libraryDoc = new LibraryDocument({
        title: title ? title.trim() : req.file.originalname,
        description: description ? description.trim() : '',
        subject: subject ? subject.trim() : '',
        grade: grade ? grade.trim() : '',
        fileType: fileExt,
        filePath: relativePath,
        extractedText,
        creator: req.userId
      });

      await libraryDoc.save();
      res.status(201).json(libraryDoc);
    } catch (err: any) {
      console.error('Failed to upload library document:', err);
      // Cleanup temp file if it still exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: err.message || 'Failed to save library document.' });
    }
  }
);

// 3. Delete a library document (and physical file on disk)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doc = await LibraryDocument.findOne({ _id: req.params.id, creator: req.userId });
    if (!doc) {
      res.status(404).json({ error: 'Library document not found or unauthorized.' });
      return;
    }

    // Try deleting physical file on disk
    const absolutePath = path.join(process.cwd(), 'public', doc.filePath);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (unlinkErr) {
        console.error(`Failed to delete file from disk: ${absolutePath}`, unlinkErr);
      }
    }

    // Delete record from DB
    await LibraryDocument.deleteOne({ _id: doc._id });
    res.json({ message: 'Document deleted successfully from library.' });
  } catch (err: any) {
    console.error('Failed to delete library document:', err);
    res.status(500).json({ error: err.message || 'Failed to delete library document.' });
  }
});

export default router;
