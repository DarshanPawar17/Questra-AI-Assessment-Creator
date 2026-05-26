import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis';

const useMockQueue = process.env.USE_MOCK_QUEUE === 'true';

let questionGenerationQueue: any;
let pdfGenerationQueue: any;

if (useMockQueue) {
  class MockQueue {
    private queueName: string;
    constructor(name: string) {
      this.queueName = name;
    }
    async add(jobName: string, data: { assignmentId: string }): Promise<any> {
      console.log(`[MOCK QUEUE ${this.queueName}] Added job: ${jobName} with data:`, data);
      
      // Execute worker logic asynchronously in process
      setTimeout(async () => {
        try {
          if (this.queueName === 'question-generation') {
            const { processQuestionGeneration } = require('../workers/generation.worker');
            await processQuestionGeneration(data.assignmentId);
          } else if (this.queueName === 'pdf-generation') {
            const { processPDFGeneration } = require('../workers/pdf.worker');
            await processPDFGeneration(data.assignmentId);
          }
        } catch (err) {
          console.error(`[MOCK QUEUE ${this.queueName}] Error processing job ${jobName}:`, err);
        }
      }, 1000);

      return { id: `mock-job-${Date.now()}` };
    }
  }

  questionGenerationQueue = new MockQueue('question-generation');
  pdfGenerationQueue = new MockQueue('pdf-generation');
  console.log('Mock in-process queues initialized successfully (Bypassing Redis).');
} else {
  const connection = getRedisConnectionOptions();

  // Queue for generating questions using AI
  questionGenerationQueue = new Queue('question-generation', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  // Queue for compiling assignment questions into a PDF
  pdfGenerationQueue = new Queue('pdf-generation', {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 3000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  console.log('BullMQ queues initialized successfully.');
}

export { questionGenerationQueue, pdfGenerationQueue };
