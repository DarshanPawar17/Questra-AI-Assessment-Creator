import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis';
import Assignment from '../models/Assignment';
import { compileAssignmentPDF } from '../services/pdf.service';
import { emitToAssignmentRoom } from '../config/socket';

const connection = getRedisConnectionOptions();

interface PDFJobData {
  assignmentId: string;
}

export const processPDFGeneration = async (assignmentId: string): Promise<void> => {
  console.log(`Processing PDF generation for assignment ${assignmentId}`);

  // 1. Fetch assignment details
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new Error(`Assignment with ID ${assignmentId} not found.`);
  }

  try {
    // 2. Update status and progress
    emitToAssignmentRoom(assignmentId, 'status-update', {
      status: 'generating',
      message: 'Compiling assessment questions into PDF format...',
      progress: 85
    });

    // 3. Compile PDFs (Questions & Answers)
    const { pdfPath, pdfAnswerPath } = await compileAssignmentPDF(assignment);

    // 4. Update assignment with both PDF paths
    assignment.pdfPath = pdfPath;
    assignment.pdfAnswerPath = pdfAnswerPath;
    assignment.status = 'completed';
    await assignment.save();

    console.log(`PDF compilation complete for assignment ${assignmentId}. Questions: ${pdfPath}, Answers: ${pdfAnswerPath}`);

    emitToAssignmentRoom(assignmentId, 'status-update', {
      status: 'completed',
      message: 'PDF generated successfully! Your assignment is ready to print.',
      pdfPath,
      pdfAnswerPath,
      sections: assignment.sections,
      progress: 100
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`PDF worker failed for assignment ${assignmentId}:`, errorMessage);
    
    assignment.status = 'failed';
    assignment.error = `PDF generation failed: ${errorMessage}`;
    await assignment.save();

    emitToAssignmentRoom(assignmentId, 'status-update', {
      status: 'failed',
      message: `PDF generation failed: ${errorMessage}`,
      error: errorMessage,
      progress: 0
    });

    throw err;
  }
};

export const initPDFWorker = (): Worker => {
  const worker = new Worker<PDFJobData>(
    'pdf-generation',
    async (job: Job<PDFJobData>) => {
      const { assignmentId } = job.data;
      await processPDFGeneration(assignmentId);
    },
    { connection, concurrency: 2 }
  );


  worker.on('active', (job) => {
    console.log(`PDF generation job ${job.id} is now active.`);
  });

  worker.on('completed', (job) => {
    console.log(`PDF generation job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`PDF generation job ${job?.id} failed with error:`, err);
  });

  return worker;
};
