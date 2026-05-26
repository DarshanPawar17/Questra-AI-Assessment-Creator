import mongoose, { Schema, Document } from 'mongoose';

export interface ILibraryDocument extends Document {
  title: string;
  description?: string;
  subject?: string;
  grade?: string;
  fileType?: string; // 'pdf' | 'docx' | 'txt' | 'other'
  filePath: string; // Stored path on server e.g. /uploads/library/filename
  extractedText: string; // Plaintext parsed from doc for AI model prompts
  creator: mongoose.Types.ObjectId; // Reference to User model
  createdAt: Date;
  updatedAt: Date;
}

const LibraryDocumentSchema = new Schema<ILibraryDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    subject: { type: String, trim: true },
    grade: { type: String, trim: true },
    fileType: { type: String, trim: true },
    filePath: { type: String, required: true },
    extractedText: { type: String, required: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

export default mongoose.model<ILibraryDocument>('LibraryDocument', LibraryDocumentSchema);
