import mongoose, { Schema, Document } from 'mongoose';

export interface IUserPreferences {
  theme?: 'light' | 'dark' | 'system';
  defaultGrade?: string;
  defaultSubject?: string;
  defaultDifficulty?: 'Easy' | 'Moderate' | 'Hard';
  defaultQuestionTypes?: ('MCQ' | 'TrueFalse' | 'Descriptive')[];
}

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  role: 'teacher' | 'admin';
  fullName?: string;
  email?: string;
  preferences?: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['teacher', 'admin'],
      default: 'teacher',
    },
    fullName: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'light',
      },
      defaultGrade: {
        type: String,
        default: '',
      },
      defaultSubject: {
        type: String,
        default: '',
      },
      defaultDifficulty: {
        type: String,
        enum: ['Easy', 'Moderate', 'Hard'],
        default: 'Moderate',
      },
      defaultQuestionTypes: {
        type: [String],
        default: ['MCQ'],
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);

