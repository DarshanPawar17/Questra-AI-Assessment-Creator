import dotenv from 'dotenv';
// Load environment variables before any imports require them
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { connectDB } from './config/db';
import { initSocket } from './config/socket';
import { initGenerationWorker } from './workers/generation.worker';
import { initPDFWorker } from './workers/pdf.worker';
import authRouter from './routes/auth';
import assignmentRouter from './routes/assignment';
import groupRouter from './routes/group';
import toolkitRouter from './routes/toolkit';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Enable CORS with default settings (allow all)
app.use(cors());

// Parse incoming JSON payloads
app.use(express.json());

// Serve static compiled PDF files
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Logging Middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/assignments', assignmentRouter);
app.use('/api/groups', groupRouter);
app.use('/api/toolkit', toolkitRouter);

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Server is running normally.' });
});

// Global Error Handling Middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start DB connection & listen
const startServer = async () => {
  await connectDB();
  // Initialize Socket.IO with HTTP Server
  initSocket(server);
  // Start background queue workers if not using mock queues
  if (process.env.USE_MOCK_QUEUE !== 'true') {
    initGenerationWorker();
    initPDFWorker();
  }
  server.listen(PORT, () => {
    console.log(`Server successfully started on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
