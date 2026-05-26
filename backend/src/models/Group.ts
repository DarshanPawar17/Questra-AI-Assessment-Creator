import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupAssignment {
  assignmentId: mongoose.Types.ObjectId;
  assignedAt: Date;
  dueDate?: Date;
}

export interface IGroup extends Document {
  name: string;
  grade: string;
  subject: string;
  description?: string;
  creator: mongoose.Types.ObjectId;
  students: string[]; // List of student names/emails
  assignments: IGroupAssignment[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    students: [{ type: String }],
    assignments: [
      {
        assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
        assignedAt: { type: Date, default: Date.now },
        dueDate: { type: Date }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model<IGroup>('Group', GroupSchema);
