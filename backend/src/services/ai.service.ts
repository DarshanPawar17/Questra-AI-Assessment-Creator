import { GoogleGenerativeAI } from '@google/generative-ai';
import { ISection, QuestionType, IQuestion } from '../models/Assignment';

// Helper mock generator for fallback
const generateMockQuestions = (
  title: string,
  subject: string,
  grade: string,
  questionTypes: QuestionType[],
  totalQuestions: number,
  totalMarks: number,
  additionalInstructions?: string
): ISection[] => {
  const sections: ISection[] = [];
  const difficultyOptions: ('Easy' | 'Moderate' | 'Hard')[] = ['Easy', 'Moderate', 'Hard'];
  
  // Calculate division
  const questionsPerSection = Math.ceil(totalQuestions / Math.max(1, questionTypes.length));
  let questionsCreated = 0;
  let remainingMarks = totalMarks;

  questionTypes.forEach((type, index) => {
    if (questionsCreated >= totalQuestions) return;

    const sectionTitle = `Section ${String.fromCharCode(65 + index)}: ${type} Questions`;
    const questionsToCreate = Math.min(questionsPerSection, totalQuestions - questionsCreated);
    const marksPerQuestion = Math.max(1, Math.floor(remainingMarks / (totalQuestions - questionsCreated)));

    const questionsList: IQuestion[] = Array.from({ length: questionsToCreate }).map((_, qIdx) => {
      questionsCreated++;
      const currentMarks = questionsCreated === totalQuestions ? remainingMarks : marksPerQuestion;
      remainingMarks -= currentMarks;

      const difficulty = difficultyOptions[qIdx % 3];

      let options: string[] | undefined;
      let correctAnswer = '';

      if (type === 'MCQ') {
        options = [
          `Option A: Core concepts of ${title}`,
          `Option B: Secondary properties of ${subject}`,
          `Option C: Advanced implementation of ${grade} level subjects`,
          `Option D: None of the above`
        ];
        correctAnswer = 'Option A: Core concepts of ' + title;
      } else if (type === 'TrueFalse') {
        options = ['True', 'False'];
        correctAnswer = 'True';
      } else {
        correctAnswer = `Grading Guide: Student response must detail the historical context, main theories, and practical applications of ${title} appropriate for a ${grade} standard in ${subject}.`;
      }

      return {
        text: `Explain or identify the significance of ${title} in relation to ${subject} topics at a ${grade} level (Question ${questionsCreated}).`,
        difficulty,
        marks: currentMarks,
        type,
        options,
        correctAnswer
      };
    });

    sections.push({
      title: sectionTitle,
      instruction: `Attempt all questions in this section. Each question carries ${marksPerQuestion} marks. ${additionalInstructions || ''}`,
      questions: questionsList
    });
  });

  return sections;
};

export const generateQuestionsAI = async (params: {
  title: string;
  subject: string;
  grade: string;
  questionTypes: QuestionType[];
  totalQuestions: number;
  totalMarks: number;
  creativity?: number; // 0 to 1
  additionalInstructions?: string;
  sourceText?: string;
}): Promise<ISection[]> => {
  const {
    title,
    subject,
    grade,
    questionTypes,
    totalQuestions,
    totalMarks,
    creativity = 0.7,
    additionalInstructions,
    sourceText
  } = params;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY' || apiKey === '') {
    console.warn('GEMINI_API_KEY is not set or placeholder. Falling back to mock generator.');
    // Delay slightly to simulate AI generation latency
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return generateMockQuestions(title, subject, grade, questionTypes, totalQuestions, totalMarks, additionalInstructions);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash which is very fast and supports structured JSON outputs
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: creativity, // creativity maps directly to temperature (0.0 to 1.0)
      },
    });

    const prompt = `
      You are an expert exam creator. Generate a structured question paper.
      
      Topic/Title: "${title}"
      Subject: "${subject}"
      Grade Level: "${grade}"
      Question Types Required: ${questionTypes.join(', ')}
      Total Number of Questions: ${totalQuestions}
      Total Marks: ${totalMarks}
      ${additionalInstructions ? `Additional Instructions for Exam: "${additionalInstructions}"` : ''}
      ${sourceText ? `Source Reference Content to base questions on:\n"""\n${sourceText}\n"""` : ''}

      INSTRUCTIONS:
      1. Divide the questions logically into Sections (e.g. "Section A", "Section B" based on question types or general groupings).
      2. The sum of the marks of all questions across all sections MUST EXACTLY equal ${totalMarks}.
      3. The total number of questions across all sections MUST EXACTLY equal ${totalQuestions}.
      4. Assign a difficulty level to each question: 'Easy', 'Moderate', or 'Hard'.
      5. The question types must only be from the requested list: ${questionTypes.join(', ')}.
         - For 'MCQ': Provide an 'options' array containing exactly 4 options, and set 'correctAnswer' to the exact correct option text.
         - For 'TrueFalse': Provide an 'options' array containing exactly ["True", "False"], and set 'correctAnswer' to either "True" or "False".
         - For 'Descriptive': Do not provide 'options'. Set 'correctAnswer' to a short 1-2 sentence grading guideline/criteria for teachers.
      6. Return ONLY a valid JSON object matching the TypeScript type ISection[] inside a parent object with key "sections". Do not include markdown code block formatting like \`\`\`json. Just raw JSON.

      Target JSON Format:
      {
        "sections": [
          {
            "title": "Section A: Multiple Choice Questions",
            "instruction": "Attempt all questions. Each carries X marks.",
            "questions": [
              {
                "text": "The question text goes here...",
                "difficulty": "Easy", // Must be one of: "Easy", "Moderate", "Hard"
                "marks": 5,
                "type": "MCQ", // Must match the question type
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"], // Required only for MCQ/TrueFalse
                "correctAnswer": "Option 1" // Required
              }
            ]
          }
        ]
      }
    `;

    console.log(`Sending prompt to Gemini for assignment: "${title}" (Creativity/Temp: ${creativity})...`);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log('Gemini generation completed. Parsing response...');
    
    // Safety clean-up if the model wrapped it in markdown codeblocks anyway
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    const parsedData = JSON.parse(cleanedText) as { sections: ISection[] };
    
    if (!parsedData || !Array.isArray(parsedData.sections)) {
      throw new Error('AI output did not contain a valid sections array.');
    }

    // Schema formatting, validation, and normalization
    let actualQuestionCount = 0;
    let actualMarksSum = 0;

    const validatedSections = parsedData.sections.map((section, sIdx) => {
      const title = section.title || `Section ${String.fromCharCode(65 + sIdx)}`;
      const instruction = section.instruction || 'Attempt all questions.';
      
      const questions = (section.questions || []).map((q) => {
        actualQuestionCount++;
        actualMarksSum += q.marks || 0;
        
        let diff: 'Easy' | 'Moderate' | 'Hard' = 'Moderate';
        if (q.difficulty && ['Easy', 'Moderate', 'Hard'].includes(q.difficulty)) {
          diff = q.difficulty as 'Easy' | 'Moderate' | 'Hard';
        }

        let qType: QuestionType = 'Descriptive';
        if (q.type && ['MCQ', 'TrueFalse', 'Descriptive'].includes(q.type)) {
          qType = q.type as QuestionType;
        }

        return {
          text: q.text || 'Question text could not be generated.',
          difficulty: diff,
          marks: typeof q.marks === 'number' && q.marks > 0 ? q.marks : 2,
          type: qType,
          options: q.options,
          correctAnswer: q.correctAnswer
        };
      });

      return { title, instruction, questions };
    });

    console.log(`Validated generated paper: Questions: ${actualQuestionCount} (target: ${totalQuestions}), Marks: ${actualMarksSum} (target: ${totalMarks})`);
    
    return validatedSections;
  } catch (error) {
    console.error('Error generating questions with Gemini, falling back to mock generator:', error);
    return generateMockQuestions(title, subject, grade, questionTypes, totalQuestions, totalMarks, additionalInstructions);
  }
};
