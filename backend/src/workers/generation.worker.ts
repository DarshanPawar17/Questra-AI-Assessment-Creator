import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis';
import Assignment from '../models/Assignment';
import { generateQuestionsAI } from '../services/ai.service';
import { emitToAssignmentRoom } from '../config/socket';
import { pdfGenerationQueue } from '../queues/queue';

const connection = getRedisConnectionOptions();

interface GenerationJobData {
  assignmentId: string;
}

export const processQuestionGeneration = async (assignmentId: string): Promise<void> => {
  console.log(`Processing question generation for assignment ${assignmentId}`);

  // 1. Fetch assignment details
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new Error(`Assignment with ID ${assignmentId} not found.`);
  }

  try {
    // 2. Update status to generating
    assignment.status = 'generating';
    await assignment.save();
    
    emitToAssignmentRoom(assignmentId, 'status-update', {
      status: 'generating',
      message: 'AI is drafting your assessment paper structure...',
      progress: 25
    });

    // 3. Trigger AI generation (with mock fallback built-in)
    const sections = await generateQuestionsAI({
      title: assignment.title,
      subject: assignment.subject,
      grade: assignment.grade,
      questionTypes: assignment.questionTypes,
      totalQuestions: assignment.totalQuestions,
      totalMarks: assignment.totalMarks,
      creativity: 0.7, // default creativity
      additionalInstructions: assignment.additionalInstructions,
      sourceText: assignment.sourceText
    });

    // 4. Update assignment with generated questions
    assignment.sections = sections;
    assignment.status = 'completed'; // For now, mark completed. We will update to compile PDF in Part 5.
    await assignment.save();

    emitToAssignmentRoom(assignmentId, 'status-update', {
      status: 'completed',
      message: 'Questions drafted successfully! Compiling PDF next...',
      sections,
      progress: 80
    });

    // 5. Automatically enqueue a PDF generation job (Part 5)
    console.log(`Enqueuing PDF compilation job for assignment ${assignmentId}...`);
    await pdfGenerationQueue.add(`pdf-${assignmentId}`, { assignmentId });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Generation worker failed for assignment ${assignmentId}:`, errorMessage);
    
    assignment.status = 'failed';
    assignment.error = errorMessage;
    await assignment.save();

    emitToAssignmentRoom(assignmentId, 'status-update', {
      status: 'failed',
      message: `Generation failed: ${errorMessage}`,
      error: errorMessage,
      progress: 0
    });
    
    throw err;
  }
};

export const initGenerationWorker = (): Worker => {
  const worker = new Worker<GenerationJobData>(
    'question-generation',
    async (job: Job<GenerationJobData>) => {
      const { assignmentId } = job.data;
      await processQuestionGeneration(assignmentId);
    },
    { connection, concurrency: 2 }
  );


  worker.on('active', (job) => {
    console.log(`Question generation job ${job.id} is now active.`);
  });

  worker.on('completed', (job) => {
    console.log(`Question generation job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Question generation job ${job?.id} failed with error:`, err);
  });

  return worker;
};
