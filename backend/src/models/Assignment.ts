import mongoose, { Schema, Document } from 'mongoose';

export type QuestionType = 'MCQ' | 'TrueFalse' | 'Descriptive';

export interface IQuestion {
  text: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  marks: number;
  type: QuestionType;
  options?: string[]; // Used for MCQ options
  correctAnswer?: string; // Correct answer or grading guide
}

export interface ISection {
  title: string;
  instruction: string;
  questions: IQuestion[];
}

export interface IAssignment extends Document {
  title: string;
  subject: string;
  grade: string;
  timeLimit?: number; // in minutes
  creator: mongoose.Types.ObjectId; // Reference to User model
  dueDate?: Date;
  questionTypes: QuestionType[];
  totalQuestions: number;
  totalMarks: number;
  additionalInstructions?: string;
  sourceFilePath?: string;
  sourceText?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
  sections?: ISection[];
  pdfPath?: string;
  pdfAnswerPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  text: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Moderate', 'Hard'], required: true },
  marks: { type: Number, required: true },
  type: { type: String, enum: ['MCQ', 'TrueFalse', 'Descriptive'], required: true },
  options: [{ type: String }],
  correctAnswer: { type: String }
});

const SectionSchema = new Schema<ISection>({
  title: { type: String, required: true },
  instruction: { type: String, required: true },
  questions: [QuestionSchema]
});

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    grade: { type: String, required: true },
    timeLimit: { type: Number },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date },
    questionTypes: [{ type: String, enum: ['MCQ', 'TrueFalse', 'Descriptive'], required: true }],
    totalQuestions: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    additionalInstructions: { type: String },
    sourceFilePath: { type: String },
    sourceText: { type: String },
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending'
    },
    error: { type: String },
    sections: [SectionSchema],
    pdfPath: { type: String },
    pdfAnswerPath: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
