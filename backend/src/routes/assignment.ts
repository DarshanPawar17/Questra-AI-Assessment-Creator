import { Router, Response } from 'express';
import Assignment from '../models/Assignment';
import LibraryDocument from '../models/LibraryDocument';
import { authenticateToken, AuthRequest } from '../config/auth';
import { uploadMiddleware, extractTextFromFile } from '../utils/parser';
import { questionGenerationQueue, pdfGenerationQueue } from '../queues/queue';

const router = Router();

// 1. Create a new Assignment (starts background question generation)
router.post(
  '/',
  authenticateToken,
  uploadMiddleware.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        title,
        subject,
        grade,
        timeLimit,
        questionTypes, // Expected as JSON string or comma-separated list
        totalQuestions,
        totalMarks,
        additionalInstructions,
        dueDate,
        libraryDocId
      } = req.body;

      if (!title || !subject || !grade || !totalQuestions || !totalMarks || !questionTypes) {
        res.status(400).json({ error: 'Missing required assignment fields.' });
        return;
      }

      // Parse questionTypes
      let parsedQuestionTypes: string[] = [];
      try {
        parsedQuestionTypes = typeof questionTypes === 'string' && questionTypes.startsWith('[')
          ? JSON.parse(questionTypes)
          : typeof questionTypes === 'string'
          ? questionTypes.split(',').map((t) => t.trim())
          : questionTypes;
      } catch (err) {
        res.status(400).json({ error: 'Invalid questionTypes format.' });
        return;
      }

      // Check file upload text extraction or fetch from Library
      let sourceText = '';
      let sourceFilePath = '';

      if (req.file) {
        try {
          sourceText = await extractTextFromFile(req.file.path, req.file.originalname);
          sourceFilePath = `/uploads/temp/${req.file.filename}`;
        } catch (err: unknown) {
          res.status(400).json({ error: err instanceof Error ? err.message : 'Error parsing file.' });
          return;
        }
      } else if (libraryDocId) {
        try {
          const doc = await LibraryDocument.findOne({ _id: libraryDocId, creator: req.userId });
          if (!doc) {
            res.status(404).json({ error: 'Selected library document not found or unauthorized.' });
            return;
          }
          sourceText = doc.extractedText;
          sourceFilePath = doc.filePath;
        } catch (err: any) {
          res.status(500).json({ error: 'Failed to retrieve selected library document.' });
          return;
        }
      }

      // Create new Assignment
      const newAssignment = new Assignment({
        title,
        subject,
        grade,
        timeLimit: timeLimit ? parseInt(timeLimit, 10) : undefined,
        creator: req.userId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        questionTypes: parsedQuestionTypes,
        totalQuestions: parseInt(totalQuestions, 10),
        totalMarks: parseInt(totalMarks, 10),
        additionalInstructions,
        sourceFilePath,
        sourceText,
        status: 'pending'
      });

      await newAssignment.save();

      // Enqueue BullMQ task
      console.log(`Enqueuing question generation task for assignment: ${newAssignment._id}`);
      await questionGenerationQueue.add(
        `generate-${newAssignment._id}`,
        { assignmentId: newAssignment._id.toString() }
      );

      res.status(201).json({
        message: 'Assignment creation started successfully.',
        assignment: newAssignment
      });
    } catch (error) {
      console.error('Create assignment error:', error);
      res.status(500).json({ error: 'Internal server error creating assignment.' });
    }
  }
);

// 2. Get list of assignments for user (with pagination and filters)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, grade, status, page = 1, limit = 10 } = req.query;

    const query: Record<string, unknown> = { creator: req.userId };

    if (subject) query.subject = new RegExp(String(subject), 'i');
    if (grade) query.grade = new RegExp(String(grade), 'i');
    if (status) query.status = status;

    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);
    const skipNum = (pageNum - 1) * limitNum;

    const total = await Assignment.countDocuments(query);
    const assignments = await Assignment.find(query)
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    res.status(200).json({
      assignments,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('List assignments error:', error);
    res.status(500).json({ error: 'Internal server error retrieving assignments.' });
  }
});

// 3. Get specific assignment details
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findOne({ _id: id, creator: req.userId });

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    res.status(200).json({ assignment });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ error: 'Internal server error retrieving assignment details.' });
  }
});

// 4. Update assignment details manually (Post-AI Edits)
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, subject, grade, timeLimit, sections } = req.body;

    const assignment = await Assignment.findOne({ _id: id, creator: req.userId });
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    // Update basic meta if provided
    if (title) assignment.title = title;
    if (subject) assignment.subject = subject;
    if (grade) assignment.grade = grade;
    if (timeLimit !== undefined) assignment.timeLimit = timeLimit;

    // Save manually edited questions
    if (sections) {
      assignment.sections = sections;
      
      // Re-calculate totals based on edit
      let totalQuestions = 0;
      let totalMarks = 0;
      sections.forEach((sec: { questions?: { marks?: number }[] }) => {
        if (sec.questions) {
          totalQuestions += sec.questions.length;
          sec.questions.forEach((q) => {
            totalMarks += q.marks || 0;
          });
        }
      });

      assignment.totalQuestions = totalQuestions;
      assignment.totalMarks = totalMarks;
    }

    await assignment.save();

    res.status(200).json({
      message: 'Assignment updated successfully.',
      assignment
    });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Internal server error updating assignment.' });
  }
});

// 5. Trigger PDF compilation explicitly (e.g., after edits)
router.post('/:id/regenerate-pdf', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findOne({ _id: id, creator: req.userId });

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    if (assignment.status !== 'completed' && assignment.status !== 'failed') {
      res.status(400).json({ error: 'Cannot compile PDF while assignment generation is in progress.' });
      return;
    }

    console.log(`Enqueuing PDF compilation task for assignment: ${assignment._id}`);
    await pdfGenerationQueue.add(
      `pdf-${assignment._id}`,
      { assignmentId: assignment._id.toString() }
    );

    res.status(200).json({
      message: 'PDF compilation task enqueued successfully.'
    });
  } catch (error) {
    console.error('Regenerate PDF error:', error);
    res.status(500).json({ error: 'Internal server error triggering PDF compilation.' });
  }
});

export default router;
