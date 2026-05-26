import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../config/auth';
import { generateRubricAI, generateLessonPlanAI } from '../services/ai.service';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const router = Router();

// Helper to generate a Rubric PDF
const compileRubricPDF = (data: any, filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const primaryColor = '#1e3a8a';
      const secondaryColor = '#4b5563';
      const borderColor = '#cbd5e1';

      // Header Banner
      doc.rect(50, 40, 495, 4).fill(primaryColor);
      doc.moveDown(1.5);

      // Title
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(18).text('GRADING RUBRIC & EVALUATION MATRIX', { align: 'center' });
      doc.moveDown(0.3);
      doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(10.5)
         .text(`ASSIGNMENT: ${data.title.toUpperCase()}   |   GRADE: ${data.grade.toUpperCase()}`, { align: 'center' });
      doc.moveDown(1.5);

      // Criteria Mapping
      if (data.criteria && Array.isArray(data.criteria)) {
        data.criteria.forEach((crit: any, idx: number) => {
          // Check page break space
          if (doc.y > 680) doc.addPage();

          // Criteria Title Block
          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11)
             .text(`${idx + 1}. ${crit.name.toUpperCase()} (Max: ${crit.maxPoints} Points)`);
          doc.moveDown(0.4);
          
          doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(borderColor).lineWidth(1).stroke();
          doc.moveDown(0.5);

          // Performance levels
          if (crit.levels && Array.isArray(crit.levels)) {
            crit.levels.forEach((lvl: any) => {
              const startY = doc.y;

              // Check page break
              if (doc.y > 720) {
                doc.addPage();
              }

              doc.fillColor('#10b981').font('Helvetica-Bold').fontSize(9);
              doc.text(`[${lvl.points} pts] ${lvl.name}:`, 70, doc.y, { width: 100 });

              doc.fillColor('#303030').font('Helvetica').fontSize(9);
              doc.text(lvl.description, 175, startY, { width: 370 });

              doc.moveDown(0.8);
            });
          }
          doc.moveDown(1.2);
        });
      }

      // Add Page Numbers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        
        // Running Footer
        doc.strokeColor(borderColor).lineWidth(0.5);
        doc.moveTo(50, 792).lineTo(545, 792).stroke();

        doc.fillColor(secondaryColor).font('Helvetica').fontSize(8);
        doc.text(`Questra AI Evaluation System (Rubric Guide)`, 50, 798);
        doc.text(`Page ${i + 1} of ${range.count}`, 450, 798, { align: 'right', width: 95 });

        // Running Header on subsequent pages
        if (i > 0) {
          doc.strokeColor(borderColor).lineWidth(0.5).stroke();
          doc.moveTo(50, 35).lineTo(545, 35).stroke();
          doc.fillColor(secondaryColor).font('Helvetica-Oblique').fontSize(8);
          doc.text(`RUBRIC MATRIX — ${data.title.toUpperCase()}`, 50, 24);
        }
      }

      doc.end();
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

// Helper to generate a Lesson Plan PDF
const compileLessonPDF = (data: any, filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const primaryColor = '#1e3a8a';
      const secondaryColor = '#4b5563';
      const borderColor = '#cbd5e1';

      // Header Banner
      doc.rect(50, 40, 495, 4).fill(primaryColor);
      doc.moveDown(1.5);

      // Title
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(18).text('CLASSROOM LESSON PLAN', { align: 'center' });
      doc.moveDown(0.3);
      doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(10.5)
         .text(`TOPIC: ${data.topic.toUpperCase()}   |   GRADE: ${data.grade.toUpperCase()}   |   DURATION: ${data.duration.toUpperCase()}`, { align: 'center' });
      doc.moveDown(1.5);

      // Section 1: Objectives
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('LEARNING OBJECTIVES');
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(borderColor).lineWidth(1).stroke();
      doc.moveDown(0.6);

      doc.fillColor('#303030').font('Helvetica').fontSize(10);
      if (data.objectives && Array.isArray(data.objectives)) {
        data.objectives.forEach((obj: string) => {
          doc.text(`•  ${obj}`, 65, doc.y, { width: 480 });
          doc.moveDown(0.4);
        });
      }
      doc.moveDown(1.2);

      // Section 2: Materials
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('REQUIRED MATERIALS');
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(borderColor).lineWidth(1).stroke();
      doc.moveDown(0.6);

      doc.fillColor('#303030').font('Helvetica').fontSize(10);
      if (data.materials && Array.isArray(data.materials)) {
        data.materials.forEach((mat: string) => {
          doc.text(`•  ${mat}`, 65, doc.y, { width: 480 });
          doc.moveDown(0.4);
        });
      }
      doc.moveDown(1.2);

      // Section 3: Activities
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('LESSON SCHEDULE & TIMELINE');
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(borderColor).lineWidth(1).stroke();
      doc.moveDown(0.8);

      if (data.activities && Array.isArray(data.activities)) {
        data.activities.forEach((act: any) => {
          // Check page break space
          if (doc.y > 690) doc.addPage();

          const startY = doc.y;

          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9.5);
          doc.text(`[${act.duration}]`, 60, doc.y, { width: 75 });

          doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
          doc.text(act.name, 140, startY, { width: 400 });
          doc.moveDown(0.2);

          doc.fillColor('#4b5563').font('Helvetica').fontSize(9.5);
          doc.text(act.description, 140, doc.y, { width: 400 });
          doc.moveDown(1.0);
        });
      }
      doc.moveDown(1.2);

      // Section 4: Homework
      if (data.homework) {
        if (doc.y > 690) doc.addPage();

        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('HOMEWORK ASSIGNMENT');
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(borderColor).lineWidth(1).stroke();
        doc.moveDown(0.6);

        doc.fillColor('#303030').font('Helvetica-Oblique').fontSize(10);
        doc.text(data.homework, 65, doc.y, { width: 480 });
      }

      // Add Page Numbers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        
        // Running Footer
        doc.strokeColor(borderColor).lineWidth(0.5);
        doc.moveTo(50, 792).lineTo(545, 792).stroke();

        doc.fillColor(secondaryColor).font('Helvetica').fontSize(8);
        doc.text(`Questra AI Pedagogy System (Lesson Plan Guide)`, 50, 798);
        doc.text(`Page ${i + 1} of ${range.count}`, 450, 798, { align: 'right', width: 95 });

        // Running Header on subsequent pages
        if (i > 0) {
          doc.strokeColor(borderColor).lineWidth(0.5).stroke();
          doc.moveTo(50, 35).lineTo(545, 35).stroke();
          doc.fillColor(secondaryColor).font('Helvetica-Oblique').fontSize(8);
          doc.text(`LESSON PLAN — ${data.topic.toUpperCase()}`, 50, 24);
        }
      }

      doc.end();
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

// 1. Generate Rubric
router.post('/rubric', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, grade } = req.body;
    if (!title || !grade) {
      res.status(400).json({ error: 'Title and grade level are required.' });
      return;
    }

    const rubric = await generateRubricAI({ title, grade });
    res.json(rubric);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate rubric.' });
  }
});

// 2. Generate Lesson Plan
router.post('/lesson-plan', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { topic, grade, duration } = req.body;
    if (!topic || !grade || !duration) {
      res.status(400).json({ error: 'Topic, grade level, and lesson duration are required.' });
      return;
    }

    const lessonPlan = await generateLessonPlanAI({ topic, grade, duration });
    res.json(lessonPlan);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate lesson plan.' });
  }
});

// 3. Export PDF
router.post('/export-pdf', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, data } = req.body;
    if (!type || !data) {
      res.status(400).json({ error: 'Export type and template data are required.' });
      return;
    }

    const pdfsDirectory = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
    if (!fs.existsSync(pdfsDirectory)) {
      fs.mkdirSync(pdfsDirectory, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `toolkit-${type}-${timestamp}.pdf`;
    const filePath = path.join(pdfsDirectory, filename);
    const relativePath = `/uploads/pdfs/${filename}`;

    if (type === 'rubric') {
      await compileRubricPDF(data, filePath);
    } else if (type === 'lesson') {
      await compileLessonPDF(data, filePath);
    } else {
      res.status(400).json({ error: 'Invalid export type.' });
      return;
    }

    res.json({ pdfPath: relativePath });
  } catch (err: any) {
    console.error('Failed to export toolkit PDF:', err);
    res.status(500).json({ error: err.message || 'Failed to compile PDF.' });
  }
});

export default router;
