import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IAssignment } from '../models/Assignment';

// Helper to generate Questions PDF (Student copy)
const generateQuestionsPDF = (assignment: IAssignment, filePath: string, relativePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 65, left: 50, right: 50 },
        bufferPages: true
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const primaryColor = '#1e3a8a';
      const secondaryColor = '#4b5563';
      const borderColor = '#cbd5e1';

      // Header Banner
      doc.rect(50, 45, 495, 4).fill(primaryColor);

      // Title & School Meta
      doc.moveDown(1.5);
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(20).text(assignment.title.toUpperCase(), { align: 'center' });
      
      doc.moveDown(0.3);
      doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(10.5)
         .text(`SUBJECT: ${assignment.subject.toUpperCase()}   |   GRADE: ${assignment.grade.toUpperCase()}`, { align: 'center' });

      if (assignment.timeLimit) {
        doc.moveDown(0.2);
        doc.fillColor(secondaryColor).font('Helvetica').fontSize(9.5)
           .text(`TIME ALLOWED: ${assignment.timeLimit} MINUTES   |   TOTAL MARKS: ${assignment.totalMarks}`, { align: 'center' });
      } else {
        doc.moveDown(0.2);
        doc.fillColor(secondaryColor).font('Helvetica').fontSize(9.5)
           .text(`TOTAL MARKS: ${assignment.totalMarks}`, { align: 'center' });
      }

      doc.moveDown(0.8);

      // Student Info Box
      const boxY = doc.y;
      doc.rect(50, boxY, 495, 75).stroke(borderColor);
      doc.moveTo(350, boxY).lineTo(350, boxY + 75).stroke(borderColor);
      doc.moveTo(350, boxY + 37).lineTo(545, boxY + 37).stroke(borderColor);

      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
      doc.text('STUDENT NAME:', 60, boxY + 15);
      doc.text('ROLL / ID NO:', 60, boxY + 45);
      doc.text('DATE:', 360, boxY + 15);
      doc.text('MARKS OBTAINED:', 360, boxY + 49);

      doc.font('Helvetica').fillColor(secondaryColor);
      doc.text('_____________________________________', 150, boxY + 13);
      doc.text('_____________________________________', 150, boxY + 43);
      doc.text('__________________', 400, boxY + 13);
      doc.text('/ ' + assignment.totalMarks, 480, boxY + 49);

      doc.y = boxY + 95;

      if (assignment.additionalInstructions) {
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10).text('INSTRUCTIONS:');
        doc.fillColor(secondaryColor).font('Helvetica-Oblique').fontSize(9).text(assignment.additionalInstructions, { align: 'left' });
        doc.moveDown(1.5);
      } else {
        doc.moveDown(0.5);
      }

      let questionCounter = 0;

      if (assignment.sections && assignment.sections.length > 0) {
        assignment.sections.forEach((section) => {
          if (doc.y > 660) doc.addPage();

          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text(section.title.toUpperCase());
          doc.fillColor(secondaryColor).font('Helvetica-Oblique').fontSize(9.5).text(section.instruction);
          doc.moveDown(0.5);

          doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(borderColor).lineWidth(1).stroke();
          doc.moveDown(0.8);

          section.questions.forEach((question) => {
            questionCounter++;
            
            let neededSpace = 55;
            if (question.type === 'MCQ' && question.options) {
              neededSpace = 35 + (question.options.length * 18);
            } else if (question.type === 'TrueFalse') {
              neededSpace = 55;
            } else if (question.type === 'Descriptive') {
              neededSpace = 45 + (Math.max(3, Math.floor(question.marks / 2)) * 20);
            }

            if (doc.y + neededSpace > 750) {
              doc.addPage();
            }

            const startY = doc.y;

            // 1. Right-aligned Marks badge
            doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor);
            doc.text(`[${question.marks} Marks]`, 480, startY, { width: 65, align: 'right' });

            // 2. Question number
            doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
            doc.text(`Q${questionCounter}.`, 50, startY, { width: 30 });
            
            // 3. Question text
            doc.font('Helvetica').fontSize(10);
            doc.text(question.text, 80, startY, { width: 390 });
            
            doc.y = Math.max(doc.y, startY + 15);
            doc.moveDown(0.4);

            if (question.type === 'MCQ' && question.options) {
              doc.font('Helvetica').fontSize(9.5).fillColor('#000000');
              question.options.forEach((opt) => {
                const optionY = doc.y;
                doc.circle(95, optionY + 5, 4.5).strokeColor(secondaryColor).lineWidth(0.75).stroke();
                doc.text(opt, 110, optionY, { width: 360 });
                doc.moveDown(0.5);
              });
            } else if (question.type === 'TrueFalse') {
              doc.font('Helvetica').fontSize(9.5).fillColor('#000000');
              const optionY = doc.y;
              doc.circle(95, optionY + 5, 4.5).strokeColor(secondaryColor).lineWidth(0.75).stroke();
              doc.text('True', 110, optionY);
              doc.circle(185, optionY + 5, 4.5).strokeColor(secondaryColor).lineWidth(0.75).stroke();
              doc.text('False', 200, optionY);
              doc.moveDown(1.0);
            } else if (question.type === 'Descriptive') {
              const lineCount = Math.max(3, Math.floor(question.marks / 2));
              doc.strokeColor(borderColor).lineWidth(0.5).dash(3, { space: 3 });
              
              for (let i = 0; i < lineCount; i++) {
                doc.moveDown(1.5);
                doc.moveTo(80, doc.y).lineTo(545, doc.y).stroke();
              }
              doc.undash();
            }

            doc.moveDown(1.2);
          });

          doc.moveDown(1.5);
        });
      }

      // Add Page Numbers and Running Headers using buffered page range
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.strokeColor(borderColor).lineWidth(0.5);
        doc.moveTo(50, 782).lineTo(545, 782).stroke();

        doc.fillColor(secondaryColor).font('Helvetica').fontSize(8);
        doc.text(`Questra AI Assessment System (Student Copy)`, 50, 788);
        doc.text(`Page ${i + 1} of ${range.count}`, 450, 788, { align: 'right', width: 95 });

        // Draw running header on page index >= 1 (subsequent pages)
        if (i > 0) {
          doc.strokeColor(borderColor).lineWidth(0.5).stroke();
          doc.moveTo(50, 42).lineTo(545, 42).stroke();
          doc.fillColor(secondaryColor).font('Helvetica-Oblique').fontSize(8.5);
          doc.text(`${assignment.title.toUpperCase()} — ${assignment.subject.toUpperCase()}`, 50, 30);
        }
      }

      doc.end();

      writeStream.on('finish', () => resolve(relativePath));
      writeStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

// Helper to generate Answer Key PDF (Teacher copy)
const generateAnswersPDF = (assignment: IAssignment, filePath: string, relativePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 65, left: 50, right: 50 },
        bufferPages: true
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const primaryColor = '#1e3a8a';
      const secondaryColor = '#4b5563';
      const borderColor = '#cbd5e1';

      // Header Banner
      doc.rect(50, 45, 495, 4).fill(primaryColor);
      doc.moveDown(1.5);
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(18).text("TEACHER'S ANSWER KEY & RUBRIC", { align: 'center' });
      doc.moveDown(0.3);
      doc.fillColor(secondaryColor).font('Helvetica-Oblique').fontSize(9.5)
         .text(`CONFIDENTIAL - FOR GRADING USE ONLY`, { align: 'center' });
      doc.moveDown(1.5);

      let keyQuestionCounter = 0;

      if (assignment.sections && assignment.sections.length > 0) {
        assignment.sections.forEach((section) => {
          if (doc.y > 690) doc.addPage();
          
          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11.5).text(`ANSWERS: ${section.title.toUpperCase()}`);
          doc.moveDown(0.4);
          doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(borderColor).lineWidth(1).stroke();
          doc.moveDown(0.6);

          section.questions.forEach((question) => {
            keyQuestionCounter++;
            
            let neededSpace = 60; // Base space for metadata & text
            if (question.type === 'MCQ' || question.type === 'TrueFalse') {
              neededSpace += 20;
            } else if (question.type === 'Descriptive') {
              neededSpace += 80;
            }

            if (doc.y + neededSpace > 750) {
              doc.addPage();
            }

            const startY = doc.y;
            
            doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9.5);
            doc.text(`Q${keyQuestionCounter}.`, 50, startY, { width: 30 });
            
            doc.font('Helvetica-Bold').fillColor(primaryColor);
            doc.text(`Type: ${question.type} | Difficulty: ${question.difficulty} | Marks: ${question.marks}`, 80, startY, { width: 460 });
            
            doc.y = Math.max(doc.y, startY + 15);
            doc.moveDown(0.3);
            
            doc.font('Helvetica-Oblique').fillColor('#000000').fontSize(9.5);
            doc.text(`Question: ${question.text}`, 80, doc.y, { width: 460 });
            
            doc.moveDown(0.3);
            doc.font('Helvetica-Bold').fillColor('#10b981'); // Green accent for answers
            
            if (question.type === 'MCQ' || question.type === 'TrueFalse') {
              doc.text(`Correct Answer: ${question.correctAnswer || 'Not Specified'}`, 80, doc.y, { width: 460 });
            } else {
              doc.text(`Grading Rubric / Criteria:`, 80, doc.y, { width: 460 });
              doc.font('Helvetica').fillColor('#303030').fontSize(9);
              doc.moveDown(0.2);
              doc.text(question.correctAnswer || 'Provide marks based on content accuracy, structural logic, and clear terminology.', 80, doc.y, { width: 460 });
            }

            doc.moveDown(1.2);
          });

          doc.moveDown(1.5);
        });
      }

      // Add Page Numbers and Running Headers using buffered page range
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.strokeColor(borderColor).lineWidth(0.5);
        doc.moveTo(50, 782).lineTo(545, 782).stroke();

        doc.fillColor(secondaryColor).font('Helvetica').fontSize(8);
        doc.text(`Questra AI Assessment System (Teacher Reference)`, 50, 788);
        doc.text(`Page ${i + 1} of ${range.count}`, 450, 788, { align: 'right', width: 95 });

        // Draw running header on page index >= 1 (subsequent pages)
        if (i > 0) {
          doc.strokeColor(borderColor).lineWidth(0.5).stroke();
          doc.moveTo(50, 42).lineTo(545, 42).stroke();
          doc.fillColor(secondaryColor).font('Helvetica-Oblique').fontSize(8.5);
          doc.text(`ANSWER KEY & RUBRIC — ${assignment.title.toUpperCase()}`, 50, 30);
        }
      }

      doc.end();

      writeStream.on('finish', () => resolve(relativePath));
      writeStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

// Central orchestrator to trigger both compiles in parallel
export const compileAssignmentPDF = async (assignment: IAssignment): Promise<{ pdfPath: string; pdfAnswerPath: string }> => {
  const pdfsDirectory = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
  if (!fs.existsSync(pdfsDirectory)) {
    fs.mkdirSync(pdfsDirectory, { recursive: true });
  }

  const timestamp = Date.now();
  const qFilename = `assignment-${assignment._id}-${timestamp}-questions.pdf`;
  const aFilename = `assignment-${assignment._id}-${timestamp}-answers.pdf`;

  const qFilePath = path.join(pdfsDirectory, qFilename);
  const aFilePath = path.join(pdfsDirectory, aFilename);

  const qRelativePath = `/uploads/pdfs/${qFilename}`;
  const aRelativePath = `/uploads/pdfs/${aFilename}`;

  console.log(`Starting parallel compilation for assignment: ${assignment._id}`);
  const [pdfPath, pdfAnswerPath] = await Promise.all([
    generateQuestionsPDF(assignment, qFilePath, qRelativePath),
    generateAnswersPDF(assignment, aFilePath, aRelativePath)
  ]);

  return { pdfPath, pdfAnswerPath };
};
