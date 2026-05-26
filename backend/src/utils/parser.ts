import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

// 1. Configure Multer for Uploads Storage
const uploadDirectory = path.join(process.cwd(), 'public', 'uploads', 'temp');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit to handle larger syllabi files
});

// 2. Document Parser Utility
export const extractTextFromFile = async (filePath: string, originalName: string): Promise<string> => {
  const ext = path.extname(originalName).toLowerCase();
  
  if (!fs.existsSync(filePath)) {
    throw new Error('Upload file does not exist on disk.');
  }

  const fileBuffer = fs.readFileSync(filePath);

  switch (ext) {
    case '.txt':
      return fileBuffer.toString('utf8');

    case '.pdf':
      try {
        // Use the modern typescript-compatible PDFParse API
        const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
        const data = await parser.getText();
        return data.text || '';
      } catch (err) {
        console.error('PDF parsing failure:', err);
        throw new Error('Failed to parse text from PDF document.');
      }

    case '.docx':
      try {
        const data = await mammoth.extractRawText({ buffer: fileBuffer });
        return data.value || '';
      } catch (err) {
        console.error('DOCX parsing failure:', err);
        throw new Error('Failed to parse text from Word (.docx) document.');
      }

    default:
      throw new Error(`Unsupported document upload format: ${ext}`);
  }
};
